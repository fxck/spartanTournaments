import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env['DATABASE_URL'] ?? '';
console.log(`[DB] Initializing connection. URL present: ${!!url} (Length: ${url.length})`);
const client = postgres(url);
export const db = drizzle(client, { schema });

export * from './schema';
