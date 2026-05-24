import { db } from './db';
import { competitors, pairings, gamePoints } from './db/schema';
import { calcAllMatchPoints, type CalcCompetitor, type CalcGroup } from 'calc-tournament';

export class TournamentStandings {
  static async getGroupsStandings(
    tx: any = db,
    competitorFilter: number = 0
  ): Promise<CalcGroup[]> {
    const [allComps, allPairings, allGps] = await Promise.all([
      tx.select().from(competitors),
      tx.select().from(pairings),
      tx.select().from(gamePoints),
    ]);

    const calcComps: CalcCompetitor[] = allComps.map((c: any) => ({
      id: c.id,
      name: c.name,
      drawNumber: c.drawNumber ?? 0,
      groupID: c.groupID ?? 0,
      createdAt: c.createdAt,
      diff: 0,
    }));

    calcAllMatchPoints(calcComps, allGps, allPairings);

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
