import { describe, it, expect } from 'vitest';
import { sortCompetitorsRanking } from './sort-competitors-ranking';
import { CalcCompetitor } from '../models/models';

describe('sortCompetitorsRanking', () => {
  const baseCompetitor = (id: number, name: string): CalcCompetitor => ({
    id,
    name,
    drawNumber: id,
    groupID: 1,
    diff: 0,
    createdAt: new Date(),
  });

  it('should sort by groupRanking if present and different', () => {
    const compA = { ...baseCompetitor(1, 'A'), groupRanking: 2 };
    const compB = { ...baseCompetitor(2, 'B'), groupRanking: 1 };

    // a.groupRanking (2) - b.groupRanking (1) = 1 (positive, so A comes after B)
    expect(sortCompetitorsRanking(compA, compB)).toBe(1);
    expect(sortCompetitorsRanking(compB, compA)).toBe(-1);
  });

  it('should ignore groupRanking if it is identical', () => {
    const compA = { ...baseCompetitor(1, 'A'), groupRanking: 1, matchPoints: 4 };
    const compB = { ...baseCompetitor(2, 'B'), groupRanking: 1, matchPoints: 2 };

    // same group ranking, should fallback to matchPoints.
    // matchPoints difference: 4 - 2 = 2. Returns -2 (negative, so A comes before B)
    expect(sortCompetitorsRanking(compA, compB)).toBeLessThan(0);
  });

  it('should sort by matchPoints if groupRanking is not present or identical', () => {
    const compA = { ...baseCompetitor(1, 'A'), matchPoints: 4 };
    const compB = { ...baseCompetitor(2, 'B'), matchPoints: 2 };

    expect(sortCompetitorsRanking(compA, compB)).toBeLessThan(0);
    expect(sortCompetitorsRanking(compB, compA)).toBeGreaterThan(0);
  });

  it('should sort by gamePoints if matchPoints are identical', () => {
    const compA = { ...baseCompetitor(1, 'A'), matchPoints: 2, gamePoints: 10 };
    const compB = { ...baseCompetitor(2, 'B'), matchPoints: 2, gamePoints: 8 };

    expect(sortCompetitorsRanking(compA, compB)).toBeLessThan(0);
    expect(sortCompetitorsRanking(compB, compA)).toBeGreaterThan(0);
  });

  it('should sort by diff if matchPoints and gamePoints are identical', () => {
    const compA = { ...baseCompetitor(1, 'A'), matchPoints: 2, gamePoints: 10, diff: 3 };
    const compB = { ...baseCompetitor(2, 'B'), matchPoints: 2, gamePoints: 10, diff: 1 };

    expect(sortCompetitorsRanking(compA, compB)).toBeLessThan(0);
    expect(sortCompetitorsRanking(compB, compA)).toBeGreaterThan(0);
  });

  it('should sort by head-to-head match history (pairingHistory) if other stats are identical', () => {
    const compA: CalcCompetitor = {
      ...baseCompetitor(1, 'A'),
      matchPoints: 2,
      gamePoints: 10,
      diff: 0,
      pairingHistory: [{ opponentID: 2, gamePoints: 5, opponentGamePoints: 3, matchPoints: 2, diff: 2 }],
    };
    const compB: CalcCompetitor = {
      ...baseCompetitor(2, 'B'),
      matchPoints: 2,
      gamePoints: 10,
      diff: 0,
      pairingHistory: [{ opponentID: 1, gamePoints: 3, opponentGamePoints: 5, matchPoints: 0, diff: -2 }],
    };

    // A beat B head to head (5 to 3), so A should be ranked higher (negative return value)
    expect(sortCompetitorsRanking(compA, compB)).toBeLessThan(0);
    expect(sortCompetitorsRanking(compB, compA)).toBeGreaterThan(0);
  });

  it('should return 0 if all criteria are identical', () => {
    const compA = { ...baseCompetitor(1, 'A'), matchPoints: 2, gamePoints: 10, diff: 0 };
    const compB = { ...baseCompetitor(2, 'B'), matchPoints: 2, gamePoints: 10, diff: 0 };

    expect(sortCompetitorsRanking(compA, compB)).toBe(0);
  });
});
