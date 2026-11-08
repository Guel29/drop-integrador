import { sameOrigin } from '@/lib/origin';
import { cookies } from 'next/headers';
export async function POST(request: Request) { if (!sameOrigin(request)) return new Response(null, { status: 403 }); (await cookies()).delete('sd_session'); return Response.json({ ok: true }); }
