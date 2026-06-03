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
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  role: 'host' | 'guest';
  joined_at: string;
}
