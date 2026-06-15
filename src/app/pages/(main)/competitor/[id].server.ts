import { PageServerLoad } from '@analogjs/router';
import { eq } from 'drizzle-orm';
import { db, gamePoints, competitors } from '../../../../server/db';
import { PairingReads } from '../../../../server/pairing-reads';
import { TournamentStandings } from '../../../../server/tournament-standings';

export const load = async ({ params }: PageServerLoad) => {
  const id = Number(params?.['id']);
  if (!id) return { competitor: null, pairings: [], gamepoints: [], groups: [] };

  const competitor = (await db.select().from(competitors).where(eq(competitors.id, id)))[0];
  if (!competitor) {
    return { competitor: null, pairings: [], gamepoints: [], groups: [] };
  }

  const groupId = competitor.groupID ?? 0;

  // Fetch GamePoints once and share them with the standings calc, so the page
  // doesn't scan the table twice.
  const allGps = await db.select().from(gamePoints);
  const [joinedPairings, groups] = await Promise.all([
    PairingReads.findPairings(db, { competitorId: id }),
    groupId > 0 ? TournamentStandings.getGroupsStandings(db, id, allGps) : Promise.resolve([]),
  ]);

  return {
    competitor,
    pairings: joinedPairings,
    gamepoints: allGps,
    groups,
  };
};
