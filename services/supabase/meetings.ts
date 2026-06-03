import { supabase } from './client';
import { generateRoomCode } from '../../packages/shared/rooms';
import { Meeting } from '../../types/meeting';

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

    return {
      id: data.id,
      title: data.room_name,
      room_code: data.room_code,
      host_id: data.host_id,
      livekit_room_id: data.id, // Using internal ID as room name for LiveKit
      created_at: data.created_at,
      status: 'active'
    };
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

    return {
      id: data.id,
      title: data.room_name,
      room_code: data.room_code,
      host_id: data.host_id,
      livekit_room_id: data.id,
      created_at: data.created_at,
      status: 'active'
    };
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
