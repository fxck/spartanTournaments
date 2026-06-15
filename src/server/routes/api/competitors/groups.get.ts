import { defineEventHandler } from 'h3';
import { TournamentStandings } from '../../../tournament-standings';
import { parseQuery, groupsQuery } from '../../../validation';
import type { CalcGroup } from 'calc-tournament';

export default defineEventHandler(async (event) => {
  const { competitorId } = parseQuery(event, groupsQuery);
  return getGroups(competitorId ?? 0);
});

export async function getGroups(competitorFilter: number): Promise<CalcGroup[]> {
  return TournamentStandings.getGroupsStandings(undefined, competitorFilter);
}
