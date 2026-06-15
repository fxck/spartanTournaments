import { db, type DbOrTx } from './db';
import { competitors, pairings, gamePoints } from './db/schema';
import { toCalcCompetitor } from './db/calc-mappers';
import { calcAllMatchPoints, type CalcCompetitor, type CalcGroup } from 'calc-tournament';

type GamePointRow = typeof gamePoints.$inferSelect;

export class TournamentStandings {
  static async getGroupsStandings(
    tx: DbOrTx = db,
    competitorFilter: number = 0,
    preloadedGamePoints?: GamePointRow[],
  ): Promise<CalcGroup[]> {
    const [allComps, allPairings, allGps] = await Promise.all([
      tx.select().from(competitors),
      tx.select().from(pairings),
      preloadedGamePoints ?? tx.select().from(gamePoints),
    ]);

    const calcComps: CalcCompetitor[] = allComps.map(toCalcCompetitor);

    // Group standings count only group-phase results; finals Pairings
    // (groupID < 0) must not pollute the group ranking.
    const groupPairings = allPairings.filter((p: any) => p.groupID > 0);
    calcAllMatchPoints(calcComps, allGps, groupPairings);

    let filteredGroupId = 0;
    if (competitorFilter > 0) {
      filteredGroupId = allComps.find((c: any) => c.id === competitorFilter)?.groupID ?? 0;
    }

    const groupMap = new Map<number, CalcCompetitor[]>();
    for (const c of calcComps) {
      const groupId = c.groupID ?? 0;
      if (groupId === 0) continue; // Skip unassigned
      if (filteredGroupId > 0 && groupId !== filteredGroupId) continue;
      const group = groupMap.get(groupId) ?? [];
      group.push(c);
      groupMap.set(groupId, group);
    }

    return [...groupMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, comps]) => ({
        id,
        competitors: comps,
      }));
  }
}
