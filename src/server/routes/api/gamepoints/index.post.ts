import { defineEventHandler, readBody } from 'h3';
import { requireReferee } from '../../../session';
import { TournamentEngine } from '../../../tournament-engine';

export default defineEventHandler(async (event) => {
  await requireReferee(event);
  const { competitor1Points, competitor2Points, pairingID } = await readBody<{
    competitor1Points: number;
    competitor2Points: number;
    pairingID: number;
  }>(event);

  // Records the result and, for finals Pairings, advances the bracket atomically.
  return TournamentEngine.recordResult(pairingID, competitor1Points, competitor2Points);
});
