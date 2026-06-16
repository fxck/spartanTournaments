import { getIronSession } from 'iron-session';
import { createError } from 'h3';
import type { H3Event } from 'h3';

export interface SessionData {
  role?: 'admin' | 'referee';
}

const sessionSecret = process.env['SESSION_SECRET'];
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be set to a value of at least 32 characters.');
}

const sessionOptions = {
  password: sessionSecret,
  cookieName: 'spartan-tournament-session',
  cookieOptions: {
    secure: process.env['NODE_ENV'] === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
  },
};

export async function getSession(event: H3Event) {
  return getIronSession<SessionData>(event.node.req, event.node.res, sessionOptions);
}

export async function requireAdmin(event: H3Event) {
  const session = await getSession(event);
  if (session.role !== 'admin') {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  return session;
}

export async function requireReferee(event: H3Event) {
  const session = await getSession(event);
  if (session.role !== 'admin' && session.role !== 'referee') {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  return session;
}
