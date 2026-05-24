import { eq, inArray, lt } from 'drizzle-orm';
import { db } from './db';
import { competitors, pairings, gamePoints } from './db/schema';
import { TournamentStandings } from './tournament-standings';
import {
  CalcMostGamesPerCompetitorPlan,
  calcFinals,
  calcNextFinalRound,
  type CalcCompetitor,
  type CalcTournamentDetails
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
        allCompetitors.map((c) => ({ ...c, drawNumber: c.drawNumber ?? 0, groupID: c.groupID ?? 0, diff: 0 }) as CalcCompetitor),
        details as unknown as CalcTournamentDetails
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
          }))
        );
      }

      await Promise.all(
        plan.groups.flatMap((group) =>
          group.competitors.map((c) =>
            tx.update(competitors).set({ groupID: group.id }).where(eq(competitors.id, c.id))
          )
        )
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
        details.minutesPerGame
      );

      const finalsPairingIds = allPairings.filter((p) => p.groupID < 0).map((p) => p.id);
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
          }))
        );
      }
    });
  }

  static async advanceFinalsRound(): Promise<void> {
    await db.transaction(async (tx) => {
      const finalsPairings = (await tx.select().from(pairings)).filter((p) => p.groupID < 0);
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
              })
        )
      );
    });
  }
}
