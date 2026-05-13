import { PageServerLoad } from '@analogjs/router';
import { getGroups } from '../../../server/routes/api/competitors/groups.get';

export const load = async ({ event }: PageServerLoad) => {
  return getGroups(0);
};
