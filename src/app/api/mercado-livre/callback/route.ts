import { appOrigin } from '@/lib/origin';
import { requireAdmin, audit } from '@/lib/auth';
import { exchangeCode } from '@/lib/mercado-livre/client';
import { decrypt } from '@/lib/crypto';
import { cookies } from 'next/headers';
export async function GET(request: Request) { const url = new URL(request.url); const jar = await cookies(); const stored = jar.get('sd_oauth')?.value; jar.delete({ name: 'sd_oauth', path: '/api/mercado-livre/callback' }); try { const actor = await requireAdmin(); if (!stored) throw new Error('Missing state'); const state = decrypt<{ state: string; verifier: string; expires: number }>(stored); if (state.expires < Date.now() || state.state !== url.searchParams.get('state') || !url.searchParams.get('code')) throw new Error('Invalid state'); const id = await exchangeCode(url.searchParams.get('code')!, state.verifier); await audit(actor, 'oauth.connected', id, 'success'); return Response.redirect(new URL('/?module=integracoes&connected=1', appOrigin(request))); } catch { return Response.json({ error: 'Não foi possível concluir OAuth. Inicie uma nova autorização.' }, { status: 400 }); } }
