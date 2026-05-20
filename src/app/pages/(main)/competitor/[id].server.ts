import { PageServerLoad } from '@analogjs/router';
import { eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, pairings, gamePoints, competitors } from '../../../../server/db';
import { toCalcCompetitor } from '../../../../server/db/calc-mappers';
import { calcAllMatchPoints, type CalcPairing } from 'calc-tournament';

export const load = async ({ event, params }: PageServerLoad) => {
  const id = Number(params?.['id']);
  if (!id) return { competitor: null, pairings: [], gamepoints: [], groups: [] };

  const competitor = (await db.select().from(competitors).where(eq(competitors.id, id)))[0];
  if (!competitor) {
    return { competitor: null, pairings: [], gamepoints: [], groups: [] };
  }

  const c1 = alias(competitors, 'c1');
  const c2 = alias(competitors, 'c2');
  const groupId = competitor.groupID ?? 0;

  const [joinedPairings, allGps, groupComps, groupPairings] = await Promise.all([
    db
      .select({
        id: pairings.id,
        gamenumber: pairings.gamenumber,
        startTime: pairings.startTime,
        court: pairings.court,
        groupID: pairings.groupID,
        round: pairings.round,
        competitor1ID: pairings.competitor1ID,
        competitor2ID: pairings.competitor2ID,
        competitor1: { id: c1.id, name: c1.name },
        competitor2: { id: c2.id, name: c2.name },
      })
      .from(pairings)
      .leftJoin(c1, eq(pairings.competitor1ID, c1.id))
      .leftJoin(c2, eq(pairings.competitor2ID, c2.id))
      .where(or(eq(pairings.competitor1ID, id), eq(pairings.competitor2ID, id)))
      .orderBy(pairings.startTime, pairings.court),
    db.select().from(gamePoints),
    groupId > 0 ? db.select().from(competitors).where(eq(competitors.groupID, groupId)) : Promise.resolve([]),
    groupId > 0 ? db.select().from(pairings).where(eq(pairings.groupID, groupId)) : Promise.resolve([]),
  ]);

  const groups = [];
  if (groupId > 0 && groupComps.length > 0) {
    const groupPairingIds = new Set(groupPairings.map((p) => p.id));
    const groupGps = allGps.filter((gp) => groupPairingIds.has(gp.pairingID));
    const calcComps = groupComps.map(toCalcCompetitor);
    calcAllMatchPoints(calcComps, groupGps, groupPairings as CalcPairing[]);
    groups.push({ id: groupId, competitors: calcComps });
  }

  return {
    competitor,
    pairings: joinedPairings,
    gamepoints: allGps,
    groups,
  };
};
