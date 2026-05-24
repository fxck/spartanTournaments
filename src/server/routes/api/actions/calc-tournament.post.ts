import { defineEventHandler } from 'h3';
import { requireAdmin } from '../../../session';
import { TournamentEngine } from '../../../tournament-engine';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  await TournamentEngine.generateGroupsPhase();
  return { ok: true };
});

