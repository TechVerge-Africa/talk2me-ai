export interface Message {
  id: string;
  meeting_id: string;
  sender_id: string;
  content: string;
  type: 'chat' | 'caption' | 'system';
  timestamp: string;
}

export interface AISummary {
  id: string;
  meeting_id: string;
  summary: string;
  action_items: string[];
  created_at: string;
}
