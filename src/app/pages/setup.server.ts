import { db } from '../../server/db';

export const load = async () => {
  const [details] = await db.query.tournamentDetails.findMany({ limit: 1 });
  return { tournament: details || null };
};
