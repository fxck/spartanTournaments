import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TournamentStandings } from './tournament-standings';
import { TournamentEngine } from './tournament-engine';
import { MatchRegistry } from './match-registry';
import { db } from './db';

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
