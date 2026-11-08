import { requireAdmin } from '@/lib/auth';
import { apiError } from '@/lib/http';
import { db } from '@/lib/db';
import { readSales } from '@/lib/mercado-livre/client';
import { importOrder } from '@/lib/mercado-livre/import-order';
export async function GET() { try { await requireAdmin(); return Response.json(await db.order.findMany({ take: 50, orderBy: { createdAt: 'desc' }, include: { lines: { include: { product: true } }, events: true } })); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { await requireAdmin(request); const account = await db.mercadoAccount.findFirstOrThrow(); const sales = await readSales(account.id); if (!Array.isArray(sales.results)) throw new Error('INVALID_SALES'); let imported = 0; for (const sale of sales.results) { await importOrder(sale, account.id); imported++; } return Response.json({ imported, total: sales.paging?.total, note: 'Últimas 50 vendas; notificações mantêm novas vendas atualizadas.' }); } catch (error) { return apiError(error); } }
