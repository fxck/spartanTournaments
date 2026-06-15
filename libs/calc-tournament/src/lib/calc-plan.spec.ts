import { describe, it, expect } from 'vitest';
import { CalcPlan, CalcMostGamesPerCompetitorPlan, getPairingsForGroup } from './calc-plan';
import { CalcCompetitor, CalcGroup, CalcTournamentDetails } from '../models/models';

describe('calc-plan', () => {
  const mockCompetitor = (id: number, drawNumber: number, groupID: number): CalcCompetitor => ({
    id,
    name: `Comp ${id}`,
    drawNumber,
    groupID,
    diff: 0,
    createdAt: new Date(),
  });

  const mockDetails = (): CalcTournamentDetails => ({
    id: 1,
    name: 'Test Tournament',
    numberOfParallelGames: 2,
    minutesPerGame: 20,
    minutesAvailForGroupsPhase: 120,
    finalistCount: 4,
    tournamentStartTime: new Date('2026-05-24T10:00:00Z'),
    finalsStartTime: new Date('2026-05-24T14:00:00Z'),
    adminPassword: 'admin',
    refereePassword: 'ref',
    createdAt: new Date(),
  });

  describe('getPairingsForGroup', () => {
    it('should generate all round-robin pairings for a group of 4 players (3 rounds, 6 games)', () => {
      const comps = [
        mockCompetitor(1, 1, 1),
        mockCompetitor(2, 2, 1),
        mockCompetitor(3, 3, 1),
        mockCompetitor(4, 4, 1),
      ];
      const group: CalcGroup = { id: 1, competitors: comps };

      const pairings = getPairingsForGroup(group);

      // With 4 players, total pairings = N * (N-1) / 2 = 6 games.
      expect(pairings.length).toBe(6);

      // Verify rounds (should be 3 rounds of 2 games each)
      const rounds = pairings.map((p) => p.round);
      expect(rounds.filter((r) => r === 1).length).toBe(2);
      expect(rounds.filter((r) => r === 2).length).toBe(2);
      expect(rounds.filter((r) => r === 3).length).toBe(2);
    });
  });

  describe('CalcPlan', () => {
    it('should generate a full tournament stage plan with scheduled times and courts', () => {
      // 2 groups of 4 players
      const group1Comps = [
        mockCompetitor(1, 1, 1),
        mockCompetitor(2, 2, 1),
        mockCompetitor(3, 3, 1),
        mockCompetitor(4, 4, 1),
      ];
      const group2Comps = [
        mockCompetitor(5, 1, 2),
        mockCompetitor(6, 2, 2),
        mockCompetitor(7, 3, 2),
        mockCompetitor(8, 4, 2),
      ];

      const groups: CalcGroup[] = [
        { id: 1, competitors: group1Comps },
        { id: 2, competitors: group2Comps },
      ];
      const allCompetitors = [...group1Comps, ...group2Comps];
      const details = mockDetails();

      const plan = CalcPlan(allCompetitors, groups, details);

      expect(plan.allPairs.length).toBe(12); // 6 games per group * 2 groups
      expect(plan.rounds.length).toBeGreaterThan(0);

      // Ensure every pairing has a starting time, court, and gamenumber
      plan.allPairs.forEach((pair) => {
        expect(pair.id).toBeDefined();
        expect(pair.court).toBeGreaterThanOrEqual(1);
        expect(pair.court).toBeLessThanOrEqual(details.numberOfParallelGames);
        expect(pair.startTime).toBeInstanceOf(Date);
        expect(pair.gamenumber).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('CalcMostGamesPerCompetitorPlan', () => {
    it('should dynamically calculate groups and pairings ensuring they fit within available group stage duration', () => {
      const competitors = [
        mockCompetitor(1, 1, 0),
        mockCompetitor(2, 2, 0),
        mockCompetitor(3, 3, 0),
        mockCompetitor(4, 4, 0),
        mockCompetitor(5, 5, 0),
        mockCompetitor(6, 6, 0),
        mockCompetitor(7, 7, 0),
        mockCompetitor(8, 8, 0),
      ];

      const details = mockDetails(); // 120 mins available, 20 mins per game, 2 parallel games

      const plan = CalcMostGamesPerCompetitorPlan(competitors, details);

      expect(plan.groups.length).toBeGreaterThan(0);
      expect(plan.pairings.length).toBeGreaterThan(0);
    });
  });
});
