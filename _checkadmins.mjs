import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('.env', import.meta.url), 'utf8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
const client = new pg.Client({ connectionString: match[1] });
await client.connect();
const r = await client.query('SELECT id, nome, email FROM admins');
console.table(r.rows);
await client.end();
