import { calcGroups } from './calc-groups';
import { CalcCompetitor, CalcGroup, CalcPairing, CalcTournamentDetails } from '../models/models';

interface PlanCalc {
  groups: CalcGroup[];
  countOfParallelGames: number;
  allCompetitors: CalcCompetitor[];
}

export function CalcPlan(
  allCompetitors: CalcCompetitor[],
  groups: CalcGroup[],
  details: CalcTournamentDetails,
): { rounds: CalcPairing[][]; allPairs: CalcPairing[] } {
  const calc: PlanCalc = {
    groups,
    countOfParallelGames: details.numberOfParallelGames ?? 1,
    allCompetitors,
  };
  const allPairs = calcPairsFromGroups(calc);
  for (let i = 0; i < allPairs.length; i++) {
    allPairs[i].id = i + 1;
  }

  let round: CalcPairing[] = [];
  const result: CalcPairing[][] = [];
  let i = 0;
  let gameNumber = 1;

  for (const pair of allPairs) {
    if (needNewRound(round, pair, calc)) {
      result.push(round);
      i++;
      round = [];
    }
    pair.startTime = new Date(details.tournamentStartTime.getTime() + (details.minutesPerGame ?? 0) * i * 60000);
    pair.court = round.length + 1;
    pair.gamenumber = gameNumber++;
    round.push(pair);
  }
  if (round.length >= 1) result.push(round);

  return { rounds: result, allPairs };
}

function needNewRound(round: CalcPairing[], p: CalcPairing, calc: PlanCalc): boolean {
  return (
    round.length >= calc.countOfParallelGames ||
    foundSameCompetitorInRound(p, round) ||
    pairingShouldBePlayedInNextRound(round, p, calc)
  );
}

function foundSameCompetitorInRound(p: CalcPairing, round: CalcPairing[]): boolean {
  return round.some(
    (r) =>
      r.competitor1ID === p.competitor1ID ||
      r.competitor1ID === p.competitor2ID ||
      r.competitor2ID === p.competitor1ID ||
      r.competitor2ID === p.competitor2ID,
  );
}

function pairingShouldBePlayedInNextRound(round: CalcPairing[], pairing: CalcPairing, calc: PlanCalc): boolean {
  for (const g of calc.groups) {
    const gPairings = getPairingsForGroup(g);
    if (!inPairings(pairing, gPairings)) continue;
    if (!isLastRound(g, pairing)) return false;
    if (gPairings.some((p) => inPairings(p, round))) return false;
    const gamesPerRound = getGamesPerRound(g);
    if (round.length + gamesPerRound <= calc.countOfParallelGames) return false;
    break;
  }
  return true;
}

function calcPairsFromGroups(calc: PlanCalc): CalcPairing[] {
  const allPairs: CalcPairing[] = [];
  for (const g of calc.groups) {
    allPairs.push(...getPairingsForGroup(g));
  }
  allPairs.sort((a, b) => {
    const roundDiff = a.round - b.round;
    if (roundDiff !== 0) return roundDiff;
    const groupDiff = a.groupID - b.groupID;
    if (groupDiff !== 0) return groupDiff;
    const c1 = calc.allCompetitors.find((c) => c.id === a.competitor1ID);
    const c2 = calc.allCompetitors.find((c) => c.id === b.competitor1ID);
    return (c1?.drawNumber ?? 0) - (c2?.drawNumber ?? 0);
  });
  return allPairs;
}

function inPairings(p: CalcPairing, ps: CalcPairing[]): boolean {
  return ps.some(
    (mp) => mp.competitor1ID === p.competitor1ID && mp.competitor2ID === p.competitor2ID && mp.round === p.round,
  );
}

export function getPairingsForGroup(g: CalcGroup): CalcPairing[] {
  const result: CalcPairing[] = [];
  if (g.competitors.length === 0) return result;
  const cs = g.competitors;
  let newCompetitors: CalcCompetitor[] = JSON.parse(JSON.stringify(cs));

  if (cs.length % 2 > 0) {
    newCompetitors.push({ name: '', id: -1, drawNumber: -1, groupID: -1 } as CalcCompetitor);
  }
  if (newCompetitors.length > 1) newCompetitors.shift();
  if (newCompetitors.length > 1) {
    newCompetitors = [...newCompetitors.slice(1), newCompetitors[0]];
  }
  const c1 = cs[0];
  for (let i = 0; i < newCompetitors.length; i++) {
    addToResult(newCompetitors, result, c1.id, i, g.id);
    newCompetitors = [...newCompetitors.slice(1), newCompetitors[0]];
  }
  result.sort((a, b) => {
    const roundDiff = a.round - b.round;
    if (roundDiff !== 0) return roundDiff;
    const groupDiff = a.groupID - b.groupID;
    if (groupDiff !== 0) return groupDiff;
    const c1 = g.competitors.find((c) => c.id === a.competitor1ID);
    const c2 = g.competitors.find((c) => c.id === b.competitor1ID);
    return (c1?.drawNumber ?? 0) - (c2?.drawNumber ?? 0);
  });
  return result;
}

function addToResult(c: CalcCompetitor[], result: CalcPairing[], c1: number, i: number, groupID: number): void {
  for (let j = 0; j < Math.floor(c.length / 2) + 1; j++) {
    if (j === 0) {
      addPair(result, c1, c[c.length - 1].id, i + 1, groupID);
    } else {
      addPair(result, c[j - 1].id, c[c.length - 1 - j].id, i + 1, groupID);
    }
  }
}

function addPair(result: CalcPairing[], c1: number, c2: number, round: number, groupID: number): void {
  if (c1 === -1 || c2 === -1) return;
  result.push({ competitor1ID: c1, competitor2ID: c2, round, groupID } as CalcPairing);
}

function isLastRound(g: CalcGroup, ap: CalcPairing): boolean {
  const p = getPairingsForGroup(g);
  return getMaxRoundOfPairings(p) === ap.round;
}

function getMaxRoundOfPairings(pairing: CalcPairing[]): number {
  return pairing.reduce((max, p) => Math.max(max, p.round), 0);
}

function getGamesPerRound(g: CalcGroup): number {
  const ps = getPairingsForGroup(g);
  const m = new Map<number, number>();
  for (const p of ps) m.set(p.round, (m.get(p.round) ?? 0) + 1);
  return m.get(1) ?? 0;
}

export function CalcMostGamesPerCompetitorPlan(
  competitors: CalcCompetitor[],
  details: CalcTournamentDetails,
): { groups: CalcGroup[]; pairings: CalcPairing[] } {
  let groups: CalcGroup[] = [];
  let pairings: CalcPairing[] = [];
  for (let i = 1; i < competitors.length / 2; i++) {
    try {
      groups = calcGroups(competitors, i);
      const plan = CalcPlan(competitors, groups, details);
      pairings = plan.allPairs;
      if (plan.rounds.length * (details.minutesPerGame ?? 0) <= (details.minutesAvailForGroupsPhase ?? 0)) break;
    } catch {
      return { groups: [], pairings: [] };
    }
  }
  return { groups, pairings };
}
