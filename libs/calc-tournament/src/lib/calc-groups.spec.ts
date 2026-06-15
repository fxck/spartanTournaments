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

  it('should sort competitors by drawNumber and distribute them evenly across the groups', () => {
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

    // Sorted order: Comp 2 (draw 1), Comp 4 (draw 2), Comp 1 (draw 3), Comp 3 (draw 4)
    // Distributed as:
    // Group 1: Comp 2 (first), then Comp 1 (third)
    // Group 2: Comp 4 (second), then Comp 3 (fourth)

    expect(result[0].competitors.map((c) => c.id)).toEqual([2, 1]);
    expect(result[1].competitors.map((c) => c.id)).toEqual([4, 3]);
  });

  it('should handle uneven distributions correctly', () => {
    const competitors = [
      mockCompetitor(1, 1),
      mockCompetitor(2, 2),
      mockCompetitor(3, 3),
      mockCompetitor(4, 4),
      mockCompetitor(5, 5),
    ];

    const result = calcGroups(competitors, 2);

    expect(result[0].competitors.length).toBe(3); // 3 competitors
    expect(result[1].competitors.length).toBe(2); // 2 competitors
  });
});
