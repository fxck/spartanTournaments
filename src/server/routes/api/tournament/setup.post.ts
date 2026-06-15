import { defineEventHandler, createError } from 'h3';
import bcrypt from 'bcryptjs';
import { db, tournamentDetails } from '../../../db';
import { parseBody, tournamentSetupBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  const existing = await db.query.tournamentDetails.findMany({ limit: 1 });
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: 'Tournament already configured' });

  const body = await parseBody(event, tournamentSetupBody);
  const adminPasswordHash = await bcrypt.hash(body.adminPassword, 12);
  const refereePasswordHash = await bcrypt.hash(body.refereePassword, 12);

  const [created] = await db
    .insert(tournamentDetails)
    .values({
      name: body.name,
      numberOfParallelGames: body.numberOfParallelGames,
      minutesPerGame: body.minutesPerGame,
      minutesAvailForGroupsPhase: body.minutesAvailForGroupsPhase,
      finalistCount: body.finalistCount,
      tournamentStartTime: body.tournamentStartTime,
      finalsStartTime: body.finalsStartTime,
      adminPasswordHash,
      refereePasswordHash,
    })
    .returning();
  return created;
});
