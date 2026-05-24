import { PageServerLoad } from '@analogjs/router';
import { db, pairings, gamePoints, competitors } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const load = async ({ params }: PageServerLoad) => {
  const id = Number(params?.['id']);
  if (!id) return { pairing: null, gamepoint: null };

  const c1 = alias(competitors, 'c1');
  const c2 = alias(competitors, 'c2');

  const p = (await db
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
    .where(eq(pairings.id, id)))[0];

  if (!p) {
    return { pairing: null, gamepoint: null };
  }

  const gp = (await db.select().from(gamePoints).where(eq(gamePoints.pairingID, id)))[0] ?? null;

  return { pairing: p, gamepoint: gp };
};
