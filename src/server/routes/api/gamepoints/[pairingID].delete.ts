import { defineEventHandler, getRouterParam, createError } from 'h3';
import { requireAdmin } from '../../../session';
import { TournamentEngine } from '../../../tournament-engine';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const pairingID = Number(getRouterParam(event, 'pairingID'));
  if (!pairingID) throw createError({ statusCode: 400, statusMessage: 'Invalid pairingID' });

  // Deletes the result and, for finals Pairings, rolls back the bracket atomically.
  return TournamentEngine.deleteResult(pairingID);
});
