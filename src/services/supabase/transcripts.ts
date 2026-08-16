import { supabase } from './client';
import { AppError } from '@/services/errors';

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface CanonicalTranscriptEntry {
  id?: string;
  meeting_id: string;
  user_id?: string | null;
  speaker_id: string;
  speaker_name: string;
  content: string;
  start_ms: number;
  end_ms: number;
  words: TranscriptWord[];
  confidence: number;
  status: 'interim' | 'final';
  turn_id?: string;
  language?: string;
  created_at?: string;
}

export interface MeetingDecisionEntry {
  id?: string;
  meeting_id: string;
  category: 'proposal' | 'question' | 'suggestion' | 'decision' | 'action_item';
  text: string;
  evidence_speaker: string;
  evidence_timestamp_ms: number;
  evidence_quote: string;
  created_at?: string;
}

export const TranscriptService = {
  /**
   * Saves a finalized canonical transcript turn to the database
   */
  async saveCanonicalTurn(entry: CanonicalTranscriptEntry): Promise<void> {
    const payload = {
      meeting_id: entry.meeting_id,
      user_id: entry.user_id || null,
      speaker_id: entry.speaker_id,
      speaker_name: entry.speaker_name,
      content: entry.content,
      start_time: entry.start_ms / 1000,
      end_time: entry.end_ms / 1000,
      start_ms: entry.start_ms,
      end_ms: entry.end_ms,
      words: entry.words,
      confidence: entry.confidence,
      status: 'final',
      turn_id: entry.turn_id || null,
      language: entry.language || 'en',
    };

    const { error } = await supabase
      .from('transcripts')
      .insert([payload]);

    if (error) {
      console.warn('[TranscriptService] saveCanonicalTurn fallback warning:', error.message);
      // Fallback for missing new columns on older DB schemas
      const legacyPayload = {
        meeting_id: entry.meeting_id,
        user_id: entry.user_id || null,
        content: `${entry.speaker_name}: ${entry.content}`,
        start_time: entry.start_ms / 1000,
        end_time: entry.end_ms / 1000,
        language: entry.language || 'en',
      };
      try {
        await supabase.from('transcripts').insert([legacyPayload]);
      } catch (legacyErr) {
        console.error('[TranscriptService] Legacy save failed:', legacyErr);
      }
    }
  },

  /**
   * Saves a chunk of transcription text (legacy compatibility)
   */
  async saveTranscript(entry: { meeting_id: string; user_id?: string | null; content: string; start_time: number; end_time: number; language?: string }): Promise<void> {
    const { error } = await supabase.from('transcripts').insert([entry]);
    if (error) {
      console.warn('[TranscriptService] saveTranscript error:', error.message);
    }
  },

  /**
   * Fetches canonical transcripts for a specific meeting, ordered by start time
   */
  async getCanonicalTranscripts(meetingId: string): Promise<CanonicalTranscriptEntry[]> {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('start_ms', { ascending: true });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          meeting_id: row.meeting_id,
          user_id: row.user_id,
          speaker_id: row.speaker_id || row.user_id || 'unknown',
          speaker_name: row.speaker_name || row.user_id || 'Speaker',
          content: row.content,
          start_ms: row.start_ms ?? Math.round((row.start_time || 0) * 1000),
          end_ms: row.end_ms ?? Math.round((row.end_time || 0) * 1000),
          words: row.words || [],
          confidence: row.confidence || 1.0,
          status: 'final',
          turn_id: row.turn_id,
          created_at: row.created_at,
        }));
      }

      // Fallback query if start_ms column or index doesn't exist
      const legacyRes = await supabase
        .from('transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('start_time', { ascending: true });
      
      if (legacyRes.error || !legacyRes.data) {
        console.warn('[TranscriptService] Transcripts query warning:', legacyRes.error?.message);
        return [];
      }

      return legacyRes.data.map((row: any) => ({
        id: row.id,
        meeting_id: row.meeting_id,
        user_id: row.user_id,
        speaker_id: row.speaker_id || row.user_id || 'unknown',
        speaker_name: row.speaker_name || row.user_id || 'Speaker',
        content: row.content,
        start_ms: Math.round((row.start_time || 0) * 1000),
        end_ms: Math.round((row.end_time || 0) * 1000),
        words: row.words || [],
        confidence: row.confidence || 1.0,
        status: 'final',
        created_at: row.created_at,
      }));
    } catch (e) {
      console.warn('[TranscriptService] Exception fetching transcripts:', e);
      return [];
    }
  },

  /**
   * Persists extracted meeting decisions & action items
   */
  async saveMeetingDecisions(decisions: MeetingDecisionEntry[]): Promise<void> {
    if (decisions.length === 0) return;
    const { error } = await supabase
      .from('meeting_decisions')
      .insert(decisions);

    if (error) {
      console.warn('[TranscriptService] saveMeetingDecisions notice:', error.message);
    }
  },

  /**
   * Fetches saved meeting decisions & action items
   */
  async getMeetingDecisions(meetingId: string): Promise<MeetingDecisionEntry[]> {
    const { data, error } = await supabase
      .from('meeting_decisions')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      return [];
    }

    return data as MeetingDecisionEntry[];
  }
};
