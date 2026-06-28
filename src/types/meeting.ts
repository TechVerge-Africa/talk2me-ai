export type MeetingStatus = 'active' | 'ended';

export interface Meeting {
  id: string;
  title: string;
  room_code: string;
  host_id: string;
  livekit_room_id: string;
  created_at: string;
  scheduled_at?: string;
  status: MeetingStatus;
  settings?: {
    require_approval: boolean;
    allow_screen_share?: boolean;
    sign_language_enabled?: boolean;
  };
}

export type ParticipantRole = 'host' | 'cohost' | 'participant';
export type ParticipantStatus = 'waiting' | 'admitted' | 'rejected' | 'left';

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id?: string;
  identity: string;
  display_name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  is_muted: boolean;
  is_video_off: boolean;
  hand_raised: boolean;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  role: 'host' | 'guest';
  joined_at: string;
}
