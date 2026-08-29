import { supabase } from './client';
import { generateRoomCode } from '@/packages/shared/rooms';
import { Meeting, MeetingParticipant, ParticipantRole, ParticipantStatus } from '@/types/meeting';
export type { Meeting };
import { AppError } from '@/services/errors';

/** Map a Supabase meetings row to the application Meeting model. */
function toMeeting(row: Record<string, unknown>): Meeting {
  const settings = row.settings as Record<string, unknown> | undefined;
  const workspaceId = row.workspace_id as string | undefined;
  const accessLevel = (settings?.access_level as 'members_only' | 'open' | undefined) ?? (workspaceId ? 'members_only' : 'open');
  const allowOutsiders = typeof settings?.allow_outsiders === 'boolean'
    ? settings.allow_outsiders
    : (accessLevel === 'open');

  return {
    id: row.id as string,
    title: row.room_name as string,
    room_code: row.room_code as string,
    host_id: row.host_id as string,
    livekit_room_id: row.id as string,
    created_at: row.created_at as string,
    scheduled_at: row.scheduled_at as string | undefined,
    workspace_id: workspaceId,
    status: row.is_active ? 'active' : 'ended',
    settings: settings ? {
      require_approval: !!settings.require_approval,
      allow_screen_share: typeof settings.allow_screen_share === 'boolean' ? !!settings.allow_screen_share : true,
      sign_language_enabled: !!settings.sign_language_enabled,
      is_ephemeral: !!settings.is_ephemeral,
      access_level: accessLevel,
      allow_outsiders: allowOutsiders,
    } : {
      require_approval: false,
      allow_screen_share: true,
      sign_language_enabled: true,
      access_level: accessLevel,
      allow_outsiders: allowOutsiders,
    },
  };
}

export const MeetingService = {
  /**
   * Creates a new meeting room
   */
  async createMeeting(
    title: string,
    hostId: string,
    requireApproval: boolean = false,
    scheduledAt?: string,
    allowScreenShare: boolean = true,
    workspaceId?: string,
    isEphemeral: boolean = false,
    accessLevel?: 'members_only' | 'open'
  ): Promise<Meeting> {
    const roomCode = generateRoomCode();
    const resolvedAccessLevel = accessLevel ?? (workspaceId ? 'members_only' : 'open');
    
    const insertPayload: any = {
      room_name: title,
      room_code: roomCode,
      host_id: hostId,
      is_active: true,
      scheduled_at: scheduledAt || null,
      settings: {
        require_approval: requireApproval,
        allow_screen_share: allowScreenShare,
        sign_language_enabled: true,
        is_ephemeral: isEphemeral,
        access_level: resolvedAccessLevel,
        allow_outsiders: resolvedAccessLevel === 'open',
      }
    };

    if (workspaceId) {
      insertPayload.workspace_id = workspaceId;
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert([insertPayload])
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
      .select('id, room_name, room_code, host_id, is_active, settings, created_at, scheduled_at, ended_at, workspace_id')
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
      .select('id, room_name, room_code, host_id, is_active, settings, created_at, scheduled_at, ended_at, workspace_id')
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
  async updateMeetingSettings(
    meetingId: string,
    settings: {
      require_approval: boolean;
      allow_screen_share?: boolean;
      sign_language_enabled?: boolean;
      is_ephemeral?: boolean;
      access_level?: 'members_only' | 'open';
      allow_outsiders?: boolean;
    }
  ): Promise<void> {
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
   * Fetches all meetings for a workspace (active + ended), newest first
   */
  async getWorkspaceMeetings(workspaceId: string): Promise<(Meeting & { ended_at?: string | null })[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, room_name, room_code, host_id, is_active, settings, created_at, scheduled_at, ended_at, workspace_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new AppError(
        'Unable to load workspace meetings. Please try again.',
        'WORKSPACE_MEETINGS_FETCH_FAILED',
        { cause: error },
      );
    }

    return (data || []).map(row => ({
      ...toMeeting(row as Record<string, unknown>),
      ended_at: (row as any).ended_at ?? null,
    }));
  },

  /**
   * Fetches active or upcoming meetings across multiple workspaces
   */
  async getActiveWorkspaceMeetings(workspaceIds: string[]): Promise<Meeting[]> {
    if (!workspaceIds || !workspaceIds.length) return [];
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .in('workspace_id', workspaceIds)
      .or('is_active.eq.true,scheduled_at.not.is.null');

    if (error) return [];
    return (data || []).map(row => ({
      ...toMeeting(row as Record<string, unknown>),
      ended_at: (row as any).ended_at ?? null,
    }));
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
    is_ephemeral?: boolean;
  }): Promise<MeetingParticipant> {
    if (params.is_ephemeral) {
      return {
        id: `ephemeral_${params.identity}`,
        meeting_id: params.meeting_id,
        identity: params.identity,
        display_name: params.display_name,
        user_id: params.user_id,
        role: params.role || 'participant',
        status: params.status || 'admitted',
        is_muted: false,
        is_video_off: false,
        hand_raised: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const payload = {
      meeting_id: params.meeting_id,
      identity: params.identity,
      display_name: params.display_name,
      user_id: params.user_id || null,
      role: params.role || 'participant',
      status: params.status || 'waiting',
      updated_at: new Date().toISOString(),
    };

    // 1. Check if participant already exists for (meeting_id, identity)
    const { data: existingData } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', params.meeting_id)
      .eq('identity', params.identity)
      .maybeSingle();

    if (existingData) {
      // 2. If row exists, attempt update (or return existing if update fails due to guest RLS)
      const { data: updateData, error: updateError } = await supabase
        .from('meeting_participants')
        .update(payload)
        .eq('meeting_id', params.meeting_id)
        .eq('identity', params.identity)
        .select()
        .maybeSingle();

      if (updateError || !updateData) {
        return existingData as MeetingParticipant;
      }
      return updateData as MeetingParticipant;
    }

    // 3. Row doesn't exist yet, insert new participant
    const { data: insertData, error: insertError } = await supabase
      .from('meeting_participants')
      .insert([payload])
      .select()
      .maybeSingle();

    if (insertError) {
      // Fallback for concurrent inserts: if unique_violation, fetch existing row
      if (insertError.code === '23505') {
        const { data: fallbackData } = await supabase
          .from('meeting_participants')
          .select('*')
          .eq('meeting_id', params.meeting_id)
          .eq('identity', params.identity)
          .maybeSingle();
        if (fallbackData) return fallbackData as MeetingParticipant;
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
    is_ephemeral?: boolean;
  }): Promise<void> {
    if (params.is_ephemeral) {
      return;
    }
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
  async getMeetingMessages(roomCode: string, limit = 100): Promise<Record<string, unknown>[]> {
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
