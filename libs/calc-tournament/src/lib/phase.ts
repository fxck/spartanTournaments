// Owns the GroupID / round convention. A Pairing's Phase is encoded across two
// fields: `groupID`'s sign distinguishes groups (> 0) from finals (< 0), and for
// finals `round` carries the stage (-1 Final, -2 Semi, -4 Quarter, -8 Octo) while
// `|groupID|` is a bracket-slot index. Callers must not read either sign directly.
// This module is presentation-free — German wording lives in the app (`phaseLabel`).

export type FinalsStage = 'final' | 'semifinal' | 'quarterfinal' | 'octofinal' | 'ko';

export type Phase =
  | { kind: 'groups'; groupNumber: number }
  | { kind: 'finals'; stage: FinalsStage; slot: number };

export function isFinals(p: { groupID: number }): boolean {
  return p.groupID < 0;
}

export function isGroups(p: { groupID: number }): boolean {
  return p.groupID > 0;
}

function finalsStage(round: number): FinalsStage {
  switch (round) {
    case -1:
      return 'final';
    case -2:
      return 'semifinal';
    case -4:
      return 'quarterfinal';
    case -8:
      return 'octofinal';
    default:
      return 'ko';
  }
}

export function describePhase(p: { groupID: number; round: number }): Phase {
  if (isFinals(p)) {
    return { kind: 'finals', stage: finalsStage(p.round), slot: Math.abs(p.groupID) };
  }
  return { kind: 'groups', groupNumber: p.groupID };
}
