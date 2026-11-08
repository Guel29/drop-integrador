import { sameOrigin } from '@/lib/origin';
import { verifyPassword } from '@/lib/crypto';
import { signSession } from '@/lib/auth';
import { redis } from '@/lib/queue';
import { cookies } from 'next/headers';
export async function POST(request: Request) { try {
 if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida' }, { status: 403 });
 const { email, password } = await request.json();
 if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256) return Response.json({ error: 'Dados inválidos' }, { status: 400 });
 // Global limit cannot be bypassed with forged forwarded headers or arbitrary emails.
 const bucket = `login:${Math.floor(Date.now() / 60000)}`; const attempts = await redis().incr(bucket); if (attempts === 1) await redis().expire(bucket, 90);
 if (attempts > 10) return Response.json({ error: 'Aguarde um minuto para tentar novamente.' }, { status: 429 });
 const hash = process.env.ADMIN_PASSWORD_HASH; if (!hash || email !== process.env.ADMIN_EMAIL || !verifyPassword(password, hash)) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 });
 (await cookies()).set('sd_session', await signSession(email), { httpOnly: true, sameSite: 'lax', secure: new URL(process.env.APP_URL ?? request.url).protocol === 'https:', maxAge: 28800, path: '/' });
 return Response.json({ ok: true });
 } catch { return Response.json({ error: 'Autenticação indisponível; verifique Redis e as configurações.' }, { status: 503 }); } }
