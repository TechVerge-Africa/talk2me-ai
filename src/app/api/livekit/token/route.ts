import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { livekitTokenLimiter, getClientIp } from '@/lib/rate-limiter';
import { validateLiveKitRoomName, validateParticipantIdentity } from '@/lib/validators';
import { verifyAuthToken, createAdminClient } from '@/lib/supabase-server';

export const runtime = 'edge';


/** LiveKit token TTL: 4 hours — long enough for a meeting, short enough to limit damage if leaked */
const TOKEN_TTL_SECONDS = 4 * 60 * 60;

export async function POST(req: NextRequest) {
  // ── 1. Rate Limiting ────────────────────────────────────────
  const ip = getClientIp(req);
  const rateCheck = livekitTokenLimiter.check(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before requesting another token.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  try {
    // ── 2. Input Parsing ──────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { roomName, participantName } = body as Record<string, unknown>;

    // ── 3. Input Validation ───────────────────────────────────
    const roomNameResult = validateLiveKitRoomName(roomName);
    if (!roomNameResult.ok) {
      return NextResponse.json({ error: roomNameResult.error }, { status: 400 });
    }

    const identityResult = validateParticipantIdentity(participantName);
    if (!identityResult.ok) {
      return NextResponse.json({ error: identityResult.error }, { status: 400 });
    }

    // ── 4. Auth Check (optional but preferred) ────────────────
    // Guest participants can join without auth, but we log the distinction.
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);
    const isAuthenticated = !!user;

    // ── 5. Room Existence & Access Check ─────────────────────
    // Prevent token farming for non-existent rooms
    const adminClient = createAdminClient();
    const { data: meeting, error: dbError } = await adminClient
      .from('meetings')
      .select('id, is_active, host_id, workspace_id, settings')
      .eq('room_code', roomNameResult.value)
      .eq('is_active', true)
      .maybeSingle();

    if (dbError) {
      console.error('[LiveKit Token API] Database error when checking meeting:', dbError);
    }

    const meetingExists = meeting !== null;

    // We allow joining even if the meeting isn't in Supabase yet
    // (e.g., host is creating it right now) — don't hard-block on this
    if (!meetingExists && !isAuthenticated) {
      // Anonymous user trying to join a non-existent room — block it
      return NextResponse.json(
        { error: 'Meeting not found or has ended.' },
        { status: 404 },
      );
    }

    // Workspace Member Access Enforcement:
    // If meeting belongs to a workspace and access is set to members_only (default for workspace meetings)
    if (meeting?.workspace_id) {
      const settings = meeting.settings as Record<string, unknown> | undefined;
      const accessLevel = (settings?.access_level as string | undefined) ?? 'members_only';
      const allowOutsiders = typeof settings?.allow_outsiders === 'boolean'
        ? settings.allow_outsiders
        : (accessLevel === 'open');

      if (!allowOutsiders && accessLevel === 'members_only') {
        if (!user) {
          return NextResponse.json(
            { error: 'This workspace meeting is restricted to workspace members. Please sign in.' },
            { status: 403 },
          );
        }

        if (meeting.host_id !== user.id) {
          const { data: member } = await adminClient
            .from('workspace_members')
            .select('id, status')
            .eq('workspace_id', meeting.workspace_id)
            .eq('user_id', user.id)
            .or('status.eq.approved,status.is.null')
            .maybeSingle();

          if (!member) {
            return NextResponse.json(
              { error: 'This meeting is restricted to members of this workspace.' },
              { status: 403 },
            );
          }
        }
      }
    }

    // ── 6. LiveKit Config Check ───────────────────────────────
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('[LiveKit] Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    // ── 7. Token Generation with TTL ─────────────────────────
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identityResult.value,
      // Use the authenticated user's ID as the identity if available
      ...(user ? { name: identityResult.value, metadata: JSON.stringify({ userId: user.id }) } : {}),
      ttl: TOKEN_TTL_SECONDS,
    });

    at.addGrant({
      roomJoin: true,
      room: roomNameResult.value,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json(
      { token },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
          // Prevent token from being cached anywhere
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (err) {
    console.error('[LiveKit token] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate token.' }, { status: 500 });
  }
}
