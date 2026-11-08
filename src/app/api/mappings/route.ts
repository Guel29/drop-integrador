import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db, simulation } from '@/lib/db';
import { apiError } from '@/lib/http';
import { readResource } from '@/lib/mercado-livre/client';
const input = z.object({ productId: z.string().min(1), externalId: z.string().regex(/^MLB\d+$/), price: z.number().int().positive() });
export async function GET() { try { await requireAdmin(); return Response.json(await db.listing.findMany({ include: { product: true } })); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const actor = await requireAdmin(request); const parsed = input.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: 'Produto, ID MLB e preço em centavos válidos são obrigatórios.' }, { status: 400 }); const data = parsed.data; if (!simulation()) { const account = await db.mercadoAccount.findFirstOrThrow(); const item = await readResource(account.id, `/items/${data.externalId}`); if (String(item.seller_id) !== account.id) return Response.json({ error: 'Anúncio não pertence à conta conectada' }, { status: 403 }); }
 const listing = await db.$transaction(async tx => { const result = await tx.listing.upsert({ where: { externalId: data.externalId }, create: { ...data, status: simulation() ? 'simulated' : 'associated' }, update: { productId: data.productId, price: data.price } }); await tx.auditLog.create({ data: { actor, action: 'sku.associated', entityId: result.id, outcome: 'success' } }); return result; }); return Response.json(listing); } catch (error) { return apiError(error); } }
