import { db, gamePoints } from '../../../server/db';
import { PairingReads } from '../../../server/pairing-reads';

export const load = async () => {
  const [active, gamepoints] = await Promise.all([PairingReads.findActivePairings(db), db.select().from(gamePoints)]);

  return { active, gamepoints };
};
