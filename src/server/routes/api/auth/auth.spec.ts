import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { H3Event } from 'h3';

// Stub the body transport: parseBody → readBody(event) reads this instead of a
// real request stream, so the handlers still run the real zod validation.
vi.mock('h3', async () => {
  const actual = await import('h3');
  return {
    ...actual,
    readBody: vi.fn(async (event: H3Event) => (event as unknown as { _body: unknown })._body),
  };
});

// db is only ever reached via query.tournamentDetails.findMany in these handlers.
vi.mock('../../../db', () => ({
  db: { query: { tournamentDetails: { findMany: vi.fn() } } },
}));

// getSession hands back a controllable fake session shared across the test.
const session = { role: undefined as string | undefined, save: vi.fn(), destroy: vi.fn() };
vi.mock('../../../session', () => ({
  getSession: vi.fn(async () => session),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}));

import bcrypt from 'bcryptjs';
import { db } from '../../../db';
import { __resetRateLimits } from '../../../rate-limit';
import loginHandler from './login.post';
import logoutHandler from './logout.post';
import sessionHandler from './session.get';

const findMany = db.query.tournamentDetails.findMany as ReturnType<typeof vi.fn>;
const compare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;

// Minimal event: a body slot for readBody plus the node req/res getSession expects.
function makeEvent(body: unknown): H3Event {
  return { _body: body, context: {}, node: { req: { socket: {}, headers: {} }, res: {} } } as unknown as H3Event;
}

const DETAILS = { adminPasswordHash: 'admin-hash', refereePasswordHash: 'ref-hash' };

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimits();
    session.role = undefined;
    findMany.mockResolvedValue([DETAILS]);
  });

  it('rejects an empty password with a 400 before touching the db', async () => {
    await expect(loginHandler(makeEvent({ password: '' }))).rejects.toMatchObject({ statusCode: 400 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns 404 when no tournament is configured', async () => {
    findMany.mockResolvedValue([]);
    await expect(loginHandler(makeEvent({ password: 'whatever' }))).rejects.toMatchObject({ statusCode: 404 });
  });

  it('logs in an admin and persists the session role', async () => {
    compare.mockImplementation(async (pw: string, hash: string) => hash === 'admin-hash' && pw === 'secret');

    const result = await loginHandler(makeEvent({ password: 'secret' }));

    expect(result).toEqual({ role: 'admin' });
    expect(session.role).toBe('admin');
    expect(session.save).toHaveBeenCalled();
  });

  it('falls through to referee when the password is not the admin one', async () => {
    compare.mockImplementation(async (pw: string, hash: string) => hash === 'ref-hash' && pw === 'reffy');

    const result = await loginHandler(makeEvent({ password: 'reffy' }));

    expect(result).toEqual({ role: 'referee' });
    expect(session.role).toBe('referee');
    expect(session.save).toHaveBeenCalled();
  });

  it('throws 401 and saves nothing when the password matches neither role', async () => {
    compare.mockResolvedValue(false);

    await expect(loginHandler(makeEvent({ password: 'nope' }))).rejects.toMatchObject({ statusCode: 401 });
    expect(session.role).toBeUndefined();
    expect(session.save).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('destroys the session and reports ok', async () => {
    const result = await logoutHandler(makeEvent(undefined));
    expect(session.destroy).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.role = undefined;
  });

  it('reports null when no role is set', async () => {
    expect(await sessionHandler(makeEvent(undefined))).toEqual({ role: null });
  });

  it('reports the current role when authenticated', async () => {
    session.role = 'admin';
    expect(await sessionHandler(makeEvent(undefined))).toEqual({ role: 'admin' });
  });
});
