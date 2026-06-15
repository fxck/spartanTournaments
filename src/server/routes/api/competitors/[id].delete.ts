import { defineEventHandler } from 'h3';
import { requireAdmin } from '../../../session';
import { CompetitorRegistry } from '../../../competitor-registry';
import { parseParams, idParam } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = parseParams(event, idParam);

  return CompetitorRegistry.remove(id);
});
