import { defineEventHandler } from 'h3';
import bcrypt from 'bcryptjs';
import { db, tournamentDetails } from '../../../db';
import { requireAdmin } from '../../../session';
import { parseBody, tournamentUpdateBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const [existing] = await db.query.tournamentDetails.findMany({ limit: 1 });
  if (!existing) return null;

  const body = await parseBody(event, tournamentUpdateBody);
  const adminPasswordHash = body.newAdminPassword
    ? await bcrypt.hash(body.newAdminPassword, 12)
    : existing.adminPasswordHash;
  const refereePasswordHash = body.newRefereePassword
    ? await bcrypt.hash(body.newRefereePassword, 12)
    : existing.refereePasswordHash;

  await db.update(tournamentDetails).set({
    name: body.name,
    numberOfParallelGames: body.numberOfParallelGames,
    minutesPerGame: body.minutesPerGame,
    minutesAvailForGroupsPhase: body.minutesAvailForGroupsPhase,
    finalistCount: body.finalistCount,
    tournamentStartTime: body.tournamentStartTime,
    finalsStartTime: body.finalsStartTime,
    adminPasswordHash,
    refereePasswordHash,
  });
  return { ok: true };
});
