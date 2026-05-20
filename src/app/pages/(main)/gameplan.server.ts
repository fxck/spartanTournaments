import { PageServerLoad } from '@analogjs/router';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, pairings, competitors } from '../../../server/db';

export const load = async ({ event }: PageServerLoad) => {
  const c1 = alias(competitors, 'c1');
  const c2 = alias(competitors, 'c2');

  return db
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
    .orderBy(pairings.startTime, pairings.court);
};
