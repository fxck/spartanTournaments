import { PageServerLoad } from '@analogjs/router';
import { db, pairings, gamePoints, competitors } from '../../../../server/db';
import { getGroups } from '../../../../server/routes/api/competitors/groups.get';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const load = async ({ event, params }: PageServerLoad) => {
  const id = Number(params?.['id']);
  if (!id) return { competitor: null, pairings: [], gamepoints: [], groups: [] };

  const c1 = alias(competitors, 'c1');
  const c2 = alias(competitors, 'c2');

  const [allComps, allPairings, allGps, groups] = await Promise.all([
    db.select().from(competitors),
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
      .innerJoin(c1, eq(pairings.competitor1ID, c1.id))
      .innerJoin(c2, eq(pairings.competitor2ID, c2.id))
      .orderBy(pairings.startTime, pairings.court),
    db.select().from(gamePoints),
    getGroups(id),
  ]);

  const competitor = allComps.find((c) => c.id === id);

  return {
    competitor: competitor ?? null,
    pairings: allPairings,
    gamepoints: allGps,
    groups,
  };
};
