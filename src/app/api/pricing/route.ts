import { requireAdmin } from '@/lib/auth';
import { calculatePrice } from '@/lib/pricing';
import { apiError } from '@/lib/http';
export async function POST(request: Request) { try { await requireAdmin(request); return Response.json(calculatePrice(await request.json())); } catch (error) { return apiError(error); } }
