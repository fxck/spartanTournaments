export function getPhaseName(round: number): string {
  switch (round) {
    case -1: return 'Finale';
    case -2: return 'Halbfinale';
    case -4: return 'Viertelfinale';
    case -8: return 'Achtelfinale';
    default: return 'KO-Runde';
  }
}
