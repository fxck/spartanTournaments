import { describe, it, expect, beforeEach } from 'vitest';
import type { H3Event } from 'h3';
import { enforceLoginRateLimit, clearLoginRateLimit, __resetRateLimits } from './rate-limit';

// getRequestIP reads remoteAddress / x-forwarded-for off the node request, so a
// minimal event with a chosen IP is enough to separate callers in these tests.
function eventFromIp(ip: string): H3Event {
  return { context: {}, node: { req: { socket: { remoteAddress: ip }, headers: {} } } } as unknown as H3Event;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

describe('login rate limit', () => {
  beforeEach(() => __resetRateLimits());

  it('allows attempts up to the limit, then throws 429', () => {
    const event = eventFromIp('1.1.1.1');
    const now = 1_000_000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(() => enforceLoginRateLimit(event, now)).not.toThrow();
    }
    expect(() => enforceLoginRateLimit(event, now)).toThrowError(/too many login attempts/i);
  });

  it('tracks each client independently', () => {
    const a = eventFromIp('1.1.1.1');
    const b = eventFromIp('2.2.2.2');
    const now = 1_000_000;

    for (let i = 0; i < MAX_ATTEMPTS + 1; i++) tryAttempt(a, now);

    // a is now exhausted; b still has its full budget
    expect(() => enforceLoginRateLimit(a, now)).toThrowError(/429|too many/i);
    expect(() => enforceLoginRateLimit(b, now)).not.toThrow();
  });

  it('opens a fresh window once the previous one has elapsed', () => {
    const event = eventFromIp('1.1.1.1');
    const start = 1_000_000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) enforceLoginRateLimit(event, start);
    expect(() => enforceLoginRateLimit(event, start)).toThrow();

    // After the window passes, the counter resets and attempts are allowed again.
    expect(() => enforceLoginRateLimit(event, start + WINDOW_MS)).not.toThrow();
  });

  it('clearing a client resets its counter', () => {
    const event = eventFromIp('1.1.1.1');
    const now = 1_000_000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) enforceLoginRateLimit(event, now);
    clearLoginRateLimit(event);

    // Budget is restored after a successful login clears the window.
    expect(() => enforceLoginRateLimit(event, now)).not.toThrow();
  });
});

function tryAttempt(event: H3Event, now: number): void {
  try {
    enforceLoginRateLimit(event, now);
  } catch {
    // exhausted; ignored for the independence test
  }
}
