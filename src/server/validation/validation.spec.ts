import { describe, it, expect } from 'vitest';
import {
  idParam,
  groupsQuery,
  loginBody,
  tournamentSetupBody,
  gamePointBody,
  competitorCreateBody,
  competitorUpdateBody,
} from './schemas';

describe('input schemas', () => {
  describe('idParam', () => {
    it('coerces a numeric string to a positive int', () => {
      expect(idParam.parse({ id: '5' })).toEqual({ id: 5 });
    });
    it.each(['0', '-1', 'abc', '1.5'])('rejects %s', (id) => {
      expect(idParam.safeParse({ id }).success).toBe(false);
    });
  });

  describe('groupsQuery', () => {
    it('treats missing/empty competitorId as undefined', () => {
      expect(groupsQuery.parse({}).competitorId).toBeUndefined();
      expect(groupsQuery.parse({ competitorId: '' }).competitorId).toBeUndefined();
    });
    it('coerces a provided competitorId', () => {
      expect(groupsQuery.parse({ competitorId: '3' }).competitorId).toBe(3);
    });
  });

  describe('loginBody', () => {
    it('requires a non-empty password', () => {
      expect(loginBody.safeParse({ password: '' }).success).toBe(false);
      expect(loginBody.parse({ password: 'pw' })).toEqual({ password: 'pw' });
    });
  });

  describe('tournamentSetupBody', () => {
    const valid = {
      name: 'Cup',
      numberOfParallelGames: 2,
      minutesPerGame: 20,
      minutesAvailForGroupsPhase: 120,
      finalistCount: 8,
      tournamentStartTime: '2026-06-16T09:00:00Z',
      finalsStartTime: '2026-06-16T14:00:00Z',
      adminPassword: 'a',
      refereePassword: 'r',
    };
    it('coerces date strings to Date instances', () => {
      const parsed = tournamentSetupBody.parse(valid);
      expect(parsed.tournamentStartTime).toBeInstanceOf(Date);
      expect(parsed.finalsStartTime).toBeInstanceOf(Date);
    });
    it('rejects non-positive config values', () => {
      expect(tournamentSetupBody.safeParse({ ...valid, minutesPerGame: 0 }).success).toBe(false);
    });
    it('rejects an invalid date', () => {
      expect(tournamentSetupBody.safeParse({ ...valid, finalsStartTime: 'not-a-date' }).success).toBe(false);
    });
  });

  describe('gamePointBody', () => {
    it('accepts non-negative integer points', () => {
      expect(gamePointBody.parse({ pairingID: 1, competitor1Points: 0, competitor2Points: 7 })).toEqual({
        pairingID: 1,
        competitor1Points: 0,
        competitor2Points: 7,
      });
    });
    it.each([{ competitor1Points: -1 }, { competitor2Points: 1.5 }, { pairingID: 0 }])('rejects %o', (override) => {
      expect(
        gamePointBody.safeParse({ pairingID: 1, competitor1Points: 2, competitor2Points: 3, ...override }).success,
      ).toBe(false);
    });
  });

  describe('competitorCreateBody', () => {
    it('accepts a single name', () => {
      expect(competitorCreateBody.parse({ name: 'Alice' })).toMatchObject({ name: 'Alice' });
    });
    it('accepts a names array', () => {
      expect(competitorCreateBody.parse({ names: ['A', 'B'] })).toMatchObject({ names: ['A', 'B'] });
    });
    it('rejects a body with neither', () => {
      expect(competitorCreateBody.safeParse({}).success).toBe(false);
    });
  });

  describe('competitorUpdateBody', () => {
    it('trims the name and requires it', () => {
      expect(competitorUpdateBody.parse({ name: '  Bob  ', drawNumber: null }).name).toBe('Bob');
      expect(competitorUpdateBody.safeParse({ name: '   ', drawNumber: null }).success).toBe(false);
    });
    it('clears drawNumber for null / empty / absent', () => {
      expect(competitorUpdateBody.parse({ name: 'B', drawNumber: null }).drawNumber).toBeNull();
      expect(competitorUpdateBody.parse({ name: 'B', drawNumber: '' }).drawNumber).toBeNull();
      expect(competitorUpdateBody.parse({ name: 'B' }).drawNumber).toBeNull();
    });
    it('coerces a positive drawNumber and rejects non-positive', () => {
      expect(competitorUpdateBody.parse({ name: 'B', drawNumber: '4' }).drawNumber).toBe(4);
      expect(competitorUpdateBody.safeParse({ name: 'B', drawNumber: 0 }).success).toBe(false);
    });
  });
});
