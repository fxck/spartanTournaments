import { getIronSession } from 'iron-session';
import { createError } from 'h3';
import type { H3Event } from 'h3';

export interface SessionData {
  role?: 'admin' | 'referee';
}

const sessionOptions = {
  password: process.env['SESSION_SECRET'] ?? 'change-me-in-production-min-32-chars!!',
  cookieName: 'spartan-tournament-session',
  cookieOptions: {
    secure: false, // Force false for now to debug
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
  },
};

export async function getSession(event: H3Event) {
  const cookieHeader = event.node.req.headers.cookie;
  console.log(`[SESSION] Request path: ${event.path} | Cookie present: ${!!cookieHeader}`);
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
