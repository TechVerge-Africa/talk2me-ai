import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/ai/gemini-service';
import { CanonicalTranscriptEntry } from '@/services/supabase/transcripts';

/**
 * POST /api/ai/polish-transcript
 *
 * Accepts an array of raw canonical transcript turns captured from real-time
 * ASR and returns the same turns with their `content` field cleaned:
 *  - Stutters and false starts removed
 *  - Filler words (um, uh, like, you know) stripped
 *  - Proper punctuation and capitalisation applied
 *  - Speaker attribution and start_ms timestamps are NEVER modified
 */
export async function POST(req: NextRequest) {
  try {
    const { turns } = await req.json() as { turns: CanonicalTranscriptEntry[] };

    if (!Array.isArray(turns) || turns.length === 0) {
      return NextResponse.json({ polished: [], isFallback: false });
    }

    // Format turns for the LLM prompt
    const rawText = turns.map((turn, i) => {
      const seconds = Math.floor((turn.start_ms || 0) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const ts = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      return `[${i}|${ts}|${turn.start_ms ?? 0}ms] ${turn.speaker_name || turn.speaker_id}: "${turn.content}"`;
    }).join('\n');

    const prompt = `
You are a professional transcript editor for Talk2Me AI.
Your task is to polish the raw speech-to-text transcript below.

RULES:
1. Remove stutters, false starts, and repeated words (e.g. "I I think" → "I think").
2. Remove filler words: um, uh, like (when used as filler), you know, so (at sentence start), right?.
3. Add correct punctuation and capitalise the first word of each sentence.
4. Preserve ALL meaning — do NOT paraphrase, summarise, or change what was said.
5. Preserve speaker names and timestamps EXACTLY — do NOT alter them.
6. Return ONLY a valid JSON array with the same number of objects as the input, each with:
   - "index": the integer index from the input tag (e.g. [0|...] → 0)
   - "content": the polished text for that turn

Output format (no markdown fencing, no extra commentary):
[
  { "index": 0, "content": "Polished text here." },
  ...
]

Raw Transcript:
${rawText}
`;

    // Primary: Google Gemini API
    if (GeminiService.getApiKey()) {
      try {
        const result = await GeminiService.generateContent(prompt, {
          model: 'gemini-2.5-flash-lite',
          responseMimeType: 'application/json',
        });

        const parsed: { index: number; content: string }[] = JSON.parse(result.text || '[]');

        // Merge polished content back into the original turns (preserving all other fields)
        const polished = turns.map((turn, i) => {
          const patch = parsed.find((p) => p.index === i);
          return patch ? { ...turn, content: patch.content } : turn;
        });

        return NextResponse.json({ polished, isFallback: false });
      } catch (geminiErr) {
        console.warn('[polish-transcript] Gemini error, using raw turns:', geminiErr);
      }
    }

    // Fallback: return the raw turns unchanged
    return NextResponse.json({ polished: turns, isFallback: true });
  } catch (err) {
    console.error('[polish-transcript] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to polish transcript' },
      { status: 500 },
    );
  }
}

