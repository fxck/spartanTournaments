import { and, eq, ne } from 'drizzle-orm';
import { db, type DbOrTx } from './db';
import { competitors } from './db/schema';

type CompetitorRow = typeof competitors.$inferSelect;

export interface ImportResult {
  created: CompetitorRow[];
  skipped: string[];
}

export type UpdateResult =
  | { status: 'updated'; competitor: CompetitorRow }
  | { status: 'drawNumberClash'; drawNumber: number }
  | { status: 'notFound' };

// Owns competitor write rules: name dedup on import, draw-number uniqueness on
// update, and deletion. Returns structured results (never HTTP errors) so the rules
// are testable through the interface; handlers map outcomes to status codes.
export class CompetitorRegistry {
  /**
   * Import competitor names. Trims each, skips blanks, and skips names that are
   * duplicated within the batch or already taken (case-insensitive). Returns the
   * created rows and the (non-blank) names that were skipped as duplicates.
   */
  static async importNames(names: string[], tx: DbOrTx = db): Promise<ImportResult> {
    const existing = await tx.select({ name: competitors.name }).from(competitors);
    const taken = new Set(existing.map((c) => c.name.trim().toLowerCase()));

    const seen = new Set<string>();
    const fresh: string[] = [];
    const skipped: string[] = [];
    for (const raw of names) {
      const name = raw?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (taken.has(key) || seen.has(key)) {
        skipped.push(name);
        continue;
      }
      seen.add(key);
      fresh.push(name);
    }

    const created = fresh.length
      ? await tx
          .insert(competitors)
          .values(fresh.map((name) => ({ name })))
          .returning()
      : [];
    return { created, skipped };
  }

  /**
   * Rename a Competitor and set/clear its draw number. A draw number identifies a
   * Competitor in the bracket, so it must stay unique across the others.
   */
  static async update(id: number, name: string, drawNumber: number | null, tx: DbOrTx = db): Promise<UpdateResult> {
    if (drawNumber != null) {
      const [clash] = await tx
        .select({ id: competitors.id })
        .from(competitors)
        .where(and(eq(competitors.drawNumber, drawNumber), ne(competitors.id, id)));
      if (clash) return { status: 'drawNumberClash', drawNumber };
    }

    const [updated] = await tx.update(competitors).set({ name, drawNumber }).where(eq(competitors.id, id)).returning();
    return updated ? { status: 'updated', competitor: updated } : { status: 'notFound' };
  }

  static async remove(id: number, tx: DbOrTx = db): Promise<{ ok: true }> {
    await tx.delete(competitors).where(eq(competitors.id, id));
    return { ok: true };
  }
}
