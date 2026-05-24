import { defineEventHandler, getQuery } from 'h3';
import { TournamentStandings } from '../../../tournament-standings';
import type { CalcGroup } from 'calc-tournament';

export default defineEventHandler(async (event) => {
  const { competitorId } = getQuery(event);
  return getGroups(competitorId ? Number(competitorId) : 0);
});

export async function getGroups(competitorFilter: number): Promise<CalcGroup[]> {
  return TournamentStandings.getGroupsStandings(undefined, competitorFilter);
}

