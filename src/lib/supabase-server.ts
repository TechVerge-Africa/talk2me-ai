/**
 * Server-only Supabase admin client.
 * Uses the SERVICE_ROLE key — bypasses RLS completely.
 *
 * ⚠️  NEVER import this in client components or pages.
 *    Only use in: API route handlers, server actions, server components.
 *
 * The `server-only` import will cause a build error if this file
 * is accidentally imported in a client component.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  // This will surface at build time during static analysis
  console.error(
    '[supabase-server] FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Server-side Supabase operations will fail.'
  );
}

/**
 * Creates a new admin Supabase client for each request.
 * A new instance per request is correct for server-side usage — no shared state.
 */
export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: { schema: 'public' },
  });
}

/**
 * Verifies a JWT token server-side and returns the authenticated user.
 * Used in API routes to validate the caller's identity.
 */
export async function verifyAuthToken(bearerToken: string | null) {
  if (!bearerToken) return null;
  const token = bearerToken.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  // Use anon key client with the user's token for proper auth verification
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}
