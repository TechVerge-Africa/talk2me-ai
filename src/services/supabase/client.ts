import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Credentials missing! Set NEXT_PUBLIC_SUPABASE_URL and ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

/**
 * Fetch wrapper with exponential backoff retry.
 * Automatically retries on network errors and 5xx responses.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(input, init);
      // Don't retry client errors (4xx) — only network failures and 5xx
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries - 1) {
      // Exponential backoff: 200ms, 400ms, 800ms
      await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
    }
  }
  throw lastError;
}

// Singleton — one client instance per browser tab
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'talk2me-auth-token',
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        // Throttle realtime events to 10/sec — protects the free plan's connection limit
        eventsPerSecond: 10,
      },
    },
    global: {
      // Use retry-capable fetch for resilience on flaky networks
      fetch: fetchWithRetry,
      headers: {
        'x-client-name': 'talk2me-web',
      },
    },
  },
);
