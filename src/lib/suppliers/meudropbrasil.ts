import type { SupplierAdapter, SupplierOrder } from './types';
/** Inject only an implementation explicitly authorized and documented by the supplier.
 * This seam supports an official API, authorized CSV import, or another agreed method.
 * No endpoint, credential format, purchasing capability or logistics is assumed. */
export class MeuDropBrasilAdapter implements SupplierAdapter {
 constructor(private readonly authorizedImplementation?: SupplierAdapter) {}
 private adapter() { if (!this.authorizedImplementation) throw new Error('Integração MeuDropBrasil não documentada e não validada'); return this.authorizedImplementation; }
 getProducts() { return this.adapter().getProducts(); }
 getStock(sku: string) { return this.adapter().getStock(sku); }
 getPrice(sku: string) { return this.adapter().getPrice(sku); }
 createOrder(order: SupplierOrder) { return this.adapter().createOrder(order); }
 getOrderStatus(id: string) { return this.adapter().getOrderStatus(id); }
 getTracking(id: string) { return this.adapter().getTracking(id); }
}
