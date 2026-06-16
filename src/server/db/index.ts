import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env['DATABASE_URL'];
if (!url) {
  throw new Error('DATABASE_URL must be set.');
}
const client = postgres(url, {
  types: {
    // PostgreSQL `timestamp without time zone` (OID 1114).
    //
    // Drizzle writes these columns via `Date.toISOString()` (i.e. the UTC
    // representation of the instant), but postgres.js's default parser reads
    // them back with `new Date(str)` — which interprets the stored wall-clock
    // as the *server's local* time. That write/read mismatch silently shifted
    // every timestamp by the server's UTC offset on each round-trip (e.g. a
    // 10:00 start time came back as 08:00).
    //
    // Parsing the stored wall-clock as UTC keeps it symmetric with the write,
    // so the exact instant is preserved. The client sends true instants
    // (`new Date(localInput).toISOString()`), the date pipe renders them in the
    // viewer's local timezone, and "current games" comparisons against the real
    // `now` stay correct on any server timezone. (Also applies to
    // created_at/updated_at, which are not user-facing.)
    timestampNoTz: {
      to: 1114,
      from: [1114],
      serialize: (value: Date) => value.toISOString(),
      parse: (value: string) => new Date(value.replace(' ', 'T') + 'Z'),
    },
  },
});
export const db = drizzle(client, { schema });

/** The Drizzle database handle. */
export type Database = typeof db;
/** A Drizzle transaction handle, as passed to `db.transaction(tx => ...)`. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Accept either the root db or an open transaction for read/query helpers. */
export type DbOrTx = Database | Transaction;

export * from './schema';
