import { db } from '../db';
import { z } from 'zod';
const remoteOrder = z.object({ id: z.number().int(), seller: z.object({ id: z.number().int() }), status: z.string(), total_amount: z.number().nonnegative(), date_created: z.string(), shipping: z.object({ id: z.number().int().nullable().optional() }).nullish(), payments: z.array(z.object({ status: z.string() })), order_items: z.array(z.object({ item: z.object({ id: z.string() }), quantity: z.number().int().positive() })) });
export async function importOrder(raw: unknown, accountId: string) { const order = remoteOrder.parse(raw); if (String(order.seller.id) !== accountId) throw new Error('OWNER_MISMATCH'); const externalId = String(order.id); const paymentConfirmed = order.status === 'paid' && order.payments.length > 0 && order.payments.every(p => p.status === 'approved');
 return db.$transaction(async tx => { const lines = []; for (const line of order.order_items) { const listing = await tx.listing.findUnique({ where: { externalId: line.item.id }, include: { product: true } }); if (listing) lines.push({ productId: listing.productId, quantity: line.quantity, unitCost: listing.product.cost }); }
 const existing = await tx.order.findUnique({ where: { externalId } });
 const result = await tx.order.upsert({ where: { externalId }, create: { externalId, total: Math.round(order.total_amount * 100), paymentConfirmed, status: lines.length !== order.order_items.length ? 'unmapped' : paymentConfirmed ? 'awaiting_approval' : 'pending', shipmentId: order.shipping?.id ? String(order.shipping.id) : null, createdAt: new Date(order.date_created), lines: { create: lines }, events: { create: { status: 'imported' } } }, update: { paymentConfirmed, ...(order.status === 'cancelled' ? { status: 'cancelled' } : {}) } });
 if (!existing) await tx.auditLog.create({ data: { actor: 'mercado-livre', action: 'order.imported', entityId: result.id, outcome: 'success' } });
 return result;
 }); }
