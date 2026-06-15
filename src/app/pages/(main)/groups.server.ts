import { db } from '../../../server/db';
import { TournamentStandings } from '../../../server/tournament-standings';

export const load = async () => {
  return TournamentStandings.getGroupsStandings(db, 0);
};
