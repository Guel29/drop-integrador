import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/mercado-livre/client';
import { apiError } from '@/lib/http';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/crypto';
export async function POST(request: Request) { try { await requireAdmin(request); const { clientId, redirectUri } = config(); const state = randomBytes(32).toString('base64url'); const verifier = randomBytes(48).toString('base64url'); (await cookies()).set('sd_oauth', encrypt({ state, verifier, expires: Date.now() + 600000 }), { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.APP_URL ?? request.url).protocol === 'https:', maxAge: 600, path: '/api/mercado-livre/callback' }); const url = new URL('https://auth.mercadolivre.com.br/authorization'); url.search = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString(); return Response.json({ url: url.toString() }); } catch (error) { return apiError(error); } }
