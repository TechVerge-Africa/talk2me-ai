/**
 * Cleanup Cron Endpoint
 *
 * Triggers the Supabase database cleanup function to purge stale data.
 * This keeps the database well under the 500MB free plan limit.
 *
 * Called by Vercel Cron (configured in vercel.json) every 15 minutes.
 * Protected by CRON_SECRET — only Vercel's cron runner can invoke it.
 *
 * To manually trigger locally:
 *   curl -X POST http://localhost:3000/api/cleanup \
 *     -H "Authorization: Bearer <your-CRON_SECRET>"
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ── Secret Guard ───────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // In production, CRON_SECRET must always be set
    console.error('[cleanup] CRON_SECRET environment variable is not set!');
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, '');

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Run Cleanup ────────────────────────────────────────────
  try {
    const admin = createAdminClient();

    const { error } = await admin.rpc('cleanup_stale_meeting_data');

    if (error) {
      console.error('[cleanup] RPC call failed:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    console.log('[cleanup] Stale meeting data purged successfully at', new Date().toISOString());

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cleanup] Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Cleanup failed.' }, { status: 500 });
  }
}

// Also handle GET for health checks from monitoring tools
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok', endpoint: 'cleanup-cron' });
}
