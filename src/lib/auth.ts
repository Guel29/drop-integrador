import { sameOrigin } from './origin';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db, simulation } from './db';
function key() { const secret = process.env.SESSION_SECRET; if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must have at least 32 characters'); return new TextEncoder().encode(secret); }
export async function signSession(subject: string) { return new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject(subject).setIssuedAt().setExpirationTime('8h').sign(key()); }
export async function currentAdmin() { try { const token = (await cookies()).get('sd_session')?.value; if (!token) return null; const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] }); return payload.role === 'admin' && payload.sub === process.env.ADMIN_EMAIL ? payload.sub : null; } catch { return null; } }
export async function requireAdmin(request?: Request) { const admin = await currentAdmin(); if (!admin) throw new Error('UNAUTHORIZED'); if (request && request.method !== 'GET' && !sameOrigin(request)) throw new Error('INVALID_ORIGIN'); return admin; }
export async function canRead() { return simulation() || !!(await currentAdmin()); }
export async function audit(actor: string, action: string, entityId: string | undefined, outcome: string) { await db.auditLog.create({ data: { actor, action, entityId, outcome } }); }
