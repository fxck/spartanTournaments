import { describe, it, expect } from 'vitest';
import { calcGroups } from './calc-groups';
import { CalcCompetitor } from '../models/models';

describe('calcGroups', () => {
  const mockCompetitor = (id: number, drawNumber: number): CalcCompetitor => ({
    id,
    name: `Comp ${id}`,
    drawNumber,
    groupID: 0,
    diff: 0,
    createdAt: new Date(),
  });

  it('should throw an error if the groupCount is greater than half of the competitors', () => {
    const competitors = [mockCompetitor(1, 1), mockCompetitor(2, 2)];

    // half of competitors is 1. If groupCount is 2, it should throw.
    expect(() => calcGroups(competitors, 2)).toThrow('too many groups for this count of competitors!');
  });

  it('should sort competitors by drawNumber and fill groups in ascending blocks', () => {
    const competitors = [
      mockCompetitor(1, 3), // Draw number 3
      mockCompetitor(2, 1), // Draw number 1
      mockCompetitor(3, 4), // Draw number 4
      mockCompetitor(4, 2), // Draw number 2
    ];

    const result = calcGroups(competitors, 2);

    expect(result.length).toBe(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);

    // Sorted ascending: Comp 2 (draw 1), Comp 4 (draw 2), Comp 1 (draw 3), Comp 3 (draw 4)
    // Block fill: Group 1 gets the lowest draws, Group 2 the highest.
    expect(result[0].competitors.map((c) => c.id)).toEqual([2, 4]);
    expect(result[1].competitors.map((c) => c.id)).toEqual([1, 3]);
  });

  it('should handle uneven distributions with the larger groups first', () => {
    const competitors = [
      mockCompetitor(1, 1),
      mockCompetitor(2, 2),
      mockCompetitor(3, 3),
      mockCompetitor(4, 4),
      mockCompetitor(5, 5),
    ];

    const result = calcGroups(competitors, 2);

    expect(result[0].competitors.length).toBe(3); // larger group first
    expect(result[1].competitors.length).toBe(2);
  });

  it('places the highest draw numbers in the smallest (last) groups', () => {
    const competitors = [];
    for (let i = 1; i <= 45; i++) competitors.push(mockCompetitor(i, i)); // draw === id

    const result = calcGroups(competitors, 7);

    // 45 / 7 -> three groups of 7 (first), four of 6.
    expect(result.map((g) => g.competitors.length)).toEqual([7, 7, 7, 6, 6, 6, 6]);

    // Every draw in the first (large) group is lower than every draw in the last group.
    const maxInFirst = Math.max(...result[0].competitors.map((c) => c.drawNumber));
    const minInLast = Math.min(...result[6].competitors.map((c) => c.drawNumber));
    expect(maxInFirst).toBeLessThan(minInLast);

    // The highest draws land in the smaller, last group (fewer games).
    expect(result[6].competitors.map((c) => c.drawNumber)).toContain(45);
    expect(result[6].competitors.every((c) => c.drawNumber > 35)).toBe(true);
  });
});
