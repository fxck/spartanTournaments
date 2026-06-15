import { describe, it, expect } from 'vitest';
import { calcFinals } from './calc-finals';
import { CalcGroup, CalcPairing, CalcGamePoint, CalcCompetitor } from '../models/models';

describe('calcFinals', () => {
  const mockCompetitor = (id: number, drawNumber: number, name: string): CalcCompetitor => ({
    id,
    name,
    drawNumber,
    groupID: 1,
    diff: 0,
    createdAt: new Date(),
  });

  it('should generate correct knockout pairings for the finals phase based on standings', () => {
    // 4 competitors in Group 1
    const comps = [
      mockCompetitor(1, 1, 'Alice'),
      mockCompetitor(2, 2, 'Bob'),
      mockCompetitor(3, 3, 'Charlie'),
      mockCompetitor(4, 4, 'Dave'),
    ];

    const groups: CalcGroup[] = [{ id: 1, competitors: comps }];

    // Group stage pairings and results (empty, so they will sort by drawNumber or matchPoints which are undefined/0)
    // To mock standings, let's explicitly give them matchPoints
    comps[0].matchPoints = 6; // Alice: 1st
    comps[1].matchPoints = 4; // Bob: 2nd
    comps[2].matchPoints = 2; // Charlie: 3rd
    comps[3].matchPoints = 0; // Dave: 4th

    const groupPairings: CalcPairing[] = [];
    const gamePoints: CalcGamePoint[] = [];

    const startTime = new Date('2026-05-24T12:00:00Z');

    // We want 4 finalists.
    // Positions returned for 4: [1, 4, 3, 2]
    // Alice (1st) -> finalPosition 1
    // Bob (2nd) -> finalPosition 4
    // Charlie (3rd) -> finalPosition 3
    // Dave (4th) -> finalPosition 2
    // Sorted by finalPosition:
    // Index 0: Alice (1st)
    // Index 1: Dave (4th)
    // Index 2: Charlie (3rd)
    // Index 3: Bob (2nd)
    // Pairs:
    // Alice vs Dave -> i=0. groupID = -1, round = -2.
    // Charlie vs Bob -> i=2. groupID = -2, round = -2.

    const result = calcFinals(
      groups,
      groupPairings,
      gamePoints,
      4, // finalistcount
      startTime,
      2, // 2 parallel games
      20, // 20 minutes per game
    );

    expect(result.length).toBe(2);

    // Pairing 1: Alice (1) vs Dave (4)
    expect(result[0]).toEqual(
      expect.objectContaining({
        competitor1ID: 1,
        competitor2ID: 4,
        court: 1,
        groupID: -1,
        round: -2,
        startTime: startTime,
      }),
    );

    // Pairing 2: Charlie (3) vs Bob (2)
    expect(result[1]).toEqual(
      expect.objectContaining({
        competitor1ID: 3,
        competitor2ID: 2,
        court: 2,
        groupID: -2,
        round: -2,
        startTime: startTime,
      }),
    );
  });

  it('should schedule games sequentially if they exceed the parallel courts limit', () => {
    const comps = [
      mockCompetitor(1, 1, 'Alice'),
      mockCompetitor(2, 2, 'Bob'),
      mockCompetitor(3, 3, 'Charlie'),
      mockCompetitor(4, 4, 'Dave'),
    ];
    const groups: CalcGroup[] = [{ id: 1, competitors: comps }];
    comps[0].matchPoints = 6;
    comps[1].matchPoints = 4;
    comps[2].matchPoints = 2;
    comps[3].matchPoints = 0;

    const startTime = new Date('2026-05-24T12:00:00Z');

    // Only 1 parallel game.
    // Second game should be delayed by 20 minutes and play on court 1
    const result = calcFinals(
      groups,
      [],
      [],
      4,
      startTime,
      1, // 1 parallel game
      20, // 20 mins
    );

    expect(result.length).toBe(2);
    expect(result[0].court).toBe(1);
    expect(result[0].startTime.getTime()).toBe(startTime.getTime());

    expect(result[1].court).toBe(1);
    expect(result[1].startTime.getTime()).toBe(startTime.getTime() + 20 * 60000);
  });
});
