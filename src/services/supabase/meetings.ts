import { supabase } from './client';
import { generateRoomCode } from '@/packages/shared/rooms';
import { Meeting } from '@/types/meeting';
import { AppError } from '@/services/errors';

/** Map a Supabase meetings row to the application Meeting model. */
function toMeeting(row: Record<string, any>): Meeting {
  return {
    id: row.id as string,
    title: row.room_name as string,
    room_code: row.room_code as string,
    host_id: row.host_id as string,
    livekit_room_id: row.id as string,
    created_at: row.created_at as string,
    scheduled_at: row.scheduled_at as string | undefined,
    status: row.is_active ? 'active' : 'ended',
    settings: row.settings ? {
      require_approval: !!(row.settings as any).require_approval,
      sign_language_enabled: !!(row.settings as any).sign_language_enabled,
    } : undefined,
  };
}

export const MeetingService = {
  /**
   * Creates a new meeting room
   */
  async createMeeting(title: string, hostId: string, requireApproval: boolean = false, scheduledAt?: string): Promise<Meeting> {
    const roomCode = generateRoomCode();
    
    const { data, error } = await supabase
      .from('meetings')
      .insert([
        {
          room_name: title,
          room_code: roomCode,
          host_id: hostId,
          is_active: true,
          scheduled_at: scheduledAt || null,
          settings: {
            require_approval: requireApproval,
            sign_language_enabled: true
          }
        }
      ])
      .select()
      .single();

    if (error) {
      throw new AppError(
        'Unable to create meeting. Please try again.',
        'MEETING_CREATE_FAILED',
        { cause: error },
      );
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

    if (error) {
      // PGRST116 means no rows found — a normal "not found" case
      if (error.code === 'PGRST116') return null;
      throw new AppError(
        'Unable to look up meeting. Please try again.',
        'MEETING_FETCH_FAILED',
        { cause: error },
      );
    }

    if (!data) return null;

    return toMeeting(data);
  },

  /**
   * Marks a meeting as ended
   */
  async endMeeting(meetingId: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString() 
      })
      .eq('id', meetingId);

    if (error) {
      throw new AppError(
        'Failed to end the meeting.',
        'MEETING_END_FAILED',
        { cause: error },
      );
    }
  },

  /**
   * Updates meeting settings
   */
  async updateMeetingSettings(meetingId: string, settings: { require_approval: boolean; sign_language_enabled?: boolean }): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .update({ settings })
      .eq('id', meetingId);

    if (error) {
      throw new AppError(
        'Failed to update meeting settings.',
        'MEETING_SETTINGS_UPDATE_FAILED',
        { cause: error },
      );
    }
  },

  /**
   * Fetches all meetings hosted by a user
   */
  async getUserMeetings(hostId: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(
        'Unable to load meetings. Please try again.',
        'MEETINGS_FETCH_FAILED',
        { cause: error },
      );
    }

    return (data || []).map(toMeeting);
  },

  /**
   * Deletes a meeting room
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (error) {
      throw new AppError(
        'Failed to delete the meeting.',
        'MEETING_DELETE_FAILED',
        { cause: error },
      );
    }
  }
};
