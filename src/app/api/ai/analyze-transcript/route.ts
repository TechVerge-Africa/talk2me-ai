import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const { meetingId, canonicalTranscripts } = await req.json();

    if (!canonicalTranscripts || !Array.isArray(canonicalTranscripts) || canonicalTranscripts.length === 0) {
      return NextResponse.json({ decisions: [] });
    }

    // Format canonical transcript for AI prompt
    const transcriptText = canonicalTranscripts.map((turn: any) => {
      const seconds = Math.floor((turn.start_ms || 0) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      return `[${formattedTime} | ${turn.start_ms}ms] ${turn.speaker_name || turn.speaker_id}: "${turn.content}"`;
    }).join('\n');

    const prompt = `
You are an expert AI meeting analyst for Talk2Me AI.
Analyze the following Canonical Transcript from a meeting and categorize key conversational statements.

Categorize each items into EXACTLY one of these categories:
1. "proposal": Initial suggestions or proposed ideas (e.g., "I think we should launch Friday.")
2. "question": Key questions raised during discussion (e.g., "Should we launch Friday?")
3. "suggestion": Constructive recommendations (e.g., "Maybe we can launch Friday.")
4. "decision": Explicitly agreed upon decisions (e.g., "Okay, we've agreed to launch Friday.")
5. "action_item": Commitments or tasks assigned to someone (e.g., "I'll prepare the deployment.")

CRITICAL REQUIREMENTS:
- Every extracted decision or action MUST cite exact evidence:
  - "evidence_speaker": the exact name of the participant who spoke it.
  - "evidence_timestamp_ms": the exact millisecond start timestamp integer from the transcript.
  - "evidence_quote": the exact sentence spoken by that participant.

Output ONLY valid JSON matching this schema with no extra commentary or markdown fencing:
{
  "decisions": [
    {
      "category": "proposal" | "question" | "suggestion" | "decision" | "action_item",
      "text": "Clear concise summary of the decision or action",
      "evidence_speaker": "Kwame",
      "evidence_timestamp_ms": 82420,
      "evidence_quote": "I think we should launch the MVP next Friday."
    }
  ]
}

Canonical Transcript:
${transcriptText}
`;

    // 1. Primary: Google Gemini API
    if (GeminiService.getApiKey()) {
      try {
        const result = await GeminiService.generateContent(prompt, {
          model: 'gemini-2.5-flash',
          responseMimeType: 'application/json',
        });

        const parsed = JSON.parse(result.text || '{}');
        return NextResponse.json({ decisions: parsed.decisions || [] });
      } catch (geminiErr) {
        console.warn('[Gemini API Exception in Analyze Route]:', geminiErr);
      }
    }

    // Fallback heuristic extraction if no Gemini key is active
    const fallbackDecisions = canonicalTranscripts.flatMap((turn: any) => {
      const text = turn.content || '';
      const items = [];

      if (/think we should|propose|how about/i.test(text)) {
        items.push({
          category: 'proposal',
          text: turn.content,
          evidence_speaker: turn.speaker_name || turn.speaker_id,
          evidence_timestamp_ms: turn.start_ms,
          evidence_quote: turn.content,
        });
      } else if (/\?$/i.test(text) || /should we|could we|what if/i.test(text)) {
        items.push({
          category: 'question',
          text: turn.content,
          evidence_speaker: turn.speaker_name || turn.speaker_id,
          evidence_timestamp_ms: turn.start_ms,
          evidence_quote: turn.content,
        });
      } else if (/agreed|agree|decided|let's do|confirm/i.test(text)) {
        items.push({
          category: 'decision',
          text: turn.content,
          evidence_speaker: turn.speaker_name || turn.speaker_id,
          evidence_timestamp_ms: turn.start_ms,
          evidence_quote: turn.content,
        });
      } else if (/I'll|i will|handle|take care of|prepare/i.test(text)) {
        items.push({
          category: 'action_item',
          text: turn.content,
          evidence_speaker: turn.speaker_name || turn.speaker_id,
          evidence_timestamp_ms: turn.start_ms,
          evidence_quote: turn.content,
        });
      }

      return items;
    });

    return NextResponse.json({ decisions: fallbackDecisions });
  } catch (err) {
    console.error('[AI Analyze Transcript Exception]:', err);
    return NextResponse.json({ error: 'Failed to analyze transcript' }, { status: 500 });
  }
}
