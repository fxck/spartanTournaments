import { PageServerLoad } from '@analogjs/router';
import { gt, inArray } from 'drizzle-orm';
import { db, pairings, gamePoints, competitors } from '../../../server/db';
import { toCalcCompetitor } from '../../../server/db/calc-mappers';
import { calcAllMatchPoints, type CalcCompetitor } from 'calc-tournament';

export const load = async ({ event }: PageServerLoad) => {
  const [allCompetitors, groupPairings] = await Promise.all([
    db.select().from(competitors).where(gt(competitors.groupID, 0)),
    db.select().from(pairings).where(gt(pairings.groupID, 0)),
  ]);

  const groupGps = groupPairings.length
    ? await db.select().from(gamePoints).where(inArray(gamePoints.pairingID, groupPairings.map((p) => p.id)))
    : [];

  const calcComps = allCompetitors.map(toCalcCompetitor);

  calcAllMatchPoints(calcComps, groupGps, groupPairings);

  const groupMap = new Map<number, CalcCompetitor[]>();
  for (const c of calcComps) {
    if (!groupMap.has(c.groupID)) groupMap.set(c.groupID, []);
    groupMap.get(c.groupID)!.push(c);
  }

  return [...groupMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, comps]) => ({ id, competitors: comps }));
};
