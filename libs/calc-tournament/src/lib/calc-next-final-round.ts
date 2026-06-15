import { CalcGamePoint, CalcPairing } from '../models/models';

export function calcNextFinalRound(
  finalPairings: CalcPairing[],
  results: CalcGamePoint[],
  minutesPerGame: number,
): CalcPairing[] {
  const result: CalcPairing[] = [];
  for (const pairing of finalPairings) {
    if (pairing.round === -1) continue;
    const nextRound = pairing.round / 2;
    const nextGroupID = calcNextGroupID(pairing.groupID);
    let nextPairing = finalPairings.find((p) => p.round === nextRound && p.groupID === nextGroupID);
    const pairingresult = results.find((r) => r.pairingID === pairing.id);
    if (pairingresult) {
      if (!nextPairing) {
        nextPairing = result.find((p) => p.round === nextRound && p.groupID === nextGroupID);
        if (!nextPairing) {
          nextPairing = {
            competitor1ID: 0,
            competitor2ID: 0,
            groupID: nextGroupID,
            round: nextRound,
            startTime: new Date(pairing.startTime.getTime() + minutesPerGame * 60000),
            court: Math.abs(nextGroupID),
            gamenumber: 0,
          } as CalcPairing;
          result.push(nextPairing);
        }
      } else {
        const alreadyfound = result.find((p) => p.round === nextRound && p.groupID === nextGroupID);
        if (!alreadyfound) result.push(nextPairing);
      }
      if (pairing.groupID % 2 !== 0) {
        nextPairing.competitor1ID =
          pairingresult.competitor1Points > pairingresult.competitor2Points
            ? pairing.competitor1ID
            : pairing.competitor2ID;
      } else {
        nextPairing.competitor2ID =
          pairingresult.competitor1Points > pairingresult.competitor2Points
            ? pairing.competitor1ID
            : pairing.competitor2ID;
      }
    }
  }
  return result;
}

function calcNextGroupID(groupID: number): number {
  const rest = groupID % 2;
  return (groupID + rest) / 2;
}
