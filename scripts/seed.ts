import { db } from '../src/lib/db';
import { mockProducts } from '../src/lib/suppliers/mock';
if (process.env.APP_MODE === 'live') throw new Error('Seed disponível apenas em simulação');
for (const product of mockProducts) { const { available, ...p } = product; await db.product.upsert({ where: { sku: p.sku }, create: { ...p, supplierSku: p.sku, active: available }, update: {} }); }
await db.pricingRule.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
await db.$disconnect();
console.log('Catálogo simulado preparado; registros existentes preservados.');
