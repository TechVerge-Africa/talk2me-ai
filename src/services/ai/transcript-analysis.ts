import { CanonicalTranscriptEntry, MeetingDecisionEntry, TranscriptService } from '@/services/supabase/transcripts';

export interface ExtractedDecisionItem {
  id?: string;
  category: 'proposal' | 'question' | 'suggestion' | 'decision' | 'action_item';
  text: string;
  evidence_speaker: string;
  evidence_timestamp_ms: number;
  evidence_quote: string;
  formatted_time?: string;
}

export function formatTimestampMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const TranscriptAnalysisService = {
  /**
   * Triggers AI analysis on canonical transcripts and persists extracted evidence items
   */
  async analyzeAndExtractDecisions(
    meetingId: string,
    transcripts: CanonicalTranscriptEntry[]
  ): Promise<ExtractedDecisionItem[]> {
    if (!transcripts || transcripts.length === 0) return [];

    try {
      const res = await fetch('/api/ai/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          canonicalTranscripts: transcripts,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI Analysis failed with status ${res.status}`);
      }

      const data = await res.json();
      const rawDecisions: ExtractedDecisionItem[] = (data.decisions || []).map((item: any) => ({
        ...item,
        formatted_time: formatTimestampMs(item.evidence_timestamp_ms || 0),
      }));

      // Convert to MeetingDecisionEntry format for persistence
      const dbEntries: MeetingDecisionEntry[] = rawDecisions.map((item) => ({
        meeting_id: meetingId,
        category: item.category,
        text: item.text,
        evidence_speaker: item.evidence_speaker,
        evidence_timestamp_ms: item.evidence_timestamp_ms,
        evidence_quote: item.evidence_quote,
      }));

      await TranscriptService.saveMeetingDecisions(dbEntries);

      return rawDecisions;
    } catch (err) {
      console.error('[TranscriptAnalysisService] Analysis error:', err);
      return [];
    }
  },

  /**
   * Loads saved decision entries for a meeting
   */
  async getSavedDecisions(meetingId: string): Promise<ExtractedDecisionItem[]> {
    const records = await TranscriptService.getMeetingDecisions(meetingId);
    return records.map((r) => ({
      id: r.id,
      category: r.category,
      text: r.text,
      evidence_speaker: r.evidence_speaker,
      evidence_timestamp_ms: r.evidence_timestamp_ms,
      evidence_quote: r.evidence_quote,
      formatted_time: formatTimestampMs(r.evidence_timestamp_ms),
    }));
  }
};
