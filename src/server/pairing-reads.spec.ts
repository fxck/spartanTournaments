import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ./db so the real db/index.ts (which reads process.env) is never loaded
// under the jsdom transform. The query-building uses the real schema tables,
// pulled from ./db/schema directly.
vi.mock('./db', async () => {
  const schema = await import('./db/schema');
  return {
    db: {},
    pairings: schema.pairings,
    competitors: schema.competitors,
    gamePoints: schema.gamePoints,
  };
});

import { PairingReads } from './pairing-reads';
import type { DbOrTx } from './db';

// A chainable recorder standing in for the drizzle query builder. select →
// from → leftJoin* → $dynamic → where → orderBy, where orderBy resolves to
// canned rows.
function makeTx(rows: unknown[] = []) {
  const calls = { leftJoin: 0, where: [] as unknown[], orderBy: [] as unknown[][] };
  const builder: Record<string, unknown> = {
    from: vi.fn(() => builder),
    leftJoin: vi.fn(() => {
      calls.leftJoin++;
      return builder;
    }),
    $dynamic: vi.fn(() => builder),
    where: vi.fn((c: unknown) => {
      calls.where.push(c);
      return builder;
    }),
    orderBy: vi.fn((...args: unknown[]) => {
      calls.orderBy.push(args);
      return Promise.resolve(rows);
    }),
  };
  const tx = {
    select: vi.fn(() => builder),
    query: { tournamentDetails: { findMany: vi.fn() } },
  };
  return { tx: tx as unknown as DbOrTx & { query: { tournamentDetails: { findMany: ReturnType<typeof vi.fn> } } }, calls };
}

describe('PairingReads.findPairings', () => {
  it('returns the rows produced by the query', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const { tx } = makeTx(rows);
    const result = await PairingReads.findPairings(tx, {});
    expect(result).toEqual(rows);
  });

  it('self-joins both competitors and orders by startTime then court', async () => {
    const { tx, calls } = makeTx();
    await PairingReads.findPairings(tx, {});
    // Two leftJoins for competitor1 / competitor2.
    expect(calls.leftJoin).toBe(2);
    expect(calls.orderBy[0]).toHaveLength(2);
  });

  it('applies no WHERE when the filter is empty', async () => {
    const { tx, calls } = makeTx();
    await PairingReads.findPairings(tx, {});
    expect(calls.where[0]).toBeUndefined();
  });

  it('builds a WHERE condition when a competitor filter is given', async () => {
    const { tx, calls } = makeTx();
    await PairingReads.findPairings(tx, { competitorId: 5 });
    expect(calls.where[0]).toBeDefined();
  });

  it('adds a third leftJoin (gamePoints) for unplayedOnly', async () => {
    const { tx, calls } = makeTx();
    await PairingReads.findPairings(tx, { unplayedOnly: true });
    expect(calls.leftJoin).toBe(3);
    expect(calls.where[0]).toBeDefined();
  });
});

describe('PairingReads.findActivePairings', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns [] when no tournament details exist', async () => {
    const { tx } = makeTx();
    tx.query.tournamentDetails.findMany.mockResolvedValue([]);
    const spy = vi.spyOn(PairingReads, 'findPairings');

    const result = await PairingReads.findActivePairings(tx);

    expect(result).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('queries a window of ±minutesPerGame around now', async () => {
    const { tx } = makeTx();
    tx.query.tournamentDetails.findMany.mockResolvedValue([{ minutesPerGame: 20 }]);
    const spy = vi.spyOn(PairingReads, 'findPairings').mockResolvedValue([]);

    const before = Date.now();
    await PairingReads.findActivePairings(tx);
    const after = Date.now();

    expect(spy).toHaveBeenCalledTimes(1);
    const filter = spy.mock.calls[0][1]!;
    const { from, to } = filter.startTimeBetween!;
    // Window spans exactly 2 × minutesPerGame, centred on "now".
    expect(to.getTime() - from.getTime()).toBe(2 * 20 * 60000);
    const midpoint = (from.getTime() + to.getTime()) / 2;
    expect(midpoint).toBeGreaterThanOrEqual(before - 1000);
    expect(midpoint).toBeLessThanOrEqual(after + 1000);
  });
});
