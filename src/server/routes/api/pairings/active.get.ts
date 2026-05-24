import { defineEventHandler } from 'h3';
import { MatchRegistry } from '../../../match-registry';

export default defineEventHandler(async () => {
  return MatchRegistry.getActivePairings();
});

