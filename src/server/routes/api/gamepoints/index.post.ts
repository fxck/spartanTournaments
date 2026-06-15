import { defineEventHandler, readBody } from 'h3';
import { requireReferee } from '../../../session';
import { MatchRegistry } from '../../../match-registry';

export default defineEventHandler(async (event) => {
  await requireReferee(event);
  const { competitor1Points, competitor2Points, pairingID } = await readBody<{
    competitor1Points: number;
    competitor2Points: number;
    pairingID: number;
  }>(event);

  return MatchRegistry.recordGamePoint(undefined, pairingID, competitor1Points, competitor2Points);
});
