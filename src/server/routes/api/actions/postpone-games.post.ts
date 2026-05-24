import { defineEventHandler, readBody, createError } from 'h3';
import { requireAdmin } from '../../../session';
import { db } from '../../../db';
import { pairings, gamePoints } from '../../../db/schema';
import { eq, notInArray } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);
  const minutes = parseInt(body.minutes, 10);

  if (isNaN(minutes)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid minutes value' });
  }

  await db.transaction(async (tx) => {
    // 1. Get all pairing IDs that already have scores entered
    const played = await tx.select({ pairingID: gamePoints.pairingID }).from(gamePoints);
    const playedIds = played.map(gp => gp.pairingID);

    // 2. Select pairings that have NOT started yet
    let unstartedPairings;
    if (playedIds.length > 0) {
      unstartedPairings = await tx
        .select()
        .from(pairings)
        .where(notInArray(pairings.id, playedIds));
    } else {
      unstartedPairings = await tx.select().from(pairings);
    }

    // 3. Shift the start time for each unstarted pairing
    for (const p of unstartedPairings) {
      const newStartTime = new Date(p.startTime.getTime() + minutes * 60000);
      await tx
        .update(pairings)
        .set({ startTime: newStartTime })
        .where(eq(pairings.id, p.id));
    }
  });

  return { ok: true };
});
