import { describe, it, expect } from 'vitest';
import { toCalcCompetitor } from './calc-mappers';

describe('toCalcCompetitor', () => {
  const createdAt = new Date('2026-05-30T08:00:00.000Z');

  it('maps a fully populated competitor row', () => {
    const result = toCalcCompetitor({ id: 7, name: 'Alice', drawNumber: 3, groupID: 2, createdAt });
    expect(result).toEqual({ id: 7, name: 'Alice', drawNumber: 3, groupID: 2, diff: 0, createdAt });
  });

  it('defaults a null drawNumber to 0', () => {
    const result = toCalcCompetitor({ id: 1, name: 'Bob', drawNumber: null, groupID: 1, createdAt });
    expect(result.drawNumber).toBe(0);
  });

  it('defaults a null groupID to 0 (unassigned)', () => {
    const result = toCalcCompetitor({ id: 1, name: 'Bob', drawNumber: 1, groupID: null, createdAt });
    expect(result.groupID).toBe(0);
  });

  it('always initialises diff to 0', () => {
    const result = toCalcCompetitor({ id: 1, name: 'Bob', drawNumber: 1, groupID: 1, createdAt });
    expect(result.diff).toBe(0);
  });
});
