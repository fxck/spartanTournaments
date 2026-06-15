import { defineEventHandler, createError } from 'h3';
import { requireAdmin } from '../../../session';
import { CompetitorRegistry } from '../../../competitor-registry';
import { parseParams, parseBody, idParam, competitorUpdateBody } from '../../../validation';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = parseParams(event, idParam);
  const { name, drawNumber } = await parseBody(event, competitorUpdateBody);

  const result = await CompetitorRegistry.update(id, name, drawNumber);
  if (result.status === 'drawNumberClash') {
    throw createError({ statusCode: 409, statusMessage: `Losnummer ${result.drawNumber} ist bereits vergeben` });
  }
  if (result.status === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Competitor not found' });
  }
  return result.competitor;
});
