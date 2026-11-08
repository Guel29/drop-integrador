import { requireAdmin } from '@/lib/auth';
import { simulateDispatch } from '@/lib/orders';
import { apiError } from '@/lib/http';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireAdmin(request); const { id } = await context.params; return Response.json(await simulateDispatch(id, actor)); } catch (error) { return apiError(error); } }
