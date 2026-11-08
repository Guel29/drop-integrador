import { canRead } from '@/lib/auth';
import { db, simulation } from '@/lib/db';
import { MockSupplierAdapter } from '@/lib/suppliers/mock';
export async function GET() { if (!await canRead()) return new Response(null, { status: 401 }); try { return Response.json(simulation() ? await new MockSupplierAdapter().getProducts() : await db.product.findMany()); } catch { return Response.json({ error: 'Catálogo indisponível' }, { status: 503 }); } }
