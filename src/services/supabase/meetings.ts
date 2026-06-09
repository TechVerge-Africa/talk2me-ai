import { supabase } from './client';
import { generateRoomCode } from '@/packages/shared/rooms';
import { Meeting } from '@/types/meeting';

/** Map a Supabase meetings row to the application Meeting model. */
function toMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    title: row.room_name as string,
    room_code: row.room_code as string,
    host_id: row.host_id as string,
    livekit_room_id: row.id as string,
    created_at: row.created_at as string,
    status: 'active',
  };
}

export const MeetingService = {
  /**
   * Creates a new meeting room
   */
  async createMeeting(title: string, hostId: string): Promise<Meeting | null> {
    const roomCode = generateRoomCode();
    
    const { data, error } = await supabase
      .from('meetings')
      .insert([
        {
          room_name: title,
          room_code: roomCode,
          host_id: hostId,
          is_active: true,
          settings: {
            require_approval: false,
            sign_language_enabled: true
          }
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return null;
    }

    return toMeeting(data);
  },

  /**
   * Fetches an active meeting by its room code
   */
  async getMeetingByCode(code: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('room_code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Meeting not found:', error);
      return null;
    }

    return toMeeting(data);
  },

  /**
   * Marks a meeting as ended
   */
  async endMeeting(meetingId: string) {
    const { error } = await supabase
      .from('meetings')
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString() 
      })
      .eq('id', meetingId);

    if (error) {
      console.error('Error ending meeting:', error);
    }
  }
};
