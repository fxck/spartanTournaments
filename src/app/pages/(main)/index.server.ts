import { db } from '../../../server/db';
import { PairingReads } from '../../../server/pairing-reads';

export const load = async () => {
  return PairingReads.findActivePairings(db);
};
