import { describe, it, expect } from 'vitest';
import { calcAllMatchPoints } from './calc-all-match-points';
import { CalcCompetitor, CalcGamePoint, CalcPairing } from '../models/models';

describe('calcAllMatchPoints', () => {
  const mockCompetitor = (id: number, groupID: number, name: string): CalcCompetitor => ({
    id,
    name,
    drawNumber: id,
    groupID,
    diff: 0,
    createdAt: new Date(),
  });

  const mockPairing = (id: number, competitor1ID: number, competitor2ID: number, groupID: number): CalcPairing => ({
    id,
    gamenumber: id,
    competitor1ID,
    competitor2ID,
    round: 1,
    groupID,
    startTime: new Date(),
    court: 1,
  });

  const mockGamePoint = (
    id: number,
    pairingID: number,
    competitor1Points: number,
    competitor2Points: number,
  ): CalcGamePoint => ({
    id,
    pairingID,
    competitor1Points,
    competitor2Points,
    createdAt: new Date(),
  });

  it('should initialize and aggregate scores, diffs, and histories for all competitors and set group rankings', () => {
    // Competitors
    const comp1 = mockCompetitor(1, 1, 'Alice');
    const comp2 = mockCompetitor(2, 1, 'Bob');
    const comp3 = mockCompetitor(3, 1, 'Charlie');
    const competitors = [comp1, comp2, comp3];

    // Pairings
    const pair1 = mockPairing(101, 1, 2, 1); // Alice vs Bob
    const pair2 = mockPairing(102, 2, 3, 1); // Bob vs Charlie
    const pair3 = mockPairing(103, 1, 3, 1); // Alice vs Charlie
    const pairings = [pair1, pair2, pair3];

    // GamePoints
    const gp1 = mockGamePoint(201, 101, 5, 3); // Alice beats Bob 5-3
    const gp2 = mockGamePoint(202, 102, 4, 4); // Bob draws Charlie 4-4
    const gp3 = mockGamePoint(203, 103, 2, 6); // Alice loses to Charlie 2-6
    const gamePoints = [gp1, gp2, gp3];

    // Run calculation
    calcAllMatchPoints(competitors, gamePoints, pairings);

    // Verify Bob
    // Bob vs Alice: lost (3 game points, -2 diff, 0 match points)
    // Bob vs Charlie: draw (4 game points, 0 diff, 1 match point)
    // Total: gamePoints = 7, diff = -2, matchPoints = 1
    expect(comp2.gamePoints).toBe(7);
    expect(comp2.diff).toBe(-2);
    expect(comp2.matchPoints).toBe(1);
    expect(comp2.pairingHistory?.length).toBe(2);
    expect(comp2.pairingHistory).toContainEqual({
      opponentID: 1,
      gamePoints: 3,
      opponentGamePoints: 5,
      matchPoints: 0,
      diff: -2,
    });

    // Verify Charlie
    // Charlie vs Bob: draw (4 game points, 0 diff, 1 match point)
    // Charlie vs Alice: won (6 game points, +4 diff, 2 match points)
    // Total: gamePoints = 10, diff = 4, matchPoints = 3
    expect(comp3.gamePoints).toBe(10);
    expect(comp3.diff).toBe(4);
    expect(comp3.matchPoints).toBe(3);

    // Verify Alice
    // Alice vs Bob: won (5 game points, +2 diff, 2 match points)
    // Alice vs Charlie: lost (2 game points, -4 diff, 0 match points)
    // Total: gamePoints = 7, diff = -2, matchPoints = 2
    expect(comp1.gamePoints).toBe(7);
    expect(comp1.diff).toBe(-2);
    expect(comp1.matchPoints).toBe(2);

    // Group rankings (should sort by ranking order)
    // Charlie: 3 matchPoints -> Ranking 1
    // Alice: 2 matchPoints -> Ranking 2
    // Bob: 1 matchPoints -> Ranking 3
    expect(comp3.groupRanking).toBe(1);
    expect(comp1.groupRanking).toBe(2);
    expect(comp2.groupRanking).toBe(3);

    // Check overall sorting order of the returned array
    expect(competitors[0].id).toBe(3); // Charlie
    expect(competitors[1].id).toBe(1); // Alice
    expect(competitors[2].id).toBe(2); // Bob
  });

  it('should reset competitor points before calculating', () => {
    const comp1 = { ...mockCompetitor(1, 1, 'Alice'), matchPoints: 10, gamePoints: 100, diff: 50 };
    const comp2 = { ...mockCompetitor(2, 1, 'Bob'), matchPoints: 5, gamePoints: 50, diff: -50 };
    const competitors = [comp1, comp2];

    const pair = mockPairing(101, 1, 2, 1);
    const gp = mockGamePoint(201, 101, 3, 2); // Alice wins 3-2

    calcAllMatchPoints(competitors, [gp], [pair]);

    expect(comp1.matchPoints).toBe(2); // Reset to 0 then +2
    expect(comp1.gamePoints).toBe(3); // Reset to 0 then +3
    expect(comp1.diff).toBe(1); // Reset to 0 then +1
  });
});
