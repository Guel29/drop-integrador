import { requireAdmin } from '@/lib/auth';
import { apiError } from '@/lib/http';
import { db } from '@/lib/db';
export async function GET() { try { await requireAdmin(); return Response.json(await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })); } catch (error) { return apiError(error); } }
