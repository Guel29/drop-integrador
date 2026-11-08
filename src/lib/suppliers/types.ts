export type SupplierProduct = { sku: string; title: string; gtin?: string; image: string; cost: number; stock: number; available: boolean };
export type SupplierOrder = { idempotencyKey: string; items: { sku: string; quantity: number }[] };
export interface SupplierAdapter {
  getProducts(): Promise<SupplierProduct[]>;
  getStock(sku: string): Promise<number>;
  getPrice(sku: string): Promise<number>;
  createOrder(order: SupplierOrder): Promise<{ id: string; simulated: boolean }>;
  getOrderStatus(orderId: string): Promise<string>;
  getTracking(orderId: string): Promise<{ code: string | null; carrier: string | null }>;
}
