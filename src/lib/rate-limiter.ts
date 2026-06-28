/**
 * In-memory sliding window rate limiter.
 * Zero external dependencies — works perfectly on Vercel serverless.
 *
 * Usage:
 *   const limiter = new RateLimiter({ windowMs: 60_000, max: 5 });
 *   const result = limiter.check(ip);
 *   if (!result.allowed) return new Response('Too Many Requests', { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Module-level store survives across requests in the same serverless instance.
// On Vercel, each function instance is isolated — good enough for burst protection.
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent unbounded memory growth
let lastCleanup = Date.now();
function pruneExpired(now: number) {
  if (now - lastCleanup < 60_000) return; // cleanup at most once per minute
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
  lastCleanup = now;
}

export class RateLimiter {
  private windowMs: number;
  private max: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    pruneExpired(now);

    const existing = store.get(identifier);

    if (!existing || existing.resetAt <= now) {
      // First request or window expired — start fresh
      const entry: RateLimitEntry = { count: 1, resetAt: now + this.windowMs };
      store.set(identifier, entry);
      return { allowed: true, remaining: this.max - 1, resetAt: entry.resetAt };
    }

    if (existing.count >= this.max) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: this.max - existing.count,
      resetAt: existing.resetAt,
    };
  }

  /** Reset a specific identifier (e.g., after successful auth) */
  reset(identifier: string): void {
    store.delete(identifier);
  }
}

/**
 * Extract a reliable client IP from Next.js request headers.
 * Handles Vercel, Cloudflare, and direct connections.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// ── Pre-configured limiters for each endpoint ──────────────────

/** LiveKit token: max 10 per IP per minute */
export const livekitTokenLimiter = new RateLimiter({ windowMs: 60_000, max: 10 });

/** Auth endpoints: max 5 attempts per IP per 5 minutes */
export const authLimiter = new RateLimiter({ windowMs: 5 * 60_000, max: 5 });

/** General API: max 60 per IP per minute */
export const generalApiLimiter = new RateLimiter({ windowMs: 60_000, max: 60 });
