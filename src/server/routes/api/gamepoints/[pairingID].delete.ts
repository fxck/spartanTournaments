import { defineEventHandler } from 'h3';
import { requireAdmin } from '../../../session';
import { TournamentEngine } from '../../../tournament-engine';
import { parseParams, pairingIdParam } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { pairingID } = parseParams(event, pairingIdParam);

  // Deletes the result and, for finals Pairings, rolls back the bracket atomically.
  return TournamentEngine.deleteResult(pairingID);
});
