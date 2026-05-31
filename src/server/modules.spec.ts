import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TournamentStandings } from './tournament-standings';
import { TournamentEngine } from './tournament-engine';
import { MatchRegistry } from './match-registry';
import { db } from './db';
import { competitors, pairings, gamePoints } from './db/schema';

// Stub db.select().from(table) to resolve canned rows per table, independent of
// the Promise.all ordering inside getGroupsStandings.
function mockStandingsDb(data: { comps: any[]; pairings: any[]; gps: any[] }) {
  db.select = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation((tbl: any) => {
      if (tbl === competitors) return Promise.resolve(data.comps);
      if (tbl === pairings) return Promise.resolve(data.pairings);
      if (tbl === gamePoints) return Promise.resolve(data.gps);
      return Promise.resolve([]);
    }),
  }));
}

// Mock DB
vi.mock('./db', () => {
  const mockDb: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    query: {
      tournamentDetails: {
        findMany: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

describe('TournamentStandings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compute standings and group competitors correctly', async () => {
    const mockComps = [
      { id: 1, name: 'Alice', drawNumber: 1, groupID: 1, createdAt: new Date() },
      { id: 2, name: 'Bob', drawNumber: 2, groupID: 1, createdAt: new Date() },
    ];
    const mockPairings = [
      { id: 10, competitor1ID: 1, competitor2ID: 2, round: 1, groupID: 1 },
    ];
    const mockGps = [
      { id: 100, pairingID: 10, competitor1Points: 5, competitor2Points: 3 },
    ];

    let callCount = 0;
    db.select = vi.fn().mockImplementation(() => {
      return {
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(mockComps);
          if (callCount === 2) return Promise.resolve(mockPairings);
          if (callCount === 3) return Promise.resolve(mockGps);
          return Promise.resolve([]);
        }),
      };
    });

    const standings = await TournamentStandings.getGroupsStandings(db, 0);

    expect(standings).toBeDefined();
    expect(standings.length).toBe(1);
    expect(standings[0].id).toBe(1);
    expect(standings[0].competitors.length).toBe(2);

    // Alice won 5-3, should have groupRanking 1, matchPoints 2
    const alice = standings[0].competitors.find((c) => c.id === 1);
    expect(alice?.matchPoints).toBe(2);
    expect(alice?.groupRanking).toBe(1);

    // Bob lost, should have matchPoints 0, groupRanking 2
    const bob = standings[0].competitors.find((c) => c.id === 2);
    expect(bob?.matchPoints).toBe(0);
    expect(bob?.groupRanking).toBe(2);
  });

  it('excludes finals pairings (groupID < 0) from the group ranking', async () => {
    const comps = [
      { id: 1, name: 'Alice', drawNumber: 1, groupID: 1, createdAt: new Date() },
      { id: 2, name: 'Bob', drawNumber: 2, groupID: 1, createdAt: new Date() },
    ];
    mockStandingsDb({
      comps,
      pairings: [
        { id: 10, competitor1ID: 1, competitor2ID: 2, round: 1, groupID: 1 }, // group: Alice beats Bob
        { id: 20, competitor1ID: 2, competitor2ID: 1, round: 1, groupID: -1 }, // finals: must be ignored
      ],
      gps: [
        { id: 100, pairingID: 10, competitor1Points: 5, competitor2Points: 3 },
        { id: 200, pairingID: 20, competitor1Points: 10, competitor2Points: 0 }, // Bob "wins" the final
      ],
    });

    const standings = await TournamentStandings.getGroupsStandings(db, 0);
    const bob = standings[0].competitors.find((c) => c.id === 2);
    expect(bob?.matchPoints).toBe(0); // finals result not counted toward group points
  });

  it('skips competitors with no group assignment (groupID 0)', async () => {
    mockStandingsDb({
      comps: [
        { id: 1, name: 'Alice', drawNumber: 1, groupID: 1, createdAt: new Date() },
        { id: 2, name: 'Bob', drawNumber: 2, groupID: 1, createdAt: new Date() },
        { id: 3, name: 'Cara', drawNumber: 3, groupID: 0, createdAt: new Date() },
      ],
      pairings: [],
      gps: [],
    });

    const standings = await TournamentStandings.getGroupsStandings(db, 0);
    const allIds = standings.flatMap((g) => g.competitors.map((c) => c.id));
    expect(allIds).not.toContain(3);
  });

  it('returns groups sorted by id ascending', async () => {
    mockStandingsDb({
      comps: [
        { id: 1, name: 'A', drawNumber: 1, groupID: 2, createdAt: new Date() },
        { id: 2, name: 'B', drawNumber: 2, groupID: 1, createdAt: new Date() },
      ],
      pairings: [],
      gps: [],
    });

    const standings = await TournamentStandings.getGroupsStandings(db, 0);
    expect(standings.map((g) => g.id)).toEqual([1, 2]);
  });

  it('with a competitor filter, returns only that competitor\'s group', async () => {
    mockStandingsDb({
      comps: [
        { id: 1, name: 'A', drawNumber: 1, groupID: 1, createdAt: new Date() },
        { id: 2, name: 'B', drawNumber: 2, groupID: 2, createdAt: new Date() },
      ],
      pairings: [],
      gps: [],
    });

    const standings = await TournamentStandings.getGroupsStandings(db, 2); // competitor 2 → group 2
    expect(standings.map((g) => g.id)).toEqual([2]);
  });

  it('uses preloaded game points instead of querying them', async () => {
    const comps = [
      { id: 1, name: 'Alice', drawNumber: 1, groupID: 1, createdAt: new Date() },
      { id: 2, name: 'Bob', drawNumber: 2, groupID: 1, createdAt: new Date() },
    ];
    const fromSpy = vi.fn((tbl: any) => {
      if (tbl === competitors) return Promise.resolve(comps);
      if (tbl === pairings) return Promise.resolve([{ id: 10, competitor1ID: 1, competitor2ID: 2, round: 1, groupID: 1 }]);
      return Promise.resolve([]);
    });
    db.select = vi.fn(() => ({ from: fromSpy })) as any;

    const preloaded = [{ id: 100, pairingID: 10, competitor1Points: 5, competitor2Points: 3 }] as any;
    const standings = await TournamentStandings.getGroupsStandings(db, 0, preloaded);

    const alice = standings[0].competitors.find((c) => c.id === 1);
    expect(alice?.matchPoints).toBe(2); // win came from the preloaded points
    expect(fromSpy.mock.calls.map((c) => c[0])).not.toContain(gamePoints);
  });
});

