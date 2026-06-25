import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Standalone migration runner. esbuild bundles this (with drizzle-orm + postgres
// inlined) into dist/migrate.mjs, so prod can apply migrations without shipping
// the root node_modules. Equivalent to `drizzle-kit migrate`: it applies the SQL
// files in ./drizzle. The runtime app's custom postgres type parsers are not
// needed here — migrations are raw DDL.
const url = process.env['DATABASE_URL'];
if (!url) {
  throw new Error('DATABASE_URL must be set.');
}

const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
} finally {
  await client.end();
}
