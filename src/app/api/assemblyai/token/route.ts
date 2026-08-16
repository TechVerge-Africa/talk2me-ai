import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceWordBoost } from '@/lib/transcript/vocabulary';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    const wordBoost = getWorkspaceWordBoost();

    if (!apiKey) {
      return NextResponse.json({
        token: 'dev_mock_assemblyai_token',
        expires_in: 3600,
        sample_rate: 16000,
        word_boost: wordBoost,
        is_mock: true,
        message: 'ASSEMBLYAI_API_KEY not configured in environment. Using dev mock transcriber mode.'
      });
    }

    // Try temporary token generation endpoint
    try {
      const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_in_seconds: 3600,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          return NextResponse.json({
            token: data.token,
            expires_in: 3600,
            sample_rate: 16000,
            word_boost: wordBoost,
            is_mock: false,
          });
        }
      }
    } catch (e) {
      console.warn('[AssemblyAI Token Fetch Warning]:', e);
    }

    // Direct token authorization payload
    return NextResponse.json({
      token: apiKey,
      expires_in: 3600,
      sample_rate: 16000,
      word_boost: wordBoost,
      is_mock: false,
    });
  } catch (err) {
    console.error('[AssemblyAI Token Exception]:', err);
    return NextResponse.json({ error: 'Failed to generate AssemblyAI token' }, { status: 500 });
  }
}
