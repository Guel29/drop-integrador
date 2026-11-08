import { importOrder } from '../lib/mercado-livre/import-order';
import { Worker } from 'bullmq';
import { db } from '../lib/db';
import { redis, webhookQueue } from '../lib/queue';
import { readResource, validateResource } from '../lib/mercado-livre/client';
const worker = new Worker('mercado-notifications', async job => {
 const event = await db.webhookEvent.findUniqueOrThrow({ where: { id: job.data.eventId } });
 if (event.status === 'completed') return;
 if (!validateResource(event.topic, event.resource)) throw new Error('INVALID_RESOURCE');
 await db.webhookEvent.update({ where: { id: event.id }, data: { status: 'processing', attempts: { increment: 1 } } });
 try {
  const resource = await readResource(event.userId, event.resource);
  const owner = event.topic === 'items' ? resource.seller_id : event.topic === 'orders_v2' ? resource.seller?.id : resource.sender_id;
  if (String(owner) !== event.userId) throw new Error('OWNER_MISMATCH');
  // Re-read authoritative order. Import only; never dispatch or buy automatically.
  if (event.topic === 'orders_v2') await importOrder(resource, event.userId);
  await db.$transaction([
   db.webhookEvent.update({ where: { id: event.id }, data: { status: 'completed', lastError: null } }),
   db.auditLog.create({ data: { actor: 'worker', action: `meli.read.${event.topic}`, entityId: event.id, outcome: 'success' } }),
  ]);
 } catch { await db.webhookEvent.update({ where: { id: event.id }, data: { status: 'failed', lastError: 'REMOTE_READ_FAILED' } }); throw new Error('REMOTE_READ_FAILED'); }
}, { connection: redis(), concurrency: 3, limiter: { max: 30, duration: 60000 } });
// Durable inbox recovery: enqueue events persisted before a queue/network failure.
async function recover() { const events = await db.webhookEvent.findMany({ where: { status: 'pending' }, take: 100 }); for (const event of events) await webhookQueue().add('read-resource', { eventId: event.id }, { jobId: event.id }); }
await recover(); const interval = setInterval(() => { recover().catch(() => console.error('INBOX_RECOVERY_FAILED')); }, 30000);
worker.on('failed', () => console.error('WEBHOOK_JOB_FAILED'));
async function shutdown() { clearInterval(interval); await worker.close(); await webhookQueue().close(); await redis().quit(); await db.$disconnect(); process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
console.log('Worker de leitura iniciado. Nenhuma compra ou publicação automática.');
