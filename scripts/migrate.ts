import 'dotenv/config';
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
// Apply Prisma-generated, reviewed SQL with immutable checksums and a transaction.
// The JS schema engine's deploy currently cannot decode PostgreSQL's `name` type.
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
 await client.query('BEGIN');
 await client.query("SELECT pg_advisory_xact_lock(hashtext('smartdrop-migrations'))");
 await client.query('CREATE TABLE IF NOT EXISTS smartdrop_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 const migrations = (await readdir('prisma/migrations', { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
 for (const name of migrations) { const sql = await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'); if (!sql.trim()) throw new Error('Empty migration'); const checksum = createHash('sha256').update(sql).digest('hex'); const existing = await client.query('SELECT checksum FROM smartdrop_migrations WHERE name=$1', [name]); if (existing.rowCount) { if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`); continue; } await client.query(sql); await client.query('INSERT INTO smartdrop_migrations (name, checksum) VALUES ($1,$2)', [name,checksum]); console.log(`Applied ${name}`); }
 await client.query('COMMIT');
} catch (error) { await client.query('ROLLBACK'); throw error; } finally { await client.end(); }
