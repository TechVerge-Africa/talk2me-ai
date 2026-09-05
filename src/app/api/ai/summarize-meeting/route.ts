import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GeminiService } from '@/services/ai/gemini-service';

// Server-side Supabase with service role for reading transcripts
const supabaseAdmin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
);

interface TranscriptTurn {
  id: string;
  speaker_name: string;
  speaker_id: string;
  content: string;
  start_ms: number;
  end_ms: number;
  created_at: string;
}

interface SummaryDecision {
  category: 'decision' | 'action_item' | 'proposal' | 'question' | 'suggestion';
  text: string;
  evidence_speaker: string;
  evidence_timestamp_ms: number;
  evidence_quote: string;
}

/** Resolve room_code → UUID if needed */
async function resolveMeetingUuid(meetingIdOrCode: string): Promise<string | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meetingIdOrCode);
  if (isUUID) return meetingIdOrCode;
  const { data } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('room_code', meetingIdOrCode)
    .maybeSingle();
  return data?.id || null;
}

/** Format ms → MM:SS */
function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId is required' }, { status: 400 });
    }

    const uuid = await resolveMeetingUuid(meetingId);
    if (!uuid) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // ── 1. Fetch all transcript turns ──────────────────────────────────────
    let rows: any[] = [];
    const { data: primaryRows, error: primaryErr } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('meeting_id', uuid);

    if (!primaryErr && primaryRows) {
      rows = primaryRows;
    } else {
      console.warn('[summarize-meeting] Notice fetching transcripts:', primaryErr?.message);
    }

    const turns: TranscriptTurn[] = (rows || [])
      .map((r: any) => ({
        id: r.id,
        speaker_name: r.speaker_name || r.user_id || 'Speaker',
        speaker_id: r.speaker_id || r.user_id || 'unknown',
        content: r.content || '',
        start_ms: r.start_ms ?? Math.round((r.start_time || 0) * 1000),
        end_ms: r.end_ms ?? Math.round((r.end_time || 0) * 1000),
        created_at: r.created_at,
      }))
      .filter(t => t.content && t.content.trim().length > 0)
      .sort((a, b) => a.start_ms - b.start_ms);

    if (turns.length === 0) {
      return NextResponse.json({
        turns: [],
        summary: null,
        decisions: [],
      });
    }

    // ── 2. Build plain-text transcript for AI ─────────────────────────────
    const transcriptText = turns
      .map(t => `[${formatTime(t.start_ms)}] ${t.speaker_name}: "${t.content}"`)
      .join('\n');

    // ── 3. Run Gemini for summary + decisions ─────────────────────────────
    let summary: string | null = null;
    let decisions: SummaryDecision[] = [];

    if (GeminiService.getApiKey()) {
      const prompt = `You are an expert AI meeting analyst for Talk2Me AI.
Analyze the following meeting transcript and produce two things:

1. A concise 2–3 sentence prose SUMMARY of what the meeting covered and any outcomes reached.
2. A list of categorized ITEMS extracted from the discussion.

Categories for items:
- "decision": Explicitly agreed-upon outcomes (e.g., "We decided to launch Friday.")
- "action_item": Tasks or commitments assigned to someone (e.g., "Alice will prepare the report.")
- "proposal": Initial suggestions raised for discussion (e.g., "I think we should redesign the dashboard.")
- "question": Key open questions raised (e.g., "Should we prioritize mobile first?")
- "suggestion": Constructive recommendations (e.g., "Maybe we can use a shorter sprint cycle.")

REQUIREMENTS:
- Every item MUST cite exact evidence: the speaker name, timestamp_ms (as integer), and exact quote.
- Return ONLY valid JSON with no markdown fencing or extra text.

JSON schema:
{
  "summary": "...",
  "decisions": [
    {
      "category": "decision" | "action_item" | "proposal" | "question" | "suggestion",
      "text": "Clear concise summary of the item",
      "evidence_speaker": "Name",
      "evidence_timestamp_ms": 12345,
      "evidence_quote": "Exact words spoken"
    }
  ]
}

Transcript:
${transcriptText}`;

      try {
        const result = await GeminiService.generateContent(prompt, {
          model: 'gemini-2.5-flash-lite',
          responseMimeType: 'application/json',
        });
        const parsed = JSON.parse(result.text || '{}');
        summary = parsed.summary || null;
        decisions = parsed.decisions || [];
      } catch (geminiErr) {
        console.warn('[summarize-meeting] Gemini failed, using heuristic fallback:', geminiErr);
        // Heuristic fallback — simple keyword scan
        decisions = turns.flatMap((t): SummaryDecision[] => {
          const text = t.content;
          const base = {
            evidence_speaker: t.speaker_name,
            evidence_timestamp_ms: t.start_ms,
            evidence_quote: text,
          };
          if (/agreed|we decided|let's go with|confirmed/i.test(text))
            return [{ ...base, category: 'decision', text }];
          if (/I'll|i will|will handle|will prepare|takes ownership/i.test(text))
            return [{ ...base, category: 'action_item', text }];
          if (/think we should|propose|suggest|how about/i.test(text))
            return [{ ...base, category: 'proposal', text }];
          if (/\?$/.test(text.trim()) || /should we|could we|what if|why don't/i.test(text))
            return [{ ...base, category: 'question', text }];
          return [];
        });
      }
    }

    return NextResponse.json({ turns, summary, decisions });
  } catch (err: any) {
    console.error('[summarize-meeting] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
