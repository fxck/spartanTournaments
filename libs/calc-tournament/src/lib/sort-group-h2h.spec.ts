import { describe, it, expect } from 'vitest';
import { sortGroupWithH2H } from './sort-group-h2h';
import { CalcCompetitor } from '../models/models';

describe('sortGroupWithH2H', () => {
  const mockCompetitor = (id: number, matchPoints: number, gamePoints: number, diff: number): CalcCompetitor => ({
    id,
    name: `Team ${id}`,
    drawNumber: id,
    groupID: 1,
    matchPoints,
    gamePoints,
    diff,
    pairingHistory: [],
    createdAt: new Date(),
  });

  it('should sort players by matchPoints in descending order under normal circumstances', () => {
    const team1 = mockCompetitor(1, 4, 10, 2);
    const team2 = mockCompetitor(2, 6, 12, 4);
    const team3 = mockCompetitor(3, 2, 8, -6);

    const group = [team1, team2, team3];
    sortGroupWithH2H(group);

    // Expected order: 2 (6 pts), 1 (4 pts), 3 (2 pts)
    expect(group.map((c) => c.id)).toEqual([2, 1, 3]);
  });

  it('should resolve a 2-way tie using direct head-to-head match history (absolute priority)', () => {
    const teamA = mockCompetitor(1, 4, 10, 2); // 4 matchPoints
    const teamB = mockCompetitor(2, 4, 15, 8); // 4 matchPoints, better diff/gamePoints!

    // Direct match: Team A beat Team B (5 - 3)
    teamA.pairingHistory = [
      {
        opponentID: 2,
        gamePoints: 5,
        opponentGamePoints: 3,
        matchPoints: 2,
        diff: 2,
      },
    ];
    teamB.pairingHistory = [
      {
        opponentID: 1,
        gamePoints: 3,
        opponentGamePoints: 5,
        matchPoints: 0,
        diff: -2,
      },
    ];

    const group = [teamB, teamA]; // Team B starts first in array
    sortGroupWithH2H(group);

    // Even though Team B has better overall gamePoints and diff, Team A won the direct match
    // So Team A must rank first.
    expect(group.map((c) => c.id)).toEqual([1, 2]);
  });

  it('should fall back to point diff and game points in a 2-way tie if they drew their head-to-head match', () => {
    const teamA = mockCompetitor(1, 4, 10, 2); // 4 matchPoints, +2 diff
    const teamB = mockCompetitor(2, 4, 12, 4); // 4 matchPoints, +4 diff (better!)

    // Direct match was a draw (3 - 3)
    teamA.pairingHistory = [
      {
        opponentID: 2,
        gamePoints: 3,
        opponentGamePoints: 3,
        matchPoints: 1,
        diff: 0,
      },
    ];
    teamB.pairingHistory = [
      {
        opponentID: 1,
        gamePoints: 3,
        opponentGamePoints: 3,
        matchPoints: 1,
        diff: 0,
      },
    ];

    const group = [teamA, teamB];
    sortGroupWithH2H(group);

    // Since they drew head-to-head, it should fall back to point diff (Team B has +4, Team A has +2)
    expect(group.map((c) => c.id)).toEqual([2, 1]);
  });

  it('should resolve a 3-way circular tie ("Circle of Death") using overall point difference without causing sorting instabilities', () => {
    // 3 teams all tied on 4 matchPoints
    const teamA = mockCompetitor(1, 4, 12, 4); // +4 overall diff
    const teamB = mockCompetitor(2, 4, 10, 0); // 0 overall diff
    const teamC = mockCompetitor(3, 4, 15, -4); // -4 overall diff

    // Circle of Death: A beat B, B beat C, C beat A
    teamA.pairingHistory = [
      { opponentID: 2, gamePoints: 5, opponentGamePoints: 2, matchPoints: 2, diff: 3 }, // Beat B
      { opponentID: 3, gamePoints: 1, opponentGamePoints: 4, matchPoints: 0, diff: -3 }, // Lost to C
    ];
    teamB.pairingHistory = [
      { opponentID: 1, gamePoints: 2, opponentGamePoints: 5, matchPoints: 0, diff: -3 }, // Lost to A
      { opponentID: 3, gamePoints: 4, opponentGamePoints: 1, matchPoints: 2, diff: 3 }, // Beat C
    ];
    teamC.pairingHistory = [
      { opponentID: 1, gamePoints: 4, opponentGamePoints: 1, matchPoints: 2, diff: 3 }, // Beat A
      { opponentID: 2, gamePoints: 1, opponentGamePoints: 4, matchPoints: 0, diff: -3 }, // Lost to B
    ];

    const group = [teamC, teamB, teamA];
    sortGroupWithH2H(group);

    // Head-to-head is circular (A > B > C > A), so it is bypassed.
    // Order is decided by overall diff (highest first):
    // Team A (+4) -> 1st
    // Team B (0) -> 2nd
    // Team C (-4) -> 3rd
    expect(group.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it('should resolve a tie between 2 teams within a 3-way tie using head-to-head if they remain tied on diff and game points', () => {
    // 3 teams all tied on 4 matchPoints
    const teamA = mockCompetitor(1, 4, 15, 6); // A is 1st with +6 overall diff
    const teamB = mockCompetitor(2, 4, 10, 2); // B has +2 overall diff, 10 overall gamePoints
    const teamC = mockCompetitor(3, 4, 10, 2); // C also has +2 overall diff, 10 overall gamePoints!

    // B vs C direct match: B beat C (4 - 2)
    teamB.pairingHistory = [{ opponentID: 3, gamePoints: 4, opponentGamePoints: 2, matchPoints: 2, diff: 2 }];
    teamC.pairingHistory = [{ opponentID: 2, gamePoints: 2, opponentGamePoints: 4, matchPoints: 0, diff: -2 }];

    const group = [teamC, teamB, teamA];
    sortGroupWithH2H(group);

    // Expected:
    // Team A is 1st due to better diff (+6).
    // Team B and C are tied on matchPoints (4), diff (2), and gamePoints (10).
    // The nested H2H check resolves that Team B beat Team C, so B is 2nd, C is 3rd.
    expect(group.map((c) => c.id)).toEqual([1, 2, 3]);
  });
});
