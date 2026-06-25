import { defineEventHandler, createError } from 'h3';
import bcrypt from 'bcryptjs';
import { db } from '../../../db';
import { getSession } from '../../../session';
import { enforceLoginRateLimit, clearLoginRateLimit } from '../../../rate-limit';
import { parseBody, loginBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  enforceLoginRateLimit(event);

  const { password } = await parseBody(event, loginBody);

  const [details] = await db.query.tournamentDetails.findMany({ limit: 1 });
  if (!details) throw createError({ statusCode: 404, statusMessage: 'No tournament configured' });

  const isAdmin = await bcrypt.compare(password, details.adminPasswordHash);
  if (isAdmin) {
    const session = await getSession(event);
    session.role = 'admin';
    await session.save();
    clearLoginRateLimit(event);
    return { role: 'admin' };
  }

  const isReferee = await bcrypt.compare(password, details.refereePasswordHash);
  if (isReferee) {
    const session = await getSession(event);
    session.role = 'referee';
    await session.save();
    clearLoginRateLimit(event);
    return { role: 'referee' };
  }

  throw createError({ statusCode: 401, statusMessage: 'Invalid password' });
});
