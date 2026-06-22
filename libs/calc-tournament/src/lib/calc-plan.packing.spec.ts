import { describe, it, expect } from 'vitest';
import { CalcPlan, getPairingsForGroup } from './calc-plan';
import { calcGroups } from './calc-groups';
import { CalcCompetitor, CalcGroup, CalcPairing, CalcTournamentDetails } from '../models/models';

/**
 * Tests for the schedule packer (features #1 lane-utilisation and #4 draw-number
 * ordering of the first round).
 */
describe('CalcPlan packing', () => {
  const makeCompetitors = (count: number): CalcCompetitor[] => {
    const cs: CalcCompetitor[] = [];
    for (let i = 1; i <= count; i++) {
      cs.push({ id: i, name: `Team ${i}`, drawNumber: i, groupID: 0, diff: 0, createdAt: new Date() } as CalcCompetitor);
    }
    return cs;
  };

  const makeDetails = (lanes: number): CalcTournamentDetails =>
    ({
      id: 1,
      name: 'T',
      numberOfParallelGames: lanes,
      minutesPerGame: 25,
      minutesAvailForGroupsPhase: 600,
      finalistCount: 16,
      tournamentStartTime: new Date('2026-06-22T13:00:00Z'),
      finalsStartTime: new Date('2026-06-22T16:45:00Z'),
      adminPassword: 'a',
      refereePassword: 'r',
      createdAt: new Date(),
    }) as CalcTournamentDetails;

  // Group the scheduled pairings by their assigned time slot (startTime).
  const slotsOf = (pairs: CalcPairing[]): CalcPairing[][] => {
    const m = new Map<number, CalcPairing[]>();
    for (const p of pairs) {
      const k = p.startTime.getTime();
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  };

  describe('correctness invariants', () => {
    it('keeps the full round-robin and never double-books a competitor in a slot', () => {
      const competitors = makeCompetitors(45);
      const groups = calcGroups(competitors, 7);
      const details = makeDetails(16);

      const plan = CalcPlan(competitors, groups, details);

      // Total games == sum of each group's round-robin games.
      const expectedGames = groups.reduce((sum, g) => sum + getPairingsForGroup(g).length, 0);
      expect(plan.allPairs.length).toBe(expectedGames);

      // Court within range, every pairing scheduled.
      for (const p of plan.allPairs) {
        expect(p.court).toBeGreaterThanOrEqual(1);
        expect(p.court).toBeLessThanOrEqual(details.numberOfParallelGames);
        expect(p.startTime).toBeInstanceOf(Date);
      }

      // No competitor appears twice in the same time slot.
      for (const slot of slotsOf(plan.allPairs)) {
        const seen = new Set<number>();
        for (const p of slot) {
          expect(seen.has(p.competitor1ID)).toBe(false);
          expect(seen.has(p.competitor2ID)).toBe(false);
          seen.add(p.competitor1ID);
          seen.add(p.competitor2ID);
        }
      }
    });
  });

  describe('#1 lane utilisation', () => {
    it('packs 45 teams / 7 groups / 16 lanes into the minimum number of slots', () => {
      const competitors = makeCompetitors(45);
      const groups = calcGroups(competitors, 7);
      const details = makeDetails(16);

      const plan = CalcPlan(competitors, groups, details);
      const slots = slotsOf(plan.allPairs);

      // 123 games / 16 lanes -> 8 slots is the lower bound.
      expect(slots.length).toBe(8);
    });

    it('leaves no idle lanes before the last slot (no lonely tail round)', () => {
      const competitors = makeCompetitors(45);
      const groups = calcGroups(competitors, 7);
      const details = makeDetails(16);

      const plan = CalcPlan(competitors, groups, details);
      const slots = slotsOf(plan.allPairs);

      // Every slot except the last must be completely full.
      for (let i = 0; i < slots.length - 1; i++) {
        expect(slots[i].length).toBe(details.numberOfParallelGames);
      }
    });
  });

  describe('#4 first round follows draw number (soft, packing first)', () => {
    it('keeps the highest-draw first-round games for the later slot', () => {
      const competitors = makeCompetitors(45);
      const groups = calcGroups(competitors, 7);
      const details = makeDetails(16);
      const drawOf = new Map(competitors.map((c) => [c.id, c.drawNumber]));
      // A round-1 game is "high" if it contains a high-draw team.
      const drawKey = (p: CalcPairing) => Math.max(drawOf.get(p.competitor1ID) ?? 0, drawOf.get(p.competitor2ID) ?? 0);

      const plan = CalcPlan(competitors, groups, details);
      const slots = slotsOf(plan.allPairs);

      const firstRound = (slot: CalcPairing[]) => slot.filter((p) => p.round === 1 && p.groupID > 0);
      const slot1Keys = firstRound(slots[0]).map(drawKey);
      const laterKeys = slots.slice(1).flatMap((s) => firstRound(s).map(drawKey));

      // Round 1 spills into a later slot; the spilled games must be the higher-draw ones.
      expect(laterKeys.length).toBeGreaterThan(0);
      expect(Math.max(...slot1Keys)).toBeLessThanOrEqual(Math.min(...laterKeys));
    });
  });
});
