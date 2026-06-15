import { PageServerLoad } from '@analogjs/router';
import { db, gamePoints } from '../../../server/db';
import { getSession } from '../../../server/session';
import { PairingReads } from '../../../server/pairing-reads';

export const load = async ({ event }: PageServerLoad) => {
  const session = await getSession(event);

  const [allPairings, allGps] = await Promise.all([PairingReads.findPairings(db), db.select().from(gamePoints)]);

  return {
    pairings: allPairings,
    gamepoints: allGps,
    role: session.role ?? null,
  };
};
