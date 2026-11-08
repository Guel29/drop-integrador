import { db } from '@/lib/db';
import { redis } from '@/lib/queue';
export const dynamic = 'force-dynamic';
export async function GET() { try { await db.$queryRaw`SELECT 1`; await redis().ping(); return Response.json({ status: 'ok' }); } catch { return Response.json({ status: 'unavailable' }, { status: 503 }); } }
