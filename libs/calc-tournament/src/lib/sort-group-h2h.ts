import { CalcCompetitor } from '../models/models';

export function sortGroupWithH2H(competitors: CalcCompetitor[]): CalcCompetitor[] {
  // 1. Pre-sort by matchPoints (highest first)
  competitors.sort((a, b) => (b.matchPoints ?? 0) - (a.matchPoints ?? 0));

  // 2. Identify subgroups with identical matchPoints
  let i = 0;
  while (i < competitors.length) {
    let j = i + 1;
    while (j < competitors.length && (competitors[j].matchPoints ?? 0) === (competitors[i].matchPoints ?? 0)) {
      j++;
    }

    const tiedCount = j - i;
    if (tiedCount > 1) {
      const tiedSubgroup = competitors.slice(i, j);

      if (tiedCount === 2) {
        // --- 2 Teams tied on matchPoints: Direct Head-to-Head has absolute priority! ---
        const teamA = tiedSubgroup[0];
        const teamB = tiedSubgroup[1];
        resolveTwoWayTie(competitors, i, teamA, teamB);
      } else {
        // --- 3+ Teams tied on matchPoints: Sort by diff/gamePoints first ---
        tiedSubgroup.sort(sortByDiffAndGamePoints);

        // After sorting, find subgroups that are STILL completely tied on both diff and gamePoints
        let k = 0;
        while (k < tiedSubgroup.length) {
          let l = k + 1;
          while (
            l < tiedSubgroup.length &&
            (tiedSubgroup[l].diff ?? 0) === (tiedSubgroup[k].diff ?? 0) &&
            (tiedSubgroup[l].gamePoints ?? 0) === (tiedSubgroup[k].gamePoints ?? 0)
          ) {
            l++;
          }

          const stillTiedCount = l - k;
          if (stillTiedCount === 2) {
            // Exactly 2 of the 3+ teams are still completely tied on diff and gamePoints!
            // Apply H2H as a fallback to resolve their order
            const teamA = tiedSubgroup[k];
            const teamB = tiedSubgroup[k + 1];

            const directMatch = teamA.pairingHistory?.find((p) => p.opponentID === teamB.id);
            let score = 0;
            if (directMatch) {
              score = directMatch.gamePoints - directMatch.opponentGamePoints;
            }
            if (score < 0) {
              // teamB won, swap them in the tiedSubgroup
              tiedSubgroup[k] = teamB;
              tiedSubgroup[k + 1] = teamA;
            }
          }
          k = l;
        }

        // Put the resolved tiedSubgroup back into the main array
        for (let k = 0; k < tiedCount; k++) {
          competitors[i + k] = tiedSubgroup[k];
        }
      }
    }
    i = j;
  }

  return competitors;
}

function resolveTwoWayTie(competitors: CalcCompetitor[], index: number, teamA: CalcCompetitor, teamB: CalcCompetitor) {
  const directMatch = teamA.pairingHistory?.find((p) => p.opponentID === teamB.id);

  let score = 0;
  if (directMatch) {
    score = directMatch.gamePoints - directMatch.opponentGamePoints;
  }

  if (score !== 0) {
    if (score < 0) {
      // teamB won, so swap them in main array
      competitors[index] = teamB;
      competitors[index + 1] = teamA;
    } else {
      competitors[index] = teamA;
      competitors[index + 1] = teamB;
    }
  } else {
    // If direct match was a draw, sort by overall diff and game points
    const pair = [teamA, teamB];
    pair.sort(sortByDiffAndGamePoints);
    competitors[index] = pair[0];
    competitors[index + 1] = pair[1];
  }
}

function sortByDiffAndGamePoints(a: CalcCompetitor, b: CalcCompetitor): number {
  // 1. Net point difference (highest first)
  const diffScore = (b.diff ?? 0) - (a.diff ?? 0);
  if (diffScore !== 0) return diffScore;

  // 2. Total points scored (highest first)
  const pointsScore = (b.gamePoints ?? 0) - (a.gamePoints ?? 0);
  if (pointsScore !== 0) return pointsScore;

  return 0;
}
