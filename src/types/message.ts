export interface Message {
  id: string;
  meeting_id: string;
  sender_id: string;
  recipient_id?: string;
  content: string;
  type: 'chat' | 'caption' | 'system';
  timestamp: string;
  confidence?: number;
}

export interface AISummary {
  id: string;
  meeting_id: string;
  summary: string;
  action_items: string[];
  created_at: string;
}
