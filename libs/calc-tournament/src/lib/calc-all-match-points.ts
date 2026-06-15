import { CalcCompetitor, CalcGamePoint, CalcPairing } from '../models/models';
import { calcMatchPoints } from './calc-match-points';
import { sortCompetitorsRanking } from './sort-competitors-ranking';
import { sortGroupWithH2H } from './sort-group-h2h';

export function calcAllMatchPoints(
  competitors: CalcCompetitor[],
  gamePoints: CalcGamePoint[],
  pairings: CalcPairing[],
) {
  for (const competitor of competitors) {
    competitor.matchPoints = 0;
    competitor.gamePoints = 0;
    competitor.diff = 0;
    competitor.pairingHistory = [];
  }
  for (const pairing of pairings) {
    const gamepoint = gamePoints.find((gp) => gp.pairingID === pairing.id);
    const competitor1 = competitors.find((c) => c.id === pairing.competitor1ID);
    const competitor2 = competitors.find((c) => c.id === pairing.competitor2ID);
    if (!competitor1 || !competitor2) continue;

    competitor1.matchPoints ??= 0;
    competitor1.gamePoints ??= 0;
    competitor1.diff ??= 0;
    competitor1.pairingHistory ??= [];
    competitor2.matchPoints ??= 0;
    competitor2.gamePoints ??= 0;
    competitor2.diff ??= 0;
    competitor2.pairingHistory ??= [];

    if (gamepoint) {
      const mp = calcMatchPoints(gamepoint);
      competitor1.gamePoints += gamepoint.competitor1Points;
      competitor1.matchPoints += mp.competitor1MatchPoints;
      competitor1.diff += gamepoint.competitor1Points - gamepoint.competitor2Points;
      competitor1.pairingHistory.push({
        opponentID: competitor2.id,
        gamePoints: gamepoint.competitor1Points,
        opponentGamePoints: gamepoint.competitor2Points,
        matchPoints: mp.competitor1MatchPoints,
        diff: gamepoint.competitor1Points - gamepoint.competitor2Points,
      });
      competitor2.gamePoints += gamepoint.competitor2Points;
      competitor2.matchPoints += mp.competitor2MatchPoints;
      competitor2.diff += gamepoint.competitor2Points - gamepoint.competitor1Points;
      competitor2.pairingHistory.push({
        opponentID: competitor1.id,
        gamePoints: gamepoint.competitor2Points,
        opponentGamePoints: gamepoint.competitor1Points,
        matchPoints: mp.competitor2MatchPoints,
        diff: gamepoint.competitor2Points - gamepoint.competitor1Points,
      });
    }
  }
  const groupedCompetitors = competitors.reduce((groups, competitor) => {
    const group = groups.get(competitor.groupID);
    if (!group) {
      groups.set(competitor.groupID, [competitor]);
    } else {
      group.push(competitor);
    }
    return groups;
  }, new Map<number, CalcCompetitor[]>());

  for (const group of groupedCompetitors.values()) {
    sortGroupWithH2H(group);
    for (let i = 0; i < group.length; i++) {
      group[i].groupRanking = i + 1;
    }
  }
  competitors.sort(sortCompetitorsRanking);
}
