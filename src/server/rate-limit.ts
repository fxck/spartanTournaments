import { createError, getRequestIP, type H3Event } from 'h3';

// A small in-memory, fixed-window rate limiter. This app is a single deployment
// hosting a single tournament, so a process-local map is sufficient — there is no
// second instance to coordinate with. Restarting the server clears the counters.

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10; // per window, per client

const windows = new Map<string, Window>();

function keyFor(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
}

// Count one login attempt for the caller and throw 429 once the window budget is
// spent. Call before checking credentials; pair with clearLoginRateLimit on success
// so a legitimate user who mistyped a few times is not locked out by their own login.
export function enforceLoginRateLimit(event: H3Event, now: number = Date.now()): void {
  const key = keyFor(event);
  const window = windows.get(key);

  if (!window || now >= window.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  window.count += 1;
  if (window.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((window.resetAt - now) / 1000);
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many login attempts. Please try again later.',
      data: { retryAfter },
    });
  }
}

export function clearLoginRateLimit(event: H3Event): void {
  windows.delete(keyFor(event));
}

// Test hook: drop all tracked windows so suites start from a clean slate.
export function __resetRateLimits(): void {
  windows.clear();
}
