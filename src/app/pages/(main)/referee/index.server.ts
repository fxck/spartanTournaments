import { db, pairings, gamePoints, competitors } from '../../../../server/db';
import { eq, isNull, and, gt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const load = async () => {
  const c1 = alias(competitors, 'c1');
  const c2 = alias(competitors, 'c2');

  const openPairings = await db
    .select({
      id: pairings.id,
      gamenumber: pairings.gamenumber,
      startTime: pairings.startTime,
      court: pairings.court,
      groupID: pairings.groupID,
      round: pairings.round,
      competitor1: {
        id: c1.id,
        name: c1.name,
      },
      competitor2: {
        id: c2.id,
        name: c2.name,
      },
    })
    .from(pairings)
    .leftJoin(c1, eq(pairings.competitor1ID, c1.id))
    .leftJoin(c2, eq(pairings.competitor2ID, c2.id))
    .leftJoin(gamePoints, eq(pairings.id, gamePoints.pairingID))
    .where(
      and(
        isNull(gamePoints.id),
        gt(pairings.competitor1ID, 0),
        gt(pairings.competitor2ID, 0)
      )
    )
    .orderBy(pairings.startTime, pairings.court);

  return { pairings: openPairings };
};
