import { describePhase, type FinalsStage } from 'calc-tournament';

const STAGE_LABEL: Record<FinalsStage, string> = {
  final: 'Finale',
  semifinal: 'Halbfinale',
  quarterfinal: 'Viertelfinale',
  octofinal: 'Achtelfinale',
  ko: 'KO-Runde',
};

/**
 * German display label for a Pairing's Phase. The groups-vs-finals split and the
 * finals stage are decoded by `describePhase` (calc-tournament); this function only
 * owns the wording.
 */
export function phaseLabel(p: { groupID: number; round: number }): string {
  const phase = describePhase(p);
  return phase.kind === 'groups' ? `Gruppe ${phase.groupNumber}` : STAGE_LABEL[phase.stage];
}