describe('MatchRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert gamepoint when not existing', async () => {
    // Select returns empty array (does not exist)
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const mockCreated = { id: 1, pairingID: 42, competitor1Points: 2, competitor2Points: 1 };
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockCreated]),
      }),
    });

    const result = await MatchRegistry.recordGamePoint(db, 42, 2, 1);
    expect(result).toEqual(mockCreated);
    expect(db.insert).toHaveBeenCalled();
  });

  it('should update gamepoint when existing', async () => {
    // Select returns existing gamepoint
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, pairingID: 42 }]),
      }),
    });

    const mockUpdated = { id: 1, pairingID: 42, competitor1Points: 3, competitor2Points: 3 };
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUpdated]),
        }),
      }),
    });

    const result = await MatchRegistry.recordGamePoint(db, 42, 3, 3);
    expect(result).toEqual(mockUpdated);
    expect(db.update).toHaveBeenCalled();
  });
});

describe('TournamentEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction = vi.fn().mockImplementation((callback) => callback(db));
  });

  it('assignRandomDraw should draw unique random numbers within transaction', async () => {
    const mockComps = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(mockComps),
    });
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    });

    await TournamentEngine.assignRandomDraw();

    expect(db.transaction).toHaveBeenCalled();
    expect(db.select).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});
