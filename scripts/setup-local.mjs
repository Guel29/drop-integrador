import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
if (!existsSync('.env')) {
 const sample = readFileSync('.env.example', 'utf8');
 writeFileSync('.env', sample.replace('TOKEN_ENCRYPTION_KEY=', `TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`).replace('SESSION_SECRET=', `SESSION_SECRET=${randomBytes(48).toString('base64url')}`), { mode: 0o600 });
 console.log('.env local criado com chaves aleatórias; nenhum arquivo existente foi alterado.');
}
// Never invent a known administrator password or print credentials.
if (process.env.ADMIN_PASSWORD) {
 if (process.env.ADMIN_PASSWORD.length < 6) throw new Error('ADMIN_PASSWORD precisa de 6 caracteres');
 const current = readFileSync('.env', 'utf8');
 if (/^ADMIN_PASSWORD_HASH=$/m.test(current)) { const salt = randomBytes(16).toString('hex'); const hash = scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex'); writeFileSync('.env', current.replace(/^ADMIN_PASSWORD_HASH=$/m, `ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`), { mode: 0o600 }); console.log('Hash de senha configurado no arquivo local.'); }
}
