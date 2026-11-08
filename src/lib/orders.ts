import { db, simulation } from './db';
import { MockSupplierAdapter } from './suppliers/mock';
export function assertOrderReady(order: { paymentConfirmed: boolean; manualApprovedAt: Date | null; logisticsValidated: boolean; fiscalValidated: boolean }) { if (!order.paymentConfirmed) throw new Error('Pagamento não confirmado'); if (!order.manualApprovedAt) throw new Error('Aprovação manual necessária'); if (!order.logisticsValidated || !order.fiscalValidated) throw new Error('Logística e documentação fiscal precisam ser validadas'); }
export async function simulateDispatch(id: string, actor: string) {
 if (!simulation()) throw new Error('Compras reais estão bloqueadas até validação da integração');
 return db.$transaction(async tx => {
  // Row lock serializes concurrent dispatches and preserves a stable idempotency key.
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
  const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { lines: { include: { product: true } } } });
  if (order.supplierOrderId) return { id: order.supplierOrderId, simulated: true, duplicate: true };
  if (['unmapped', 'cancelled'].includes(order.status)) throw new Error('Pedido não elegível: confira o mapeamento e o status');
  assertOrderReady(order);
  if (!order.lines.length) throw new Error('Pedido sem itens');
  const supplier = new MockSupplierAdapter();
  const result = await supplier.createOrder({ idempotencyKey: order.externalId, items: order.lines.map(l => ({ sku: l.product.supplierSku, quantity: l.quantity })) });
  await tx.order.update({ where: { id }, data: { supplierOrderId: result.id, dispatchKey: order.externalId, status: 'simulated', events: { create: { status: 'simulated' } } } });
  await tx.auditLog.create({ data: { actor, action: 'order.simulate', entityId: id, outcome: 'success' } });
  return result;
 });
}
