import { defineEventHandler } from 'h3';

// Liveness/readiness probe for the Zerops health & readiness checks.
// Intentionally cheap and DB-free: the DB is shared across containers, so a
// DB-touching probe would mark every container unhealthy on a single DB blip
// (correlated restart storm). DB reachability is gated at boot by the
// drizzle-kit migrate init command instead.
export default defineEventHandler(() => ({ status: 'ok' }));
