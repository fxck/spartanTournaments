import { defineEventHandler, readBody, createError } from 'h3';
import { db, competitors } from '../../../db';
import { requireAdmin } from '../../../session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody<{ name?: string; names?: string[] }>(event);

  // Existing names, lowercased, for case-insensitive duplicate detection.
  const existing = await db.select({ name: competitors.name }).from(competitors);
  const taken = new Set(existing.map((c) => c.name.trim().toLowerCase()));

  // Bulk import: accept a list of names (e.g. pasted one-per-line from the admin UI).
  if (Array.isArray(body?.names)) {
    const seen = new Set<string>();
    const fresh: string[] = [];
    const skipped: string[] = [];
    for (const raw of body.names) {
      const name = raw?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      // Skip names that already exist or are duplicated within this batch.
      if (taken.has(key) || seen.has(key)) {
        skipped.push(name);
        continue;
      }
      seen.add(key);
      fresh.push(name);
    }
    if (fresh.length === 0 && skipped.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No names provided' });
    }
    const created = fresh.length
      ? await db
          .insert(competitors)
          .values(fresh.map((name) => ({ name })))
          .returning()
      : [];
    return { created, skipped };
  }

  const name = body?.name?.trim();
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name required' });
  if (taken.has(name.toLowerCase())) {
    throw createError({ statusCode: 409, statusMessage: `Teilnehmer "${name}" existiert bereits` });
  }

  const [created] = await db.insert(competitors).values({ name }).returning();
  return created;
});
