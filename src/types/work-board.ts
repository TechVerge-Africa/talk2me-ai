export type BoardActionStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type BoardActionCategory = 'action_item' | 'milestone' | 'decision';
export type BoardActionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkspaceBoard {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  target_channel_name: string;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  item_count?: number;
}

export interface BoardActionItem {
  id: string;
  board_id: string;
  workspace_id: string;
  meeting_id?: string | null;
  meeting_title?: string;
  meeting_code?: string;
  title: string;
  description?: string;
  status: BoardActionStatus;
  category: BoardActionCategory;
  assignee_id?: string | null;
  assignee_name: string;
  assignee_avatar?: string | null;
  due_date?: string | null;
  priority: BoardActionPriority;
  evidence_quote?: string | null;
  evidence_timestamp_ms?: number | null;
  evidence_speaker?: string | null;
  created_by?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateBoardParams {
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  target_channel_name?: string;
  created_by?: string | null;
}

export interface CreateActionItemParams {
  board_id: string;
  workspace_id: string;
  meeting_id?: string | null;
  title: string;
  description?: string;
  status?: BoardActionStatus;
  category?: BoardActionCategory;
  assignee_id?: string | null;
  assignee_name?: string;
  assignee_avatar?: string | null;
  due_date?: string | null;
  priority?: BoardActionPriority;
  evidence_quote?: string | null;
  evidence_timestamp_ms?: number | null;
  evidence_speaker?: string | null;
  created_by?: string | null;
}

