import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { H3Event } from 'h3';

// Stub the body transport so handlers still run the real zod validation.
vi.mock('h3', async () => {
  const actual = await import('h3');
  return {
    ...actual,
    readBody: vi.fn(async (event: H3Event) => (event as unknown as { _body: unknown })._body),
  };
});

// Chainable db stub: query.findMany for reads, insert→values→returning for setup,
// update→set for the put. Self-contained so the hoisted factory has no TDZ ref.
vi.mock('../../../db', () => {
  const returning = vi.fn();
  const values = vi.fn((_v: unknown) => ({ returning }));
  const set = vi.fn((_v: unknown) => undefined);
  return {
    db: {
      query: { tournamentDetails: { findMany: vi.fn() } },
      insert: vi.fn(() => ({ values })),
      update: vi.fn(() => ({ set })),
      __handles: { returning, values, set },
    },
    tournamentDetails: { __table: 'tournamentDetails' },
  };
});

// requireAdmin: passes by default, throw to simulate an unauthenticated caller.
const requireAdmin = vi.fn(async (_e?: unknown) => undefined);
vi.mock('../../../session', () => ({ requireAdmin: (e: H3Event) => requireAdmin(e) }));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async (pw: string) => `hash:${pw}`) },
}));

import bcrypt from 'bcryptjs';
import { db as mockedDb } from '../../../db';
import setupHandler from './setup.post';
import putHandler from './index.put';
import getHandler from './index.get';

const db = mockedDb as unknown as {
  query: { tournamentDetails: { findMany: ReturnType<typeof vi.fn> } };
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  __handles: { returning: ReturnType<typeof vi.fn>; values: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
};
const findMany = db.query.tournamentDetails.findMany;
const { returning, values, set } = db.__handles;
const hash = bcrypt.hash as unknown as ReturnType<typeof vi.fn>;

function makeEvent(body?: unknown): H3Event {
  return { _body: body, node: { req: {}, res: {} } } as unknown as H3Event;
}

// A fully-valid config payload; tournamentStartTime is an ISO string the schema coerces.
const CONFIG = {
  name: 'Spartan Open',
  numberOfParallelGames: 2,
  minutesPerGame: 20,
  minutesAvailForGroupsPhase: 120,
  finalistCount: 8,
  tournamentStartTime: '2026-07-01T09:00:00.000Z',
  finalsStartTime: '2026-07-01T15:00:00.000Z',
};

const EXISTING = { id: 1, ...CONFIG, adminPasswordHash: 'old-admin', refereePasswordHash: 'old-ref' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue(undefined);
});

describe('POST /api/tournament/setup', () => {
  it('returns 409 when a tournament already exists', async () => {
    findMany.mockResolvedValue([EXISTING]);
    await expect(
      setupHandler(makeEvent({ ...CONFIG, adminPassword: 'a', refereePassword: 'r' })),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload with a 400 and inserts nothing', async () => {
    findMany.mockResolvedValue([]);
    // numberOfParallelGames must be a positive int.
    await expect(
      setupHandler(makeEvent({ ...CONFIG, numberOfParallelGames: 0, adminPassword: 'a', refereePassword: 'r' })),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('hashes both passwords, coerces dates and persists the new tournament', async () => {
    findMany.mockResolvedValue([]);
    const created = { id: 1, ...CONFIG };
    returning.mockResolvedValue([created]);

    const result = await setupHandler(makeEvent({ ...CONFIG, adminPassword: 'admin-pw', refereePassword: 'ref-pw' }));

    expect(result).toBe(created);
    expect(hash).toHaveBeenCalledWith('admin-pw', 12);
    expect(hash).toHaveBeenCalledWith('ref-pw', 12);
    const inserted = values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted['adminPasswordHash']).toBe('hash:admin-pw');
    expect(inserted['refereePasswordHash']).toBe('hash:ref-pw');
    expect(inserted['tournamentStartTime']).toBeInstanceOf(Date);
  });
});

describe('PUT /api/tournament', () => {
  it('rejects unauthenticated callers before reading the db', async () => {
    requireAdmin.mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode: 401 }));
    await expect(putHandler(makeEvent(CONFIG))).rejects.toMatchObject({ statusCode: 401 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns null when no tournament is configured', async () => {
    findMany.mockResolvedValue([]);
    expect(await putHandler(makeEvent(CONFIG))).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('keeps existing password hashes when no new passwords are supplied', async () => {
    findMany.mockResolvedValue([EXISTING]);

    const result = await putHandler(makeEvent(CONFIG));

    expect(result).toEqual({ ok: true });
    expect(hash).not.toHaveBeenCalled();
    const updated = set.mock.calls[0][0] as Record<string, unknown>;
    expect(updated['adminPasswordHash']).toBe('old-admin');
    expect(updated['refereePasswordHash']).toBe('old-ref');
  });

  it('hashes and replaces only the passwords that are provided', async () => {
    findMany.mockResolvedValue([EXISTING]);

    await putHandler(makeEvent({ ...CONFIG, newAdminPassword: 'fresh-admin' }));

    expect(hash).toHaveBeenCalledWith('fresh-admin', 12);
    const updated = set.mock.calls[0][0] as Record<string, unknown>;
    expect(updated['adminPasswordHash']).toBe('hash:fresh-admin');
    expect(updated['refereePasswordHash']).toBe('old-ref'); // unchanged
  });
});

describe('GET /api/tournament', () => {
  it('wraps the configured tournament', async () => {
    findMany.mockResolvedValue([EXISTING]);
    expect(await getHandler(makeEvent())).toEqual({ tournament: EXISTING });
  });

  it('returns null when nothing is configured', async () => {
    findMany.mockResolvedValue([]);
    expect(await getHandler(makeEvent())).toEqual({ tournament: null });
  });
});
