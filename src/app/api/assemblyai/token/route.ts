import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceWordBoost } from '@/lib/transcript/vocabulary';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    const wordBoost = getWorkspaceWordBoost();

    if (!apiKey) {
      return NextResponse.json({
        token: 'dev_mock_assemblyai_token',
        expires_in: 600,
        sample_rate: 16000,
        word_boost: wordBoost,
        is_mock: true,
        message: 'ASSEMBLYAI_API_KEY not configured in environment. Using dev mock transcriber mode.'
      });
    }

    // AssemblyAI v3 Realtime Token endpoint
    const response = await fetch('https://streaming.assemblyai.com/v3/token?expires_in_seconds=600', {
      method: 'GET',
      headers: {
        Authorization: apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        return NextResponse.json({
          token: data.token,
          expires_in: 600,
          sample_rate: 16000,
          word_boost: wordBoost,
          is_mock: false,
        });
      }
    } else {
      const errText = await response.text();
      console.warn('[AssemblyAI v3 Token Warning]:', response.status, errText);
    }

    return NextResponse.json({
      token: apiKey,
      expires_in: 600,
      sample_rate: 16000,
      word_boost: wordBoost,
      is_mock: false,
    });
  } catch (err) {
    console.error('[AssemblyAI Token Exception]:', err);
    return NextResponse.json({ error: 'Failed to generate AssemblyAI token' }, { status: 500 });
  }
}
