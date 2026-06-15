import { CalcGamePoint, CalcPairing } from '../models/models';

/**
 * Projects the finals bracket forward from the current results.
 *
 * For every feeder Pairing (any round except the Final, -1) this fills the slot it
 * feeds in the next round with the winner of its result — or with 0 ("Offen") when
 * that feeder has no result. Feeders are processed earliest-round-first, so clearing
 * an early slot cascades: a removed quarterfinal result empties the semifinal slot,
 * which in turn empties the final slot.
 *
 * It returns only the next-round Pairings it created or changed (each carries its
 * existing `id` when it already exists, so the caller can upsert). Downstream
 * GamePoints are never deleted here — a stale result simply has its competitors
 * cleared to 0.
 */
export function calcNextFinalRound(
  finalPairings: CalcPairing[],
  results: CalcGamePoint[],
  minutesPerGame: number,
): CalcPairing[] {
  const slotKey = (round: number, groupID: number) => `${round}:${groupID}`;

  // Mutable working set keyed by bracket slot. Cloned so we can update competitor
  // slots in place and have later (downstream) feeders observe the change.
  const bySlot = new Map<string, CalcPairing>();
  for (const p of finalPairings) bySlot.set(slotKey(p.round, p.groupID), { ...p });

  const resultFor = (pairingID: number) => results.find((r) => r.pairingID === pairingID);

  // Earliest round first: rounds are negative (-8 octo, -4 quarter, -2 semi), so
  // ascending numeric order is earliest → latest. The Final (-1) has no next round.
  const feeders = [...bySlot.values()].filter((p) => p.round !== -1).sort((a, b) => a.round - b.round);

  const touched = new Set<CalcPairing>();

  for (const feeder of feeders) {
    const nextRound = feeder.round / 2;
    const nextGroupID = calcNextGroupID(feeder.groupID);
    const key = slotKey(nextRound, nextGroupID);

    const result = resultFor(feeder.id);
    const winner = result
      ? result.competitor1Points > result.competitor2Points
        ? feeder.competitor1ID
        : feeder.competitor2ID
      : 0;

    let next = bySlot.get(key);
    if (!next) {
      // Don't materialise a next-round Pairing until at least one feeder has a result.
      if (!result) continue;
      next = {
        competitor1ID: 0,
        competitor2ID: 0,
        groupID: nextGroupID,
        round: nextRound,
        startTime: new Date(feeder.startTime.getTime() + minutesPerGame * 60000),
        court: Math.abs(nextGroupID),
        gamenumber: 0,
      } as CalcPairing;
      bySlot.set(key, next);
    }

    // Odd feeder groupID feeds competitor1 of the parent slot, even feeds competitor2.
    if (feeder.groupID % 2 !== 0) {
      next.competitor1ID = winner;
    } else {
      next.competitor2ID = winner;
    }
    touched.add(next);
  }

  return [...touched];
}

function calcNextGroupID(groupID: number): number {
  const rest = groupID % 2;
  return (groupID + rest) / 2;
}
