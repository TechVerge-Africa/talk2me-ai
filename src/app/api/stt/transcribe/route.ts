import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    const language = (formData.get('language') as string) || 'en';

    // Option 1: Groq Whisper API (Ultra-fast, high-accuracy model)
    if (groqApiKey) {
      const groqFormData = new FormData();
      groqFormData.append('file', file, 'audio.webm');
      groqFormData.append('model', 'whisper-large-v3-turbo');
      groqFormData.append('response_format', 'json');
      groqFormData.append('language', language.split('-')[0] || 'en');
      groqFormData.append('temperature', '0.0');

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqFormData,
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error('Groq STT Error:', errText);
        return NextResponse.json({ error: 'Groq STT transcription failed' }, { status: 500 });
      }

      const data = await groqRes.json();
      return NextResponse.json({ text: data.text || '' });
    }

    // Option 2: OpenAI Whisper API
    if (openaiApiKey) {
      const openaiFormData = new FormData();
      openaiFormData.append('file', file, 'audio.webm');
      openaiFormData.append('model', 'whisper-1');

      const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: openaiFormData,
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error('OpenAI STT Error:', errText);
        return NextResponse.json({ error: 'OpenAI STT transcription failed' }, { status: 500 });
      }

      const data = await openaiRes.json();
      return NextResponse.json({ text: data.text || '' });
    }

    // Option 3: Gemini 1.5 Flash Audio Transcription
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiApiKey) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'audio/webm';

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Transcribe the spoken audio accurately. Output ONLY the raw transcript text with no extra commentary or markdown. If there is no speech, output nothing." },
                { inline_data: { mime_type: mimeType, data: base64Audio } }
              ]
            }]
          })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          return NextResponse.json({ text });
        } else {
          const errText = await geminiRes.text();
          console.error('Gemini STT Error:', errText);
        }
      } catch (geminiErr) {
        console.error('Gemini STT exception:', geminiErr);
      }
    }

    // Fallback response when no backend API key is configured
    return NextResponse.json({
      error: 'Speech API fallback active. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env.local for full Firefox & Brave fallback.',
      unconfigured: true,
    }, { status: 200 });

  } catch (err) {
    console.error('STT API Route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
