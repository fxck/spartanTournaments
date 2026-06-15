import { defineEventHandler, getRouterParam, readBody, createError } from 'h3';
import { and, eq, ne } from 'drizzle-orm';
import { db, competitors } from '../../../db';
import { requireAdmin } from '../../../session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = Number(getRouterParam(event, 'id'));
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' });

  const body = await readBody<{ name?: string; drawNumber?: number | null }>(event);

  const name = body.name?.trim();
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name required' });

  // drawNumber is optional: null/undefined clears it, otherwise it must be a positive integer.
  let drawNumber: number | null = null;
  if (body.drawNumber != null && `${body.drawNumber}`.trim() !== '') {
    drawNumber = Number(body.drawNumber);
    if (!Number.isInteger(drawNumber) || drawNumber < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid draw number' });
    }

    // A draw number identifies a competitor in the bracket, so it must stay unique.
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
