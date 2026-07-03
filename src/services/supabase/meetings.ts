import { supabase } from './client';
import { generateRoomCode } from '@/packages/shared/rooms';
import { Meeting, MeetingParticipant, ParticipantRole, ParticipantStatus } from '@/types/meeting';
import { AppError } from '@/services/errors';
import { validateMeetingTitle, validateDisplayName, sanitizeText } from '@/lib/validators';

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
      allow_screen_share: typeof (row.settings as any).allow_screen_share === 'boolean' ? !!(row.settings as any).allow_screen_share : true,
      sign_language_enabled: !!(row.settings as any).sign_language_enabled,
    } : undefined,
  };
}

export const MeetingService = {
  /**
   * Creates a new meeting room
   */
  async createMeeting(title: string, hostId: string, requireApproval: boolean = false, scheduledAt?: string, allowScreenShare: boolean = true): Promise<Meeting> {
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
            allow_screen_share: allowScreenShare,
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
   * Fetches a meeting by room code regardless of active status (for host re-entry checks)
   */
  async getMeetingByCodeAny(code: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, room_name, room_code, host_id, is_active, settings, created_at, scheduled_at, ended_at')
      .eq('room_code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
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
   * Reactivates an ended meeting (host only)
   */
  async reactivateMeeting(meetingId: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .update({ is_active: true, ended_at: null })
      .eq('id', meetingId);

    if (error) {
      throw new AppError(
        'Failed to reactivate the meeting.',
        'MEETING_REACTIVATE_FAILED',
        { cause: error },
      );
    }
  },


  /**
   * Fetches an active meeting by its room code
   */
  async getMeetingByCode(code: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, room_name, room_code, host_id, is_active, settings, created_at, scheduled_at, ended_at')
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
    // Single query: update + return room_code in one round-trip
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select('room_code')
      .single();

    if (error) {
      throw new AppError(
        'Failed to end the meeting.',
        'MEETING_END_FAILED',
        { cause: error },
      );
    }

    // Clear transient data in parallel — don't block the caller
    if (meeting?.room_code) {
      Promise.all([
        MeetingService.clearMeetingMessages(meeting.room_code).catch(() => {}),
        MeetingService.clearMeetingParticipants(meetingId).catch(() => {}),
      ]);
    }
  },

  /**
   * Clears all participants from an ended meeting
   */
  async clearMeetingParticipants(meetingId: string): Promise<void> {
    await supabase
      .from('meeting_participants')
      .delete()
      .eq('meeting_id', meetingId);
  },

  /**
   * Updates meeting settings
   */
  async updateMeetingSettings(meetingId: string, settings: { require_approval: boolean; allow_screen_share?: boolean; sign_language_enabled?: boolean }): Promise<void> {
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
      .select('id, room_name, room_code, host_id, is_active, settings, created_at, scheduled_at, ended_at')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false })
      .limit(50); // Reasonable page size — prevents huge payloads

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
  },

  // ─── PARTICIPANT & LOBBY ADMIN SERVICES ────────────────────────────────

  /**
   * Registers or updates a participant in a meeting room (Lobby or Active)
   */
  async joinMeetingParticipant(params: {
    meeting_id: string;
    identity: string;
    display_name: string;
    user_id?: string;
    role?: ParticipantRole;
    status?: ParticipantStatus;
  }): Promise<MeetingParticipant> {
    const payload = {
      meeting_id: params.meeting_id,
      identity: params.identity,
      display_name: params.display_name,
      user_id: params.user_id || null,
      role: params.role || 'participant',
      status: params.status || 'waiting',
      updated_at: new Date().toISOString(),
    };

    // 1. Try to insert (works for anon & auth users if row doesn't exist)
    const { data: insertData, error: insertError } = await supabase
      .from('meeting_participants')
      .insert([payload])
      .select()
      .maybeSingle();

    if (insertError) {
      // 23505 = unique_violation
      if (insertError.code === '23505') {
        // 2. Try to update (works for auth users)
        const { data: updateData, error: updateError } = await supabase
          .from('meeting_participants')
          .update(payload)
          .eq('meeting_id', params.meeting_id)
          .eq('identity', params.identity)
          .select()
          .maybeSingle();

        if (updateError || !updateData) {
          // 3. If update fails due to RLS (anon user), just fetch existing row
          const { data: existingData, error: fetchError } = await supabase
            .from('meeting_participants')
            .select('*')
            .eq('meeting_id', params.meeting_id)
            .eq('identity', params.identity)
            .single();
            
          if (fetchError) throw fetchError;
          return existingData as MeetingParticipant;
        }
        return updateData as MeetingParticipant;
      }
      throw insertError;
    }

    return insertData as MeetingParticipant;
  },

  /**
   * Gets all participants for a meeting room
   */
  async getMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    const { data, error } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meetingId);

    if (error) {
      console.error('Error fetching meeting participants:', error);
      return [];
    }

    return (data || []) as MeetingParticipant[];
  },

  /**
   * Updates participant status (admit, reject, left)
   */
  async updateParticipantStatus(meetingId: string, identities: string[], status: ParticipantStatus): Promise<void> {
    const { error } = await supabase
      .from('meeting_participants')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('meeting_id', meetingId)
      .in('identity', identities);

    if (error) {
      console.error('Error updating participant status:', error);
    }
  },

  /**
   * Updates participant role (host, cohost, participant)
   */
  async updateParticipantRole(meetingId: string, identity: string, role: ParticipantRole): Promise<void> {
    const { error } = await supabase
      .from('meeting_participants')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('meeting_id', meetingId)
      .eq('identity', identity);

    if (error) {
      console.error('Error updating participant role:', error);
    }
  },

  // ── PERSISTENT CHAT SERVICES ──────────────────────────────────────────

  /**
   * Persists a chat message into Supabase database
   */
  async saveMeetingMessage(params: {
    room_code: string;
    meeting_id?: string;
    sender_id: string;
    recipient_id?: string;
    content: string;
    type?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('meeting_messages')
      .insert([{
        room_code: params.room_code,
        meeting_id: params.meeting_id || null,
        sender_id: params.sender_id,
        recipient_id: params.recipient_id || null,
        content: params.content,
        type: params.type || 'chat'
      }]);

    if (error) {
      console.error('Failed to persist meeting message:', error);
    }
  },

  /**
   * Fetches persistent chat history for a meeting room
   */
  async getMeetingMessages(roomCode: string, limit = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from('meeting_messages')
      .select('id, room_code, sender_id, recipient_id, content, type, created_at')
      .eq('room_code', roomCode)
      .order('created_at', { ascending: false }) // newest first so LIMIT gives us the latest
      .limit(limit)
      .then(result => ({ ...result, data: result.data?.reverse() ?? [] })); // restore chronological order

    if (error) {
      console.error('Failed to fetch meeting messages:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      meeting_id: row.room_code,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id || undefined,
      content: row.content,
      type: row.type || 'chat',
      timestamp: row.created_at
    }));
  },

  /**
   * Clears persistent chat history for a meeting room when host ends meeting
   */
  async clearMeetingMessages(roomCode: string): Promise<void> {
    const { error } = await supabase
      .from('meeting_messages')
      .delete()
      .eq('room_code', roomCode);

    if (error) {
      console.error('Failed to clear meeting messages:', error);
    }
  }
};
