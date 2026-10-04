import { NextRequest, NextResponse } from 'next/server';
import { GROQ_ANTI_HALLUCINATION_PROMPT } from '@/lib/audio/stt-hallucination-filter';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'A non-empty audio file is required' }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file exceeds the 25 MB limit' }, { status: 413 });
    }

    const contentType = file.type.toLowerCase();
    if (!contentType.startsWith('audio/') && contentType !== 'video/webm' && contentType !== 'application/octet-stream') {
      return NextResponse.json({ error: 'Unsupported audio MIME type' }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = (file instanceof File && file.name) ? file.name : 'audio.webm';
    const mimeType = file.type || 'audio/webm';

    const language = (formData.get('language') as string) || 'en';
    const langCode = language.split('-')[0]?.toLowerCase() || 'en';
    const customPrompt = (formData.get('prompt') as string) || GROQ_ANTI_HALLUCINATION_PROMPT;

    const groqApiKey = process.env.GROQ_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // Option 1: Groq Whisper API (with model cascade)
    if (groqApiKey) {
      const groqModels = langCode === 'en'
        ? ['whisper-large-v3-turbo', 'distil-whisper-large-v3-en', 'whisper-large-v3']
        : ['whisper-large-v3-turbo', 'whisper-large-v3'];

      for (const model of groqModels) {
        try {
          const groqFormData = new FormData();
          const cleanFile = new File([fileBuffer], fileName, { type: mimeType });
          groqFormData.append('file', cleanFile, fileName);
          groqFormData.append('model', model);
          groqFormData.append('response_format', 'json');
          groqFormData.append('language', langCode);
          groqFormData.append('temperature', '0.0');
          if (customPrompt) {
            groqFormData.append('prompt', customPrompt);
          }

          const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: groqFormData,
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            return NextResponse.json({ text: data.text || '', provider: `groq/${model}` });
          }

          const errText = await groqRes.text();
          console.warn(`Groq STT [${model}] failed (${groqRes.status}):`, errText);
        } catch (groqErr) {
          console.warn(`Groq STT [${model}] exception:`, groqErr);
        }
      }
    }

    // Option 2: OpenAI Whisper API Fallback
    if (openaiApiKey) {
      try {
        const openaiFormData = new FormData();
        const cleanFile = new File([fileBuffer], fileName, { type: mimeType });
        openaiFormData.append('file', cleanFile, fileName);
        openaiFormData.append('model', 'whisper-1');
        openaiFormData.append('language', langCode);

        const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: openaiFormData,
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          return NextResponse.json({ text: data.text || '', provider: 'openai/whisper-1' });
        }

        const errText = await openaiRes.text();
        console.warn('OpenAI STT failed:', openaiRes.status, errText);
      } catch (openaiErr) {
        console.warn('OpenAI STT exception:', openaiErr);
      }
    }

    // Option 3: Gemini 1.5 Flash Audio Transcription Fallback
    if (geminiApiKey) {
      try {
        const base64Audio = fileBuffer.toString('base64');

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Transcribe the spoken audio accurately. Output ONLY the raw transcript text with no extra commentary or markdown. If there is no speech, output nothing.' },
                  { inline_data: { mime_type: mimeType, data: base64Audio } }
                ]
              }]
            })
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          return NextResponse.json({ text, provider: 'gemini/1.5-flash' });
        }

        const errText = await geminiRes.text();
        console.warn('Gemini STT failed:', geminiRes.status, errText);
      } catch (geminiErr) {
        console.warn('Gemini STT exception:', geminiErr);
      }
    }

    // Graceful fallback when no keys are configured or all providers are unavailable:
    // Return status 200 with text: "" so client applications never crash or fail to deliver voice messages.
    return NextResponse.json({
      text: '',
      warning: 'Speech-to-text service is currently unconfigured or unavailable',
      unconfigured: !groqApiKey && !openaiApiKey && !geminiApiKey,
    }, { status: 200 });

  } catch (err) {
    console.error('STT API Route error:', err);
    return NextResponse.json({ text: '', error: 'Internal server error' }, { status: 200 });
  }
}

