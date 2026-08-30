import { supabase } from './client';
import { AppError } from '@/services/errors';

export interface WorkspaceBoard {
  id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StickyNoteColor = 'yellow' | 'cyan' | 'pink' | 'green' | 'orange' | 'purple';
export type StickyNoteCategory = 'idea' | 'task' | 'question' | 'decision' | 'note';

export interface WorkspaceStickyNote {
  id: string;
  board_id: string;
  workspace_id: string;
  author_id: string;
  author_name: string;
  content: string;
  color: StickyNoteColor;
  category: StickyNoteCategory;
  pos_x: number;
  pos_y: number;
  width?: number;
  height?: number;
  created_at?: string;
  updated_at?: string;
}

export const WorkspaceBoardService = {
  /**
   * Fetch all whiteboards for a workspace
   */
  async getWorkspaceBoards(workspaceId: string): Promise<WorkspaceBoard[]> {
    if (!workspaceId) return [];
    try {
      const { data, error } = await supabase
        .from('workspace_boards')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[WorkspaceBoardService] Notice fetching boards:', error.message);
        return [];
      }

      return (data || []) as WorkspaceBoard[];
    } catch (err) {
      console.warn('[WorkspaceBoardService] getWorkspaceBoards error:', err);
      return [];
    }
  },

  /**
   * Create a new whiteboard
   */
  async createWorkspaceBoard(
    workspaceId: string,
    title: string,
    description?: string,
    createdBy?: string
  ): Promise<WorkspaceBoard> {
    const payload = {
      workspace_id: workspaceId,
      title: title.trim() || 'Untitled Brainstorm Board',
      description: description?.trim() || null,
      created_by: createdBy || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('workspace_boards')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Fallback for in-memory or custom schema setup
      return {
        id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...payload,
      };
    }

    return data as WorkspaceBoard;
  },

  /**
   * Update whiteboard title & description
   */
  async updateWorkspaceBoardTitle(boardId: string, title: string): Promise<void> {
    if (!boardId) return;
    try {
      await supabase
        .from('workspace_boards')
        .update({ title: title.trim(), updated_at: new Date().toISOString() })
        .eq('id', boardId);
    } catch (err) {
      console.warn('[WorkspaceBoardService] updateWorkspaceBoardTitle warning:', err);
    }
  },

  /**
   * Delete a whiteboard and all its sticky notes
   */
  async deleteWorkspaceBoard(boardId: string): Promise<void> {
    if (!boardId) return;
    try {
      await supabase.from('workspace_board_notes').delete().eq('board_id', boardId);
      await supabase.from('workspace_boards').delete().eq('id', boardId);
    } catch (err) {
      console.warn('[WorkspaceBoardService] deleteWorkspaceBoard warning:', err);
    }
  },

  /**
   * Fetch all sticky notes for a specific board
   */
  async getBoardNotes(boardId: string): Promise<WorkspaceStickyNote[]> {
    if (!boardId) return [];
    try {
      const { data, error } = await supabase
        .from('workspace_board_notes')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[WorkspaceBoardService] Notice fetching board notes:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        board_id: row.board_id,
        workspace_id: row.workspace_id,
        author_id: row.author_id || 'unknown',
        author_name: row.author_name || 'Member',
        content: row.content || '',
        color: (row.color as StickyNoteColor) || 'yellow',
        category: (row.category as StickyNoteCategory) || 'idea',
        pos_x: Number(row.pos_x || 0),
        pos_y: Number(row.pos_y || 0),
        width: Number(row.width || 220),
        height: Number(row.height || 180),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.warn('[WorkspaceBoardService] getBoardNotes error:', err);
      return [];
    }
  },

  /**
   * Create or update a sticky note
   */
  async saveBoardNote(note: Partial<WorkspaceStickyNote> & { board_id: string; workspace_id: string }): Promise<WorkspaceStickyNote> {
    const isUuid = note.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(note.id);
    const id = isUuid
      ? note.id!
      : typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Math.random().toString(36).slice(2, 14).padEnd(12, '0')}`;

    const payload = {
      id,
      board_id: note.board_id,
      workspace_id: note.workspace_id,
      author_id: note.author_id || 'unknown',
      author_name: note.author_name || 'Member',
      content: note.content || '',
      color: note.color || 'yellow',
      category: note.category || 'idea',
      pos_x: Math.round(note.pos_x || 100),
      pos_y: Math.round(note.pos_y || 100),
      width: note.width || 220,
      height: note.height || 180,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('workspace_board_notes')
        .upsert([payload])
        .select()
        .single();

      if (error) {
        console.warn('[WorkspaceBoardService] saveBoardNote upsert notice:', error.message);
        return payload as WorkspaceStickyNote;
      }
      return data as WorkspaceStickyNote;
    } catch (err) {
      return payload as WorkspaceStickyNote;
    }
  },

  /**
   * Update sticky note coordinates
   */
  async updateNotePosition(noteId: string, pos_x: number, pos_y: number): Promise<void> {
    if (!noteId) return;
    try {
      await supabase
        .from('workspace_board_notes')
        .update({ pos_x: Math.round(pos_x), pos_y: Math.round(pos_y), updated_at: new Date().toISOString() })
        .eq('id', noteId);
    } catch (err) {
      console.warn('[WorkspaceBoardService] updateNotePosition warning:', err);
    }
  },

  /**
   * Update sticky note size (width & height)
   */
  async updateNoteSize(noteId: string, width: number, height: number): Promise<void> {
    if (!noteId) return;
    try {
      await supabase
        .from('workspace_board_notes')
        .update({ width: Math.round(width), height: Math.round(height), updated_at: new Date().toISOString() })
        .eq('id', noteId);
    } catch (err) {
      console.warn('[WorkspaceBoardService] updateNoteSize warning:', err);
    }
  },

  /**
   * Update sticky note content
   */
  async updateNoteContent(noteId: string, content: string, color?: StickyNoteColor, category?: StickyNoteCategory): Promise<void> {
    if (!noteId) return;
    try {
      const updateData: any = { content, updated_at: new Date().toISOString() };
      if (color) updateData.color = color;
      if (category) updateData.category = category;

      await supabase
        .from('workspace_board_notes')
        .update(updateData)
        .eq('id', noteId);
    } catch (err) {
      console.warn('[WorkspaceBoardService] updateNoteContent warning:', err);
    }
  },

  /**
   * Delete a sticky note
   */
  async deleteBoardNote(noteId: string): Promise<void> {
    if (!noteId) return;
    try {
      await supabase.from('workspace_board_notes').delete().eq('id', noteId);
    } catch (err) {
      console.warn('[WorkspaceBoardService] deleteBoardNote warning:', err);
    }
  },
};
