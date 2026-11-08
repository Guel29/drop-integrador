import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { validateResource } from '@/lib/mercado-livre/client';
import { webhookQueue } from '@/lib/queue';
export async function POST(request: Request) { try {
 const text = await request.text(); if (text.length > 16384) return new Response(null, { status: 413 }); const body = JSON.parse(text);
 if (typeof body.topic !== 'string' || typeof body.resource !== 'string' || !validateResource(body.topic, body.resource) || !Number.isSafeInteger(body.user_id) || typeof body.sent !== 'string' || !Number.isFinite(Date.parse(body.sent))) return new Response(null, { status: 400 });
 const accountId = String(body.user_id); const configured = (process.env.MELI_USER_IDS ?? '').split(',').map(v => v.trim()); if (!configured.includes(accountId) || !await db.mercadoAccount.findUnique({ where: { id: accountId }, select: { id: true } })) return new Response(null, { status: 403 });
 // Notifications are untrusted hints, never payment or fulfillment authority.
 // The worker re-reads the fixed official API and verifies resource ownership.
 const id = createHash('sha256').update(JSON.stringify([accountId, body.topic, body.resource, body.sent])).digest('hex');
 await db.webhookEvent.upsert({ where: { id }, create: { id, topic: body.topic, resource: body.resource, userId: accountId }, update: {} });
 await webhookQueue().add('read-resource', { eventId: id }, { jobId: id });
 return Response.json({ received: true }, { status: 200 });
 } catch { return Response.json({ error: 'Notificação não persistida ou não enfileirada' }, { status: 503 }); } }
