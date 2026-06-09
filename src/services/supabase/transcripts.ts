import { supabase } from './client';
import { AppError } from '@/services/errors';

export interface TranscriptEntry {
  meeting_id: string;
  user_id: string;
  content: string;
  start_time: number;
  end_time: number;
  language?: string;
}

export const TranscriptService = {
  /**
   * Saves a chunk of transcription text to the database
   */
  async saveTranscript(entry: TranscriptEntry): Promise<void> {
    const { error } = await supabase
      .from('transcripts')
      .insert([entry]);

    if (error) {
      throw new AppError(
        'Failed to save transcript.',
        'TRANSCRIPT_SAVE_FAILED',
        { cause: error },
      );
    }
  },

  /**
   * Fetches all transcripts for a specific meeting, ordered by time
   */
  async getMeetingTranscripts(meetingId: string) {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*, profiles(full_name, avatar_url)')
      .eq('meeting_id', meetingId)
      .order('start_time', { ascending: true });

    if (error) {
      throw new AppError(
        'Failed to load transcripts.',
        'TRANSCRIPT_FETCH_FAILED',
        { cause: error },
      );
    }

    return data ?? [];
  }
};
