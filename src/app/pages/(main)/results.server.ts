import { PageServerLoad } from '@analogjs/router';
import { db, pairings, gamePoints, competitors } from '../../../server/db';
import { getSession } from '../../../server/session';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const load = async ({ event }: PageServerLoad) => {
  const session = await getSession(event);
  
  const c1 = alias(competitors, 'c1');
  const c2 = alias(competitors, 'c2');

  const [allPairings, allGps] = await Promise.all([
    db
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
      .orderBy(pairings.startTime, pairings.court),
    db.select().from(gamePoints),
  ]);

  return { 
    pairings: allPairings, 
    gamepoints: allGps, 
    role: session.role ?? null 
  };
};
