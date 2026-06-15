import { eq } from 'drizzle-orm';
import { db, type DbOrTx } from './db';
import { gamePoints } from './db/schema';

export class MatchRegistry {
  static async recordGamePoint(
    tx: DbOrTx = db,
    pairingID: number,
    competitor1Points: number,
    competitor2Points: number,
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
}
