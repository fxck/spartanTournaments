/**
 * Pure logic for the "postpone games" admin action. Kept free of DB/h3 so the
 * selection rules and time math can be unit-tested in isolation; the route
 * handler only does the DB reads/writes around these functions.
 */

export interface PostponeRequest {
  minutes: number;
  /** Undefined means "all not-yet-played games". */
  fromGameNumber?: number;
}

export type ParsePostponeResult = { ok: true; value: PostponeRequest } | { ok: false; error: string };

/**
 * Validate the raw request body. `minutes` may be negative (pull games earlier,
 * e.g. to undo a mistake); only non-numeric values are rejected. `fromGameNumber`
 * is optional — empty/absent means "all games".
 */
export function parsePostponeRequest(rawMinutes: unknown, rawFromGameNumber: unknown): ParsePostponeResult {
  const minutes = parseInt(String(rawMinutes), 10);
  if (isNaN(minutes)) {
    return { ok: false, error: 'Invalid minutes value' };
  }

  const hasFromGame =
    rawFromGameNumber !== undefined && rawFromGameNumber !== null && String(rawFromGameNumber).trim() !== '';
  if (!hasFromGame) {
    return { ok: true, value: { minutes } };
  }

  const fromGameNumber = parseInt(String(rawFromGameNumber), 10);
  if (isNaN(fromGameNumber)) {
    return { ok: false, error: 'Invalid game number' };
  }
  return { ok: true, value: { minutes, fromGameNumber } };
}

/** The minimal shape of a pairing the selection logic needs. */
export interface ShiftablePairing {
  id: number;
  gamenumber: number;
}

/**
 * Decide which pairings get their start time shifted: games that have NOT been
 * played yet (no result) and — when a cut-off is given — whose game number is at
 * or above it. Because the cut-off is an explicit number, the same selection with
 * negated minutes reverses a shift exactly.
 */
export function selectPairingsToShift<T extends ShiftablePairing>(
  allPairings: T[],
  playedPairingIds: Iterable<number>,
  fromGameNumber?: number,
): T[] {
  const played = playedPairingIds instanceof Set ? playedPairingIds : new Set(playedPairingIds);
  return allPairings.filter((p) => {
    if (played.has(p.id)) return false;
    if (fromGameNumber !== undefined && p.gamenumber < fromGameNumber) return false;
    return true;
  });
}

/** Shift a start time by a (possibly negative) number of minutes. */
export function shiftStartTime(startTime: Date, minutes: number): Date {
  return new Date(startTime.getTime() + minutes * 60000);
}
