import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/lib/crypto';
test('administrator can login, read protected audit and logout; forged session is rejected', async () => {
 const password = randomBytes(32).toString('base64url'); const origin = 'http://localhost:3001';
 const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3001'], { env: { ...process.env, ADMIN_EMAIL: 'admin-test@example.test', ADMIN_PASSWORD_HASH: hashPassword(password), SESSION_SECRET: randomBytes(48).toString('base64url'), APP_URL: origin }, stdio: 'ignore' });
 try {
  let ready = false; for (let i = 0; i < 100; i++) { try { const response = await fetch(`${origin}/api/health`); if (response.ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve,100)); } assert.equal(ready,true,'isolated production test server ready');
  const login = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin-test@example.test', password }) }); assert.equal(login.status,200); const cookie = login.headers.get('set-cookie'); assert.ok(cookie?.includes('HttpOnly')); assert.ok(cookie?.includes('SameSite=lax')); const session = cookie!.split(';')[0];
  assert.equal((await fetch(`${origin}/api/audit`, { headers: { Cookie: session } })).status,200);
  assert.equal((await fetch(`${origin}/api/audit`, { headers: { Cookie: 'sd_session=forged' } })).status,401);
  const logout = await fetch(`${origin}/api/auth/logout`, { method: 'POST', headers: { Origin: origin, Cookie: session } }); assert.equal(logout.status,200); const cleared = logout.headers.get('set-cookie')!; assert.ok(cleared.startsWith('sd_session=;')); const expiry = cleared.match(/expires=([^;]+)/i)?.[1]; assert.ok(expiry && Date.parse(expiry) < Date.now()); assert.equal((await fetch(`${origin}/api/audit`, { headers: { Cookie: cleared.split(';')[0] } })).status,401);
 } finally { server.kill('SIGTERM'); await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()); }); }
});
