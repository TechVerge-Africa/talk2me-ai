import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ROOM_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const MAX_PARTICIPANT_NAME = 60;

export async function POST(req: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && token) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // ── Input parsing & validation ────────────────────────────────
    const { roomName, participantName } = await req.json();

    if (!roomName || !participantName) {
      return NextResponse.json({ error: 'Missing roomName or participantName' }, { status: 400 });
    }

    if (typeof roomName !== 'string' || !ROOM_NAME_RE.test(roomName)) {
      return NextResponse.json(
        { error: 'Invalid roomName: must be 1-128 alphanumeric/dash/underscore characters' },
        { status: 400 },
      );
    }

    const sanitizedName = String(participantName).trim().slice(0, MAX_PARTICIPANT_NAME);
    if (!sanitizedName) {
      return NextResponse.json({ error: 'participantName is empty after sanitization' }, { status: 400 });
    }

    // ── Token generation ──────────────────────────────────────────
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit server misconfigured' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: sanitizedName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({ token: await at.toJwt() });
  } catch {
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
