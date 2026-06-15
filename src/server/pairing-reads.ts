import { eq, or, and, between, gt, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { sub, add } from 'date-fns';
import { db, pairings, competitors, gamePoints, type DbOrTx } from './db';

export interface PairingFilter {
  /** Only Pairings this Competitor plays in (either side). */
  competitorId?: number;
  /** Only the single Pairing with this id. */
  pairingId?: number;
  /** Only Pairings whose startTime falls within [from, to]. */
  startTimeBetween?: { from: Date; to: Date };
  /** Only Pairings where both Competitor slots are filled (id > 0). */
  bothCompetitorsAssigned?: boolean;
  /** Only Pairings with no GamePoint recorded yet (i.e. not yet played). */
  unplayedOnly?: boolean;
}

/** A Pairing enriched with both Competitors' id and name. */
export interface PairingWithCompetitors {
  id: number;
  gamenumber: number;
  startTime: Date;
  court: number;
  groupID: number;
  round: number;
  competitor1ID: number;
  competitor2ID: number;
  // leftJoin: the whole competitor is null when the FK has no match (e.g. a
  // not-yet-filled finals slot), not merely its fields.
  competitor1: { id: number; name: string } | null;
  competitor2: { id: number; name: string } | null;
}

export class PairingReads {
  /**
   * The single Pairing-with-Competitors read. Owns the projection and the
   * double self-join onto competitors; callers vary only the filter and
   * always get the same enriched shape, ordered by startTime then court.
   */
  static async findPairings(tx: DbOrTx = db, filter: PairingFilter = {}): Promise<PairingWithCompetitors[]> {
    const c1 = alias(competitors, 'c1');
    const c2 = alias(competitors, 'c2');

    const conditions: (SQL | undefined)[] = [];
    if (filter.competitorId != null) {
      conditions.push(
        or(eq(pairings.competitor1ID, filter.competitorId), eq(pairings.competitor2ID, filter.competitorId)),
      );
    }
    if (filter.pairingId != null) {
      conditions.push(eq(pairings.id, filter.pairingId));
    }
    if (filter.startTimeBetween) {
      conditions.push(between(pairings.startTime, filter.startTimeBetween.from, filter.startTimeBetween.to));
    }
    if (filter.bothCompetitorsAssigned) {
      conditions.push(gt(pairings.competitor1ID, 0), gt(pairings.competitor2ID, 0));
    }

    let query = tx
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
      .$dynamic();

    // "Unplayed" = no GamePoint references this Pairing. The left join + IS NULL
    // keeps only Pairings with zero results, without multiplying played rows.
    if (filter.unplayedOnly) {
      query = query.leftJoin(gamePoints, eq(pairings.id, gamePoints.pairingID));
      conditions.push(isNull(gamePoints.id));
    }

    return query.where(conditions.length ? and(...conditions) : undefined).orderBy(pairings.startTime, pairings.court);
  }

  /**
   * Pairings whose startTime is within one game-length of now — the
   * "current & upcoming" window. Returns [] when no tournament exists.
   */
  static async findActivePairings(tx: DbOrTx = db): Promise<PairingWithCompetitors[]> {
    const [details] = await tx.query.tournamentDetails.findMany({ limit: 1 });
    if (!details) return [];

    const now = new Date();
    return this.findPairings(tx, {
      startTimeBetween: {
        from: sub(now, { minutes: details.minutesPerGame }),
        to: add(now, { minutes: details.minutesPerGame }),
      },
    });
  }
}
