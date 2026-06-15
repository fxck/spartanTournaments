import { createError, getQuery, getRouterParams, readBody, type H3Event } from 'h3';
import type { ZodSchema } from 'zod';

// The validation seam: parse an input against a schema, or throw a 400 carrying the
// schema's own message. Handlers swap readBody<T>()/getRouterParam() for these so bad
// input fails at the edge instead of reaching the DB.

function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw createError({ statusCode: 400, statusMessage: message });
  }
  return result.data;
}

export async function parseBody<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  return parseOrThrow(schema, await readBody(event));
}

export function parseParams<T>(event: H3Event, schema: ZodSchema<T>): T {
  return parseOrThrow(schema, getRouterParams(event));
}

export function parseQuery<T>(event: H3Event, schema: ZodSchema<T>): T {
  return parseOrThrow(schema, getQuery(event));
}
