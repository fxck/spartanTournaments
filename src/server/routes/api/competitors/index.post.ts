import { defineEventHandler, createError } from 'h3';
import { requireAdmin } from '../../../session';
import { CompetitorRegistry } from '../../../competitor-registry';
import { parseBody, competitorCreateBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await parseBody(event, competitorCreateBody);

  // Bulk import: a list of names (e.g. pasted one-per-line from the admin UI).
  if (Array.isArray(body.names)) {
    const { created, skipped } = await CompetitorRegistry.importNames(body.names);
    if (created.length === 0 && skipped.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No names provided' });
    }
    return { created, skipped };
  }

  // Single name: same dedup, mapped to single-result HTTP semantics.
  const { created, skipped } = await CompetitorRegistry.importNames([body.name ?? '']);
  if (created.length) return created[0];
  if (skipped.length) {
    throw createError({ statusCode: 409, statusMessage: `Teilnehmer "${skipped[0]}" existiert bereits` });
  }
  throw createError({ statusCode: 400, statusMessage: 'Name required' });
});
