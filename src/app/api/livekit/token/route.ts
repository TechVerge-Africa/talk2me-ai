import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { roomName, participantName } = await req.json();
    console.log(`Generating token for Room: ${roomName}, Participant: ${participantName}`);

    if (!roomName || !participantName) {
      return NextResponse.json({ error: 'Missing roomName or participantName' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit server misconfigured' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({ token: await at.toJwt() });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
