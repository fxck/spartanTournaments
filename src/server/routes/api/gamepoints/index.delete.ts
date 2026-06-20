import { defineEventHandler } from 'h3';
import { requireAdmin } from '../../../session';
import { TournamentEngine } from '../../../tournament-engine';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  // Clears all results and rolls back any propagated finals winners atomically.
  return TournamentEngine.deleteAllResults();
});
