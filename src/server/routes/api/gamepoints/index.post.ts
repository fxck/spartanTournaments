import { defineEventHandler } from 'h3';
import { requireReferee } from '../../../session';
import { TournamentEngine } from '../../../tournament-engine';
import { parseBody, gamePointBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireReferee(event);
  const { competitor1Points, competitor2Points, pairingID } = await parseBody(event, gamePointBody);

  // Records the result and, for finals Pairings, advances the bracket atomically.
  return TournamentEngine.recordResult(pairingID, competitor1Points, competitor2Points);
});
