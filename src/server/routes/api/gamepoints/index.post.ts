import { defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { requireReferee } from '../../../session';
import { MatchRegistry } from '../../../match-registry';
import { TournamentEngine } from '../../../tournament-engine';
import { db } from '../../../db';
import { pairings } from '../../../db/schema';
import { isFinals } from 'calc-tournament';

export default defineEventHandler(async (event) => {
  await requireReferee(event);
  const { competitor1Points, competitor2Points, pairingID } = await readBody<{
    competitor1Points: number;
    competitor2Points: number;
    pairingID: number;
  }>(event);

  const result = await MatchRegistry.recordGamePoint(undefined, pairingID, competitor1Points, competitor2Points);

  // When a finals result is entered, advance the bracket. advanceFinalsRound is
  // idempotent (it updates existing next-round pairings instead of duplicating),
  // so re-running it on every finals result is safe.
  const [pairing] = await db.select().from(pairings).where(eq(pairings.id, pairingID));
  if (pairing && isFinals(pairing)) {
    await TournamentEngine.advanceFinalsRound();
  }

  return result;
});
