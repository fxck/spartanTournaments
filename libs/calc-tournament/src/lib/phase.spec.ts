import { describe, it, expect } from 'vitest';
import { describePhase, isFinals, isGroups, type Phase } from './phase';

describe('phase convention', () => {
  describe('isGroups / isFinals', () => {
    it('classifies by the sign of groupID', () => {
      expect(isGroups({ groupID: 3 })).toBe(true);
      expect(isFinals({ groupID: 3 })).toBe(false);
      expect(isFinals({ groupID: -2 })).toBe(true);
      expect(isGroups({ groupID: -2 })).toBe(false);
    });
  });

  describe('describePhase — groups', () => {
    it('returns the group number from a positive groupID, ignoring round', () => {
      expect(describePhase({ groupID: 4, round: 2 })).toEqual({
        kind: 'groups',
        groupNumber: 4,
      } satisfies Phase);
    });
  });

  describe('describePhase — finals', () => {
    it.each([
      [-1, 'final'],
      [-2, 'semifinal'],
      [-4, 'quarterfinal'],
      [-8, 'octofinal'],
    ] as const)('maps round %i to stage %s', (round, stage) => {
      const phase = describePhase({ groupID: -1, round });
      expect(phase).toMatchObject({ kind: 'finals', stage });
    });

    it('uses |groupID| as the bracket slot, independent of stage', () => {
      // slot comes from groupID magnitude (-1, -2, -3, …), not from round
      expect(describePhase({ groupID: -3, round: -8 })).toEqual({
        kind: 'finals',
        stage: 'octofinal',
        slot: 3,
      } satisfies Phase);
    });

    it("falls back to 'ko' for a negative round outside the ladder", () => {
      expect(describePhase({ groupID: -1, round: -16 })).toMatchObject({
        kind: 'finals',
        stage: 'ko',
      });
    });
  });
});
