import { CalcGamePoint, CalcGroup, CalcPairing } from '../models/models';
import { calcAllMatchPoints } from './calc-all-match-points';
import { calcFinalistPositions } from './calc-finals-ranking-positions';

export function calcFinals(
  groups: CalcGroup[],
  pairings: CalcPairing[],
  gamepoints: CalcGamePoint[],
  finalistcount: number,
  startTime: Date,
  numberOfParallelGames: number,
  minutesPerGame: number,
): CalcPairing[] {
  const competitors = groups.flatMap((g) => g.competitors);
  calcAllMatchPoints(competitors, gamepoints, pairings);
  const sortedFinalists = competitors.slice(0, finalistcount);
  const finalPositions = calcFinalistPositions(finalistcount);
  for (let i = 0; i < finalistcount; i++) {
    sortedFinalists[i].finalPosition = finalPositions[i];
  }
  sortedFinalists.sort((a, b) => (a.finalPosition ?? 0) - (b.finalPosition ?? 0));

  const result: CalcPairing[] = [];
  let court = 1;
  let timeOffset = 0;
  for (let i = 0; i < finalistcount; i += 2) {
    result.push({
      competitor1ID: sortedFinalists[i].id,
      competitor2ID: sortedFinalists[i + 1].id,
      court,
      groupID: -i / 2 - 1,
      round: -finalistcount / 2,
      startTime: new Date(startTime.getTime() + timeOffset * minutesPerGame * 60000),
    } as CalcPairing);
    court++;
    if (court > numberOfParallelGames) {
      court = 1;
      timeOffset++;
    }
  }
  return result;
}
