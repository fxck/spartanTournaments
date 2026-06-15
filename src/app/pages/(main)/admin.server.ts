import { db, competitors } from '../../../server/db';

export const load = async () => {
  const [tournament, allCompetitors] = await Promise.all([
    db.query.tournamentDetails.findFirst(),
    db.select().from(competitors).orderBy(competitors.name),
  ]);

  return {
    tournament: tournament || null,
    competitors: allCompetitors || [],
  };
};
