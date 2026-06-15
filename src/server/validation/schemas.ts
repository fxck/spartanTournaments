import { z } from 'zod';

// Shape validation for request inputs. Schemas cover SHAPE only — DB-dependent
// rules (name uniqueness, drawNumber clashes, "tournament already configured")
// stay in the handlers/modules that own the data. The convention documented in
// CONTEXT.md ("Zod validation in each handler") lives here.

/** Route params arrive as strings, so numeric ids are coerced. */
export const idParam = z.object({
  id: z.coerce.number({ message: 'Invalid id' }).int().positive('Invalid id'),
});

export const pairingIdParam = z.object({
  pairingID: z.coerce.number({ message: 'Invalid pairingID' }).int().positive('Invalid pairingID'),
});

export const groupsQuery = z.object({
  // Missing/empty → undefined (the handler defaults to 0, i.e. "all groups").
  competitorId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
});

export const loginBody = z.object({
  password: z.string().min(1, 'Password required'),
});

// Shared TournamentDetails config fields (setup and update overlap entirely).
const tournamentConfig = {
  name: z.string().min(1),
  numberOfParallelGames: z.number().int().positive(),
  minutesPerGame: z.number().int().positive(),
  minutesAvailForGroupsPhase: z.number().int().positive(),
  finalistCount: z.number().int().positive(),
  // Accepts ISO strings (or numbers) and yields a Date, so handlers drop `new Date()`.
  tournamentStartTime: z.coerce.date(),
  finalsStartTime: z.coerce.date(),
};

export const tournamentSetupBody = z.object({
  ...tournamentConfig,
  adminPassword: z.string().min(1),
  refereePassword: z.string().min(1),
});

export const tournamentUpdateBody = z.object({
  ...tournamentConfig,
  // Empty/absent = keep current password; only hashed when provided.
  newAdminPassword: z.string().min(1).optional(),
  newRefereePassword: z.string().min(1).optional(),
});

export const gamePointBody = z.object({
  pairingID: z.coerce.number().int().positive(),
  competitor1Points: z.number().int().nonnegative(),
  competitor2Points: z.number().int().nonnegative(),
});

// Either a single name or a bulk list. Trimming, empty-skipping and dedup remain
// in the handler (it has bespoke 400/409 messages and a created/skipped report).
export const competitorCreateBody = z
  .object({
    name: z.string().optional(),
    names: z.array(z.string()).optional(),
  })
  .refine((b) => b.name !== undefined || b.names !== undefined, { message: 'name or names required' });

export const competitorUpdateBody = z.object({
  name: z.string().trim().min(1, 'Name required'),
  // null / '' / absent clears the draw number; otherwise a positive integer.
  drawNumber: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce
      .number({ message: 'Invalid draw number' })
      .int('Invalid draw number')
      .positive('Invalid draw number')
      .nullable(),
  ),
});
