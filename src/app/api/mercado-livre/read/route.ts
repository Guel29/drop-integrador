import { requireAdmin } from '@/lib/auth';
import { readResource } from '@/lib/mercado-livre/client';
import { apiError } from '@/lib/http';
import { db } from '@/lib/db';
export async function GET() { try { await requireAdmin(); const accounts = await db.mercadoAccount.findMany({ select: { id: true } }); if (!accounts.length) return Response.json({ error: 'Conecte uma conta primeiro' }, { status: 409 }); const account = accounts[0]; const me = await readResource(account.id, '/users/me'); const items = await readResource(account.id, `/users/${account.id}/items/search`); return Response.json({ account: { id: me.id, nickname: me.nickname }, itemIds: items.results ?? [], paging: items.paging }); } catch (error) { return apiError(error); } }
