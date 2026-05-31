import { describe, it, expect } from 'vitest';
import { parsePostponeRequest, selectPairingsToShift, shiftStartTime } from './postpone';

describe('parsePostponeRequest', () => {
  it('accepts minutes without a game number (= all games)', () => {
    const r = parsePostponeRequest(15, undefined);
    expect(r).toEqual({ ok: true, value: { minutes: 15 } });
  });

  it('accepts minutes with a game-number cut-off', () => {
    const r = parsePostponeRequest('30', '25');
    expect(r).toEqual({ ok: true, value: { minutes: 30, fromGameNumber: 25 } });
  });

  it('allows negative minutes (pull earlier / undo)', () => {
    const r = parsePostponeRequest(-30, '25');
    expect(r).toEqual({ ok: true, value: { minutes: -30, fromGameNumber: 25 } });
  });

  it('allows zero minutes (no-op)', () => {
    expect(parsePostponeRequest(0, undefined)).toEqual({ ok: true, value: { minutes: 0 } });
  });

  it('rejects non-numeric minutes', () => {
    expect(parsePostponeRequest('abc', undefined)).toEqual({ ok: false, error: 'Invalid minutes value' });
  });

  it.each([undefined, null, '', '   '])('treats %p game number as "all games"', (raw) => {
    const r = parsePostponeRequest(15, raw);
    expect(r).toEqual({ ok: true, value: { minutes: 15 } });
  });

  it('rejects a non-numeric game number', () => {
    expect(parsePostponeRequest(15, 'xx')).toEqual({ ok: false, error: 'Invalid game number' });
  });
});

describe('selectPairingsToShift', () => {
  const pairings = [
    { id: 1, gamenumber: 1 },
    { id: 2, gamenumber: 2 },
    { id: 3, gamenumber: 3 },
    { id: 4, gamenumber: 4 },
  ];

  it('excludes already-played pairings', () => {
    const result = selectPairingsToShift(pairings, [2, 4]);
    expect(result.map((p) => p.id)).toEqual([1, 3]);
  });

  it('without a cut-off, returns all not-yet-played pairings', () => {
    const result = selectPairingsToShift(pairings, []);
    expect(result.map((p) => p.id)).toEqual([1, 2, 3, 4]);
  });

  it('with a cut-off, keeps only games at or above the number', () => {
    const result = selectPairingsToShift(pairings, [], 3);
    expect(result.map((p) => p.id)).toEqual([3, 4]);
  });

  it('combines the played filter and the cut-off', () => {
    const result = selectPairingsToShift(pairings, [3], 2);
    expect(result.map((p) => p.id)).toEqual([2, 4]);
  });

  it('accepts a Set of played ids', () => {
    const result = selectPairingsToShift(pairings, new Set([1]));
    expect(result.map((p) => p.id)).toEqual([2, 3, 4]);
  });

  it('treats the cut-off as inclusive', () => {
    expect(selectPairingsToShift(pairings, [], 4).map((p) => p.id)).toEqual([4]);
  });
});

describe('shiftStartTime', () => {
  const base = new Date('2026-05-30T10:00:00.000Z');

  it('shifts forward', () => {
    expect(shiftStartTime(base, 30)).toEqual(new Date('2026-05-30T10:30:00.000Z'));
  });

  it('shifts backward for negative minutes', () => {
    expect(shiftStartTime(base, -45)).toEqual(new Date('2026-05-30T09:15:00.000Z'));
  });

  it('is a no-op for zero', () => {
    expect(shiftStartTime(base, 0)).toEqual(base);
  });

  it('round-trips: +n then -n returns the original time', () => {
    expect(shiftStartTime(shiftStartTime(base, 30), -30)).toEqual(base);
  });
});
