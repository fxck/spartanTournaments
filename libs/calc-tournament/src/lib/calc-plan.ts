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
  const lanes = details.numberOfParallelGames ?? 1;
  const minutesPerGame = details.minutesPerGame ?? 0;
  const startMs = details.tournamentStartTime.getTime();

  const calc: PlanCalc = { groups, countOfParallelGames: lanes, allCompetitors };
  const allPairs = calcPairsFromGroups(calc);
  for (let i = 0; i < allPairs.length; i++) {
    allPairs[i].id = i + 1;
  }

  const drawOf = new Map<number, number>();
  for (const c of allCompetitors) drawOf.set(c.id, c.drawNumber ?? 0);
  // A game's draw key is the highest draw number it contains: games involving a
  // high-draw team are scheduled later in the first round (#4, soft preference).
  const drawKey = (p: CalcPairing): number =>
    Math.max(drawOf.get(p.competitor1ID) ?? 0, drawOf.get(p.competitor2ID) ?? 0);

  // Last round of every group must stay within a single time slot (no split).
  const lastRoundOfGroup = new Map<number, number>();
  const lastRoundCount = new Map<number, number>();
  for (const g of groups) {
    const ps = getPairingsForGroup(g);
    const maxRound = getMaxRoundOfPairings(ps);
    lastRoundOfGroup.set(g.id, maxRound);
    lastRoundCount.set(g.id, ps.filter((p) => p.round === maxRound).length);
  }
  const isLastRoundPair = (p: CalcPairing): boolean => lastRoundOfGroup.get(p.groupID) === p.round;

  // Remaining games per group drives packing priority: groups with the most games
  // left get scheduled first, so large groups don't pile up into a lonely tail (#1).
  const remainingByGroup = new Map<number, number>();
  for (const p of allPairs) remainingByGroup.set(p.groupID, (remainingByGroup.get(p.groupID) ?? 0) + 1);

  const remaining = new Set(allPairs);
  const result: CalcPairing[][] = [];
  let gameNumber = 1;
  let slotIndex = 0;

  while (remaining.size > 0) {
    const slot: CalcPairing[] = [];
    const used = new Set<number>();
    const lastRoundStarted = new Set<number>();
    const firstSlot = slotIndex === 0;

    while (slot.length < lanes) {
      const freeLanes = lanes - slot.length;
      let best: CalcPairing | null = null;
      let bestKey: number[] | null = null;

      for (const p of remaining) {
        if (used.has(p.competitor1ID) || used.has(p.competitor2ID)) continue;
        // Don't open a group's last round unless it fits entirely in this slot.
        // Only enforced when the round can fit in a slot at all (otherwise a split
        // is unavoidable and skipping it forever would deadlock the scheduler).
        if (isLastRoundPair(p) && !lastRoundStarted.has(p.groupID)) {
          const count = lastRoundCount.get(p.groupID) ?? 0;
          if (count <= lanes && count > freeLanes) continue;
        }
        const key = firstSlot
          ? [p.round, drawKey(p), p.groupID]
          : [-(remainingByGroup.get(p.groupID) ?? 0), p.round, drawKey(p), p.groupID];
        if (bestKey === null || lexLess(key, bestKey)) {
          best = p;
          bestKey = key;
        }
      }

      if (!best) break;

      remaining.delete(best);
      used.add(best.competitor1ID);
      used.add(best.competitor2ID);
      if (isLastRoundPair(best)) lastRoundStarted.add(best.groupID);
      remainingByGroup.set(best.groupID, (remainingByGroup.get(best.groupID) ?? 1) - 1);
      best.startTime = new Date(startMs + minutesPerGame * slotIndex * 60000);
      best.court = slot.length + 1;
      best.gamenumber = gameNumber++;
      slot.push(best);
    }

    result.push(slot);
    slotIndex++;
  }

  return { rounds: result, allPairs };
}

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
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

function getMaxRoundOfPairings(pairing: CalcPairing[]): number {
  return pairing.reduce((max, p) => Math.max(max, p.round), 0);
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
