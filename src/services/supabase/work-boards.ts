import { supabase } from './client';
import {
  WorkspaceBoard,
  BoardActionItem,
  BoardActionStatus,
  CreateBoardParams,
  CreateActionItemParams,
} from '@/types/work-board';
import { WorkspaceService } from './workspaces';

/**
 * Resolves a room_code or UUID string to a valid Supabase meetings UUID.
 */
async function resolveMeetingUuid(meetingIdOrCode?: string | null): Promise<string | null> {
  if (!meetingIdOrCode) return null;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meetingIdOrCode);
  if (isUUID) return meetingIdOrCode;

  try {
    const { data } = await supabase
      .from('meetings')
      .select('id')
      .eq('room_code', meetingIdOrCode)
      .maybeSingle();

    return data?.id || null;
  } catch {
    return null;
  }
}

export const WorkBoardService = {
  /**
   * Fetches all boards for a workspace.
   * If none exist, auto-creates a starter board for the workspace.
   */
  async getWorkspaceBoards(workspaceId: string): Promise<WorkspaceBoard[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_boards')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[WorkBoardService] Error fetching workspace boards:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        return data as WorkspaceBoard[];
      }

      // Auto-provision a starter board if none exists yet
      return [await this.createBoard({
        workspace_id: workspaceId,
        name: 'Core Team Board',
        description: 'Default action board for team meetings and milestones',
        icon: 'layout-grid',
        target_channel_name: '# General',
      })];
    } catch (err) {
      console.error('[WorkBoardService] Exception fetching boards:', err);
      return [];
    }
  },

  /**
   * Fetches a single board by its ID.
   */
  async getBoardById(boardId: string): Promise<WorkspaceBoard | null> {
    try {
      const { data, error } = await supabase
        .from('workspace_boards')
        .select('*')
        .eq('id', boardId)
        .maybeSingle();

      if (error || !data) return null;
      return data as WorkspaceBoard;
    } catch {
      return null;
    }
  },

  /**
   * Creates a new Team Work Board in a workspace.
   */
  async createBoard(params: CreateBoardParams): Promise<WorkspaceBoard> {
    const payload = {
      workspace_id: params.workspace_id,
      name: params.name.trim(),
      description: params.description?.trim() || '',
      icon: params.icon || 'layout-grid',
      target_channel_name: params.target_channel_name || '# General',
      created_by: params.created_by || null,
    };

    const { data, error } = await supabase
      .from('workspace_boards')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create workspace board');
    }

    return data as WorkspaceBoard;
  },

  /**
   * Updates an existing board's metadata or target notification channel.
   */
  async updateBoard(boardId: string, updates: Partial<WorkspaceBoard>): Promise<WorkspaceBoard> {
    const { data, error } = await supabase
      .from('workspace_boards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update board');
    }

    return data as WorkspaceBoard;
  },

  /**
   * Deletes a board and cascades its action items.
   */
  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Fetches all action items for a given board, with meeting title resolution.
   */
  async getBoardActionItems(boardId: string): Promise<BoardActionItem[]> {
    try {
      const { data, error } = await supabase
        .from('board_action_items')
        .select(`
          *,
          meetings(room_name, room_code)
        `)
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[WorkBoardService] Error fetching board action items:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        board_id: row.board_id,
        workspace_id: row.workspace_id,
        meeting_id: row.meeting_id,
        meeting_title: row.meetings?.room_name || undefined,
        meeting_code: row.meetings?.room_code || undefined,
        title: row.title,
        description: row.description,
        status: row.status,
        category: row.category,
        assignee_id: row.assignee_id,
        assignee_name: row.assignee_name || 'Unassigned',
        assignee_avatar: row.assignee_avatar,
        due_date: row.due_date,
        priority: row.priority || 'medium',
        evidence_quote: row.evidence_quote,
        evidence_timestamp_ms: row.evidence_timestamp_ms,
        evidence_speaker: row.evidence_speaker,
        created_by: row.created_by,
        completed_at: row.completed_at,
        completed_by: row.completed_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error('[WorkBoardService] Exception fetching board action items:', err);
      return [];
    }
  },

  /**
   * Fetches all action items generated from a specific meeting.
   */
  async getMeetingActionItems(meetingIdOrCode: string): Promise<BoardActionItem[]> {
    try {
      const dbMeetingUuid = await resolveMeetingUuid(meetingIdOrCode);
      if (!dbMeetingUuid) return [];

      const { data, error } = await supabase
        .from('board_action_items')
        .select(`
          *,
          meetings(room_name, room_code)
        `)
        .eq('meeting_id', dbMeetingUuid)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[WorkBoardService] Error fetching meeting action items:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        board_id: row.board_id,
        workspace_id: row.workspace_id,
        meeting_id: row.meeting_id,
        meeting_title: row.meetings?.room_name || undefined,
        meeting_code: row.meetings?.room_code || undefined,
        title: row.title,
        description: row.description,
        status: row.status,
        category: row.category,
        assignee_id: row.assignee_id,
        assignee_name: row.assignee_name || 'Unassigned',
        assignee_avatar: row.assignee_avatar,
        due_date: row.due_date,
        priority: row.priority || 'medium',
        evidence_quote: row.evidence_quote,
        evidence_timestamp_ms: row.evidence_timestamp_ms,
        evidence_speaker: row.evidence_speaker,
        created_by: row.created_by,
        completed_at: row.completed_at,
        completed_by: row.completed_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error('[WorkBoardService] Exception in getMeetingActionItems:', err);
      return [];
    }
  },

  /**
   * Fetches all action items across all boards in a workspace (for dashboard rollup).
   */
  async getWorkspaceActionItems(workspaceId: string): Promise<BoardActionItem[]> {
    try {
      const { data, error } = await supabase
        .from('board_action_items')
        .select(`
          *,
          meetings(room_name, room_code)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[WorkBoardService] Error fetching workspace action items:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        board_id: row.board_id,
        workspace_id: row.workspace_id,
        meeting_id: row.meeting_id,
        meeting_title: row.meetings?.room_name || undefined,
        meeting_code: row.meetings?.room_code || undefined,
        title: row.title,
        description: row.description,
        status: row.status,
        category: row.category,
        assignee_id: row.assignee_id,
        assignee_name: row.assignee_name || 'Unassigned',
        assignee_avatar: row.assignee_avatar,
        due_date: row.due_date,
        priority: row.priority || 'medium',
        evidence_quote: row.evidence_quote,
        evidence_timestamp_ms: row.evidence_timestamp_ms,
        evidence_speaker: row.evidence_speaker,
        created_by: row.created_by,
        completed_at: row.completed_at,
        completed_by: row.completed_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error('[WorkBoardService] Exception fetching workspace action items:', err);
      return [];
    }
  },

  /**
   * Creates an action item or milestone on a board.
   */
  async createActionItem(params: CreateActionItemParams): Promise<BoardActionItem> {
    const dbMeetingUuid = await resolveMeetingUuid(params.meeting_id);

    const payload = {
      board_id: params.board_id,
      workspace_id: params.workspace_id,
      meeting_id: dbMeetingUuid,
      title: params.title.trim(),
      description: params.description?.trim() || '',
      status: params.status || 'todo',
      category: params.category || 'action_item',
      assignee_id: params.assignee_id || null,
      assignee_name: params.assignee_name?.trim() || 'Unassigned',
      assignee_avatar: params.assignee_avatar || null,
      due_date: params.due_date || null,
      priority: params.priority || 'medium',
      evidence_quote: params.evidence_quote || null,
      evidence_timestamp_ms: params.evidence_timestamp_ms || null,
      evidence_speaker: params.evidence_speaker || null,
      created_by: params.created_by || null,
    };

    const { data, error } = await supabase
      .from('board_action_items')
      .insert([payload])
      .select(`
        *,
        meetings(room_name, room_code)
      `)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create action item');
    }

    return {
      id: data.id,
      board_id: data.board_id,
      workspace_id: data.workspace_id,
      meeting_id: data.meeting_id,
      meeting_title: data.meetings?.room_name || undefined,
      meeting_code: data.meetings?.room_code || undefined,
      title: data.title,
      description: data.description,
      status: data.status,
      category: data.category,
      assignee_id: data.assignee_id,
      assignee_name: data.assignee_name || 'Unassigned',
      assignee_avatar: data.assignee_avatar,
      due_date: data.due_date,
      priority: data.priority,
      evidence_quote: data.evidence_quote,
      evidence_timestamp_ms: data.evidence_timestamp_ms,
      evidence_speaker: data.evidence_speaker,
      created_by: data.created_by,
      completed_at: data.completed_at,
      completed_by: data.completed_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  /**
   * Updates an action item's status.
   * When status is transitioned to 'done', automatically notifies the board's designated workspace channel!
   */
  async updateActionItemStatus(
    itemId: string,
    newStatus: BoardActionStatus,
    userId?: string,
    userName?: string
  ): Promise<BoardActionItem> {
    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'done') {
      updatePayload.completed_at = new Date().toISOString();
      updatePayload.completed_by = userId || null;
    } else {
      updatePayload.completed_at = null;
      updatePayload.completed_by = null;
    }

    const { data, error } = await supabase
      .from('board_action_items')
      .update(updatePayload)
      .eq('id', itemId)
      .select(`
        *,
        meetings(room_name, room_code),
        workspace_boards(name, target_channel_name)
      `)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update action item status');
    }

    const updatedItem: BoardActionItem = {
      id: data.id,
      board_id: data.board_id,
      workspace_id: data.workspace_id,
      meeting_id: data.meeting_id,
      meeting_title: data.meetings?.room_name || undefined,
      meeting_code: data.meetings?.room_code || undefined,
      title: data.title,
      description: data.description,
      status: data.status,
      category: data.category,
      assignee_id: data.assignee_id,
      assignee_name: data.assignee_name || 'Unassigned',
      assignee_avatar: data.assignee_avatar,
      due_date: data.due_date,
      priority: data.priority,
      evidence_quote: data.evidence_quote,
      evidence_timestamp_ms: data.evidence_timestamp_ms,
      evidence_speaker: data.evidence_speaker,
      created_by: data.created_by,
      completed_at: data.completed_at,
      completed_by: data.completed_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // If marked as done, broadcast an automated celebration notification to the workspace channel!
    if (newStatus === 'done') {
      const board = data.workspace_boards;
      const targetChannel = board?.target_channel_name || '# General';
      const boardName = board?.name || 'Team Board';
      const actorName = userName || updatedItem.assignee_name || 'A team member';
      const meetingLabel = updatedItem.meeting_title
        ? `📅 Meeting: **${updatedItem.meeting_title}**`
        : '';
      const quoteBlock = updatedItem.evidence_quote
        ? `\n> *“${updatedItem.evidence_quote}”* — ${updatedItem.evidence_speaker || 'Speaker'}`
        : '';

      const celebrationMessage = `🎉 **Action Item Completed!**\n\n**${actorName}** completed:\n**"${updatedItem.title}"**\n\n📋 Board: **${boardName}**${meetingLabel ? `\n${meetingLabel}` : ''}${quoteBlock}`;

      try {
        await WorkspaceService.sendWorkspaceMessage({
          workspaceId: data.workspace_id,
          channelName: targetChannel,
          senderId: 'talk2me-ai',
          senderName: 'Talk2Me Work Assistant',
          content: celebrationMessage,
          isAi: true,
          sources: [boardName, updatedItem.meeting_title || 'Meeting'].filter(Boolean),
        });
      } catch (notifyErr) {
        console.warn('[WorkBoardService] Channel completion notification warning:', notifyErr);
      }
    }

    return updatedItem;
  },

  /**
   * Deletes an action item.
   */
  async deleteActionItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('board_action_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Real-time subscription for action items on a specific board.
   */
  subscribeToBoardActionItems(boardId: string, onUpdate: () => void) {
    const channel = supabase
      .channel(`board-actions-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_action_items',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Real-time subscription for action items created in a specific meeting.
   */
  subscribeToMeetingActionItems(meetingId: string, onUpdate: () => void) {
    const channel = supabase
      .channel(`meeting-actions-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_action_items',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

