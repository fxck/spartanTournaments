import { eq, inArray, lt } from 'drizzle-orm';
import { db, type DbOrTx } from './db';
import { competitors, pairings, gamePoints } from './db/schema';
import { MatchRegistry } from './match-registry';
import { TournamentStandings } from './tournament-standings';
import {
  CalcMostGamesPerCompetitorPlan,
  calcFinals,
  calcNextFinalRound,
  isFinals,
  type CalcCompetitor,
  type CalcTournamentDetails,
} from 'calc-tournament';

export class TournamentEngine {
  static async assignRandomDraw(): Promise<void> {
    await db.transaction(async (tx) => {
      const all = await tx.select().from(competitors);
      const used = new Set<number>();

      for (const c of all) {
        let n: number;
        do {
          n = Math.floor(Math.random() * all.length * 100) + 1;
        } while (used.has(n));
        used.add(n);
        await tx.update(competitors).set({ drawNumber: n }).where(eq(competitors.id, c.id));
      }
    });
  }

  static async generateGroupsPhase(): Promise<void> {
    await db.transaction(async (tx) => {
      const allCompetitors = await tx.select().from(competitors);
      const [details] = await tx.query.tournamentDetails.findMany({ limit: 1 });
      if (!details) throw new Error('No tournament details found');

      const plan = CalcMostGamesPerCompetitorPlan(
        allCompetitors.map(
          (c) => ({ ...c, drawNumber: c.drawNumber ?? 0, groupID: c.groupID ?? 0, diff: 0 }) as CalcCompetitor,
        ),
        details as unknown as CalcTournamentDetails,
      );

      // Delete gamePoints first (avoid orphans), then all pairings
      await tx.delete(gamePoints);
      await tx.delete(pairings);

      if (plan.pairings.length > 0) {
        await tx.insert(pairings).values(
          plan.pairings.map((p) => ({
            competitor1ID: p.competitor1ID,
            competitor2ID: p.competitor2ID,
            round: p.round,
            groupID: p.groupID,
            startTime: p.startTime,
            court: p.court,
            gamenumber: p.gamenumber,
          })),
        );
      }

      await Promise.all(
        plan.groups.flatMap((group) =>
          group.competitors.map((c) =>
            tx.update(competitors).set({ groupID: group.id }).where(eq(competitors.id, c.id)),
          ),
        ),
      );
    });
  }

  static async generateFinalsPhase(): Promise<void> {
    await db.transaction(async (tx) => {
      const groups = await TournamentStandings.getGroupsStandings(tx, 0);
      const allPairings = await tx.select().from(pairings);
      const allGamePoints = await tx.select().from(gamePoints);
      const [details] = await tx.query.tournamentDetails.findMany({ limit: 1 });
      if (!details) throw new Error('No tournament details found');

      const finalPairings = calcFinals(
        groups,
        allPairings,
        allGamePoints,
        details.finalistCount,
        details.finalsStartTime,
        details.numberOfParallelGames,
        details.minutesPerGame,
      );

      const finalsPairingIds = allPairings.filter(isFinals).map((p) => p.id);
      if (finalsPairingIds.length > 0) {
        await tx.delete(gamePoints).where(inArray(gamePoints.pairingID, finalsPairingIds));
      }
      await tx.delete(pairings).where(lt(pairings.groupID, 0));

      if (finalPairings.length > 0) {
        await tx.insert(pairings).values(
          finalPairings.map((p) => ({
            competitor1ID: p.competitor1ID,
            competitor2ID: p.competitor2ID,
            round: p.round,
            groupID: p.groupID,
            startTime: p.startTime,
            court: p.court,
            gamenumber: p.gamenumber ?? 0,
          })),
        );
      }
    });
  }

  // Recompute the finals bracket from current results. Idempotent: re-running it
  // fills next-round slots from results and clears slots whose feeder lost its
  // result, so it converges from any state (used after both recording and deleting
  // a finals result). Composes into a caller transaction; opens its own when none.
  static async advanceFinalsRound(tx?: DbOrTx): Promise<void> {
    if (!tx) {
      await db.transaction((t) => this.advanceFinalsRound(t));
      return;
    }

    const finalsPairings = (await tx.select().from(pairings)).filter(isFinals);
    const allGamePoints = await tx.select().from(gamePoints);
    const [details] = await tx.query.tournamentDetails.findMany({ limit: 1 });
    if (!details) throw new Error('No tournament details found');

    const nextRound = calcNextFinalRound(finalsPairings, allGamePoints, details.minutesPerGame);

    await Promise.all(
      nextRound.map((p) =>
        p.id
          ? tx
              .update(pairings)
              .set({
                competitor1ID: p.competitor1ID,
                competitor2ID: p.competitor2ID,
                startTime: p.startTime,
                court: p.court,
              })
              .where(eq(pairings.id, p.id))
          : tx.insert(pairings).values({
              competitor1ID: p.competitor1ID,
              competitor2ID: p.competitor2ID,
              round: p.round,
              groupID: p.groupID,
              startTime: p.startTime,
              court: p.court,
              gamenumber: p.gamenumber ?? 0,
            }),
      ),
    );
  }

  // Record (upsert) a Pairing's result and, when it is a finals Pairing, advance the
  // bracket — atomically. Returns the stored GamePoint row.
  static async recordResult(pairingID: number, competitor1Points: number, competitor2Points: number) {
    return db.transaction(async (tx) => {
      const result = await MatchRegistry.recordGamePoint(tx, pairingID, competitor1Points, competitor2Points);
      const [pairing] = await tx.select().from(pairings).where(eq(pairings.id, pairingID));
      if (pairing && isFinals(pairing)) {
        await this.advanceFinalsRound(tx);
      }
      return result;
    });
  }

  // Delete a Pairing's result and, when it is a finals Pairing, recompute the bracket
  // so the propagated winner is rolled back (cascades through later rounds) — atomically.
  static async deleteResult(pairingID: number): Promise<{ ok: true }> {
    return db.transaction(async (tx) => {
      const [pairing] = await tx.select().from(pairings).where(eq(pairings.id, pairingID));
      await MatchRegistry.deleteGamePoint(tx, pairingID);
      if (pairing && isFinals(pairing)) {
        await this.advanceFinalsRound(tx);
      }
      return { ok: true };
    });
  }
}
