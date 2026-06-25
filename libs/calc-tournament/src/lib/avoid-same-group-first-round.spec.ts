import { describe, it, expect } from 'vitest';
import { avoidSameGroupFirstRound } from './avoid-same-group-first-round';
import { CalcCompetitor } from '../models/models';

describe('avoidSameGroupFirstRound', () => {
  // Real finalist seed order (finalPosition order) reproduced from the dev DB.
  // Only entry that matters here is the group of each finalist, in bracket order.
  const realSeedGroups = [
    3, 2, 2, 3, 2, 3, 5, 1, 6, 7, 4, 6, 5, 5, 1, 7, 2, 3, 7, 4, 7, 1, 4, 5, 4, 6, 2, 3, 1, 6, 6, 1,
  ];

  const fromGroups = (groups: number[]): CalcCompetitor[] =>
    groups.map(
      (g, i) =>
        ({ id: i + 1, name: `seed${i}`, drawNumber: i, groupID: g, diff: 0, createdAt: new Date() }) as CalcCompetitor,
    );

  const firstRoundClashes = (finalists: CalcCompetitor[]): number => {
    let n = 0;
    for (let i = 0; i + 1 < finalists.length; i += 2) {
      if (finalists[i].groupID === finalists[i + 1].groupID) n++;
    }
    return n;
  };

  it('removes the same-group first-round clash from the real dev-db bracket', () => {
    const finalists = fromGroups(realSeedGroups);
    expect(firstRoundClashes(finalists)).toBe(1); // sanity: the bug exists in the input

    avoidSameGroupFirstRound(finalists);

    expect(firstRoundClashes(finalists)).toBe(0);
    // No finalist is lost or duplicated.
    expect(finalists.map((f) => f.id).sort((a, b) => a - b)).toEqual(realSeedGroups.map((_, i) => i + 1));
  });

  it('keeps the higher seed of a clashing pair in place (minimal disruption)', () => {
    // Pair at indices 12/13 clashes (both group 5); the higher seed (index 12) must stay.
    const finalists = fromGroups(realSeedGroups);
    const higherSeedId = finalists[12].id;

    avoidSameGroupFirstRound(finalists);

    expect(finalists[12].id).toBe(higherSeedId);
  });

  it('is a no-op when no first-round pair shares a group', () => {
    const clashFree = [1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 1, 2];
    const finalists = fromGroups(clashFree);
    const before = finalists.map((f) => f.id);

    avoidSameGroupFirstRound(finalists);

    expect(finalists.map((f) => f.id)).toEqual(before);
  });

  it('resolves multiple clashes when a valid rearrangement exists', () => {
    // Three back-to-back same-group pairs.
    const groups = [1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 4, 5, 6, 7, 1, 2];
    const finalists = fromGroups(groups);
    expect(firstRoundClashes(finalists)).toBe(3);

    avoidSameGroupFirstRound(finalists);

    expect(firstRoundClashes(finalists)).toBe(0);
  });
});
