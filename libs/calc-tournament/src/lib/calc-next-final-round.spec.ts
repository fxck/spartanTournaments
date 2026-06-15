import { describe, it, expect } from 'vitest';
import { calcNextFinalRound } from './calc-next-final-round';
import { CalcPairing, CalcGamePoint } from '../models/models';

describe('calcNextFinalRound', () => {
  const mockPairing = (
    id: number,
    competitor1ID: number,
    competitor2ID: number,
    round: number,
    groupID: number,
  ): CalcPairing => ({
    id,
    gamenumber: id,
    competitor1ID,
    competitor2ID,
    round,
    groupID,
    startTime: new Date('2026-05-24T12:00:00Z'),
    court: 1,
  });

  const mockGamePoint = (pairingID: number, competitor1Points: number, competitor2Points: number): CalcGamePoint => ({
    id: pairingID * 10,
    pairingID,
    competitor1Points,
    competitor2Points,
    createdAt: new Date(),
  });

  it('should ignore final round pairings (round === -1)', () => {
    // Round -1 is the absolute final round, so no next round should be computed.
    const pairing = mockPairing(1, 10, 20, -1, -1);
    const gp = mockGamePoint(1, 5, 3); // Competitor 10 wins 5-3

    const result = calcNextFinalRound([pairing], [gp], 20);
    expect(result).toEqual([]);
  });

  it('should progress winners to competitor1ID or competitor2ID of the next round pairing based on odd/even groupID', () => {
    // Semifinals: round = -2, groupIDs = -1 and -2
    // SF1 (groupID = -1): Comp 10 vs Comp 20
    // SF2 (groupID = -2): Comp 30 vs Comp 40
    const sf1 = mockPairing(1, 10, 20, -2, -1);
    const sf2 = mockPairing(2, 30, 40, -2, -2);

    // SF1 result: Comp 10 wins (5 - 3)
    const gpSF1 = mockGamePoint(1, 5, 3);
    // SF2 result: Comp 40 wins (2 - 6)
    const gpSF2 = mockGamePoint(2, 2, 6);

    const pairings = [sf1, sf2];
    const results = [gpSF1, gpSF2];

    const result = calcNextFinalRound(pairings, results, 20);

    // Should generate the final pairing (round = -1, groupID = -1)
    expect(result.length).toBe(1);
    const finalPairing = result[0];

    expect(finalPairing.round).toBe(-1);
    expect(finalPairing.groupID).toBe(-1);

    // SF1 groupID = -1 (odd). Comp 10 wins, so Comp 10 should go to competitor1ID.
    expect(finalPairing.competitor1ID).toBe(10);

    // SF2 groupID = -2 (even). Comp 40 wins, so Comp 40 should go to competitor2ID.
    expect(finalPairing.competitor2ID).toBe(40);
  });
});
