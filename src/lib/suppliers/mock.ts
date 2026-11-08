import { createHash } from 'node:crypto';
import type { SupplierAdapter, SupplierOrder, SupplierProduct } from './types';
import { mockProducts } from './mock-data';
export { mockProducts } from './mock-data';
export class MockSupplierAdapter implements SupplierAdapter {
 async getProducts() { return structuredClone(mockProducts); }
 async getStock(sku: string) { return this.product(sku).stock; }
 async getPrice(sku: string) { return this.product(sku).cost; }
 async createOrder(order: SupplierOrder) { if (!order.idempotencyKey || !order.items.length) throw new Error('Pedido inválido'); for (const item of order.items) if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || await this.getStock(item.sku) < item.quantity) throw new Error('Estoque insuficiente'); return { id: `SIM-${createHash('sha256').update(order.idempotencyKey).digest('hex').slice(0, 16)}`, simulated: true }; }
 async getOrderStatus() { return 'simulated'; }
 async getTracking() { return { code: null, carrier: null }; }
 private product(sku: string) { const product = mockProducts.find(p => p.sku === sku); if (!product) throw new Error('SKU desconhecido'); return product; }
}
