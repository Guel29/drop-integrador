import { requireAdmin, audit } from '@/lib/auth';
import { apiError } from '@/lib/http';
import { db } from '@/lib/db';
import { webhookQueue } from '@/lib/queue';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireAdmin(request); const { id } = await context.params; const event = await db.webhookEvent.findUniqueOrThrow({ where: { id } }); if (event.status !== 'failed') return Response.json({ error: 'Apenas eventos com falha podem ser reprocessados' }, { status: 409 }); const job = await webhookQueue().getJob(id); if (job && await job.getState() === 'failed') await job.retry(); else if (!job) await webhookQueue().add('read-resource', { eventId: id }, { jobId: id }); else return Response.json({ error: 'Evento ainda em processamento' }, { status: 409 }); await audit(actor, 'webhook.retry', id, 'queued'); return Response.json({ ok: true }); } catch (error) { return apiError(error); } }
