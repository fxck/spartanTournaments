import { defineEventHandler, createError } from 'h3';
import { and, eq, ne } from 'drizzle-orm';
import { db, competitors } from '../../../db';
import { requireAdmin } from '../../../session';
import { parseParams, parseBody, idParam, competitorUpdateBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = parseParams(event, idParam);
  const { name, drawNumber } = await parseBody(event, competitorUpdateBody);

  // A draw number identifies a competitor in the bracket, so it must stay unique.
  if (drawNumber != null) {
    const [clash] = await db
      .select({ id: competitors.id })
      .from(competitors)
      .where(and(eq(competitors.drawNumber, drawNumber), ne(competitors.id, id)));
    if (clash) {
      throw createError({ statusCode: 409, statusMessage: `Losnummer ${drawNumber} ist bereits vergeben` });
    }
  }

  const [updated] = await db.update(competitors).set({ name, drawNumber }).where(eq(competitors.id, id)).returning();
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Competitor not found' });

  return updated;
});
