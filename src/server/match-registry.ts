import { eq, between } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { sub, add } from 'date-fns';
import { db } from './db';
import { gamePoints, pairings, competitors } from './db/schema';

export class MatchRegistry {
  static async recordGamePoint(
    tx: any = db,
    pairingID: number,
    competitor1Points: number,
    competitor2Points: number
  ) {
    const existing = await tx.select().from(gamePoints).where(eq(gamePoints.pairingID, pairingID));
    if (existing.length === 0) {
      const [created] = await tx
        .insert(gamePoints)
        .values({ competitor1Points, competitor2Points, pairingID })
        .returning();
      return created;
    }
    const [updated] = await tx
      .update(gamePoints)
      .set({ competitor1Points, competitor2Points, updatedAt: new Date() })
      .where(eq(gamePoints.pairingID, pairingID))
      .returning();
    return updated;
  }

  static async getActivePairings(tx: any = db) {
    const [details] = await tx.query.tournamentDetails.findMany({ limit: 1 });
    if (!details) return [];

    const now = new Date();
    const from = sub(now, { minutes: details.minutesPerGame });
    const to = add(now, { minutes: details.minutesPerGame });

    const c1 = alias(competitors, 'c1');
    const c2 = alias(competitors, 'c2');

    return tx
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
      .where(between(pairings.startTime, from, to))
      .orderBy(pairings.startTime, pairings.court);
  }
}
