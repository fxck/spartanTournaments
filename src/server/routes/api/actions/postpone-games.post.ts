import { defineEventHandler, readBody, createError } from 'h3';
import { requireAdmin } from '../../../session';
import { db } from '../../../db';
import { pairings, gamePoints } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { parsePostponeRequest, selectPairingsToShift, shiftStartTime } from '../../../postpone';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);

  const parsed = parsePostponeRequest(body.minutes, body.fromGameNumber);
  if (!parsed.ok) {
    throw createError({ statusCode: 400, statusMessage: parsed.error });
  }
  const { minutes, fromGameNumber } = parsed.value;

  const shifted = await db.transaction(async (tx) => {
    // Played = has a result recorded. Those games keep their time.
    const played = await tx.select({ pairingID: gamePoints.pairingID }).from(gamePoints);
    const playedIds = played.map((gp) => gp.pairingID);

    const allPairings = await tx.select().from(pairings);
    const toShift = selectPairingsToShift(allPairings, playedIds, fromGameNumber);

    for (const p of toShift) {
      await tx
        .update(pairings)
        .set({ startTime: shiftStartTime(p.startTime, minutes) })
        .where(eq(pairings.id, p.id));
    }

    return toShift.length;
  });

  return { ok: true, shifted };
});
