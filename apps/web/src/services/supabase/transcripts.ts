import { supabase } from './client';

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
  async saveTranscript(entry: TranscriptEntry) {
    const { error } = await supabase
      .from('transcripts')
      .insert([entry]);

    if (error) {
      console.error('Error saving transcript:', error);
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
      console.error('Error fetching transcripts:', error);
      return [];
    }

    return data;
  }
};
