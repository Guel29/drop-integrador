import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { calculatePrice } from '../src/lib/pricing';
import { encrypt, decrypt, hashPassword, verifyPassword } from '../src/lib/crypto';
import { MockSupplierAdapter } from '../src/lib/suppliers/mock';
import { MeuDropBrasilAdapter } from '../src/lib/suppliers/meudropbrasil';
import { assertOrderReady } from '../src/lib/orders';
import { validateResource } from '../src/lib/mercado-livre/client';
test('pricing accounts for fees on selling price and rounds up to preserve target margin', () => { const result = calculatePrice({ cost: 10000, shipping: 1500, fixedFee: 600, feeBps: 1600, taxBps: 600, marginBps: 2000 }); assert.equal(result.price, 20863); assert.ok(result.profit / result.price >= .1999); assert.throws(() => calculatePrice({ cost: 100, shipping: 0, fixedFee: 0, feeBps: 7000, taxBps: 2000, marginBps: 1000 })); assert.throws(() => calculatePrice({ cost: -1, shipping: 0, fixedFee: 0, feeBps: 0, taxBps: 0, marginBps: 0 })); });
test('AES-GCM encrypts tokens and rejects modified ciphertext', () => { process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64'); const secret = { access_token: 'sensitive-access', refresh_token: 'sensitive-refresh' }; const encoded = encrypt(secret); assert.ok(!encoded.includes(secret.access_token)); assert.deepEqual(decrypt(encoded), secret); const parts = encoded.split('.'); const data = Buffer.from(parts[2], 'base64url'); data[0] ^= 1; parts[2] = data.toString('base64url'); assert.throws(() => decrypt(parts.join('.'))); });
test('password verification rejects incorrect password', () => { const hash = hashPassword('a long admin password'); assert.equal(verifyPassword('a long admin password', hash), true); assert.equal(verifyPassword('incorrect', hash), false); assert.equal(verifyPassword('password', ''), false); });
test('supplier simulation is idempotent and checks availability and positive quantities', async () => { const supplier = new MockSupplierAdapter(); const order = { idempotencyKey: 'sale-123', items: [{ sku: 'MDB-001', quantity: 1 }] }; const [a,b] = await Promise.all([supplier.createOrder(order), supplier.createOrder(order)]); assert.deepEqual(a,b); assert.equal(a.simulated, true); await assert.rejects(supplier.createOrder({ ...order, items: [{ sku: 'MDB-004', quantity: 1 }] })); await assert.rejects(supplier.createOrder({ ...order, items: [{ sku: 'MDB-001', quantity: 0 }] })); });
test('undocumented supplier fails closed', () => { assert.throws(() => new MeuDropBrasilAdapter().getProducts(), /não documentada/); });
test('fulfillment requires payment, approval, logistics and fiscal validation', () => { const valid = { paymentConfirmed: true, manualApprovedAt: new Date(), logisticsValidated: true, fiscalValidated: true }; assert.doesNotThrow(() => assertOrderReady(valid)); assert.throws(() => assertOrderReady({ ...valid, paymentConfirmed: false }), /Pagamento/); assert.throws(() => assertOrderReady({ ...valid, manualApprovedAt: null }), /Aprovação/); assert.throws(() => assertOrderReady({ ...valid, logisticsValidated: false }), /Logística/); assert.throws(() => assertOrderReady({ ...valid, fiscalValidated: false }), /fiscal/); });
test('webhook resource allowlist rejects SSRF, query injection and topic mismatch', () => { assert.equal(validateResource('orders_v2', '/orders/12345'), true); for (const path of ['https://evil.test/orders/1', '/orders/123?x=1', '/orders/../users/me', '//evil.test', '/items/MLB123']) assert.equal(validateResource('orders_v2', path), false); assert.equal(validateResource('items', '/items/MLB123'), true); });

test('canonical origin allows HTTPS proxy traffic and rejects forged forwarded hosts', async () => {
 const { sameOrigin, appOrigin } = await import('../src/lib/origin');
 const publicUrl = 'https://drop.instara.com.br';
 const request = new Request('http://127.0.0.1:3000/api/auth/login', { method: 'POST', headers: { Origin: publicUrl } });
 assert.equal(sameOrigin(request, publicUrl), true);
 assert.equal(appOrigin(request, publicUrl), publicUrl);
 const attack = new Request(request.url, { method: 'POST', headers: { Origin: 'https://attacker.example', 'X-Forwarded-Host': 'attacker.example' } });
 assert.equal(sameOrigin(attack, publicUrl), false);
 assert.equal(sameOrigin(new Request(request.url, { method: 'POST' }), publicUrl), false);
});
