import { defineEventHandler } from 'h3';
import { eq } from 'drizzle-orm';
import { db, competitors } from '../../../db';
import { requireAdmin } from '../../../session';
import { parseParams, idParam } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = parseParams(event, idParam);

  await db.delete(competitors).where(eq(competitors.id, id));
  return { ok: true };
});
