import { PageServerLoad } from '@analogjs/router';
import { db } from '../../server/db';

export const load = async ({ event }: PageServerLoad) => {
  const [details] = await db.query.tournamentDetails.findMany({ limit: 1 });
  return { tournament: details || null };
};
