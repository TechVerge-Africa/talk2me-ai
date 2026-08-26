import { supabase } from './client';

export type MemoryCategory = 'decision' | 'spec' | 'fact' | 'user_preference' | 'summary' | 'action_item';
export type MemorySourceType = 'meeting' | 'chat' | 'manual' | 'ai_extraction';

export interface DbWorkspaceMemory {
  id: string;
  workspace_id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  source_type: MemorySourceType;
  source_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryParams {
  workspace_id: string;
  category?: MemoryCategory;
  title: string;
  content: string;
  tags?: string[];
  source_type?: MemorySourceType;
  source_id?: string;
  created_by?: string;
}

export const WorkspaceMemoryService = {
  /**
   * Fetch all long-term memories for a specific workspace.
   */
  async getWorkspaceMemories(workspaceId: string): Promise<DbWorkspaceMemory[]> {
    if (!workspaceId) return [];

    const { data, error } = await supabase
      .from('workspace_memories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WorkspaceMemoryService.getWorkspaceMemories] Error:', error);
      return [];
    }

    return (data as DbWorkspaceMemory[]) || [];
  },

  /**
   * Create a new memory record.
   */
  async createMemory(params: CreateMemoryParams): Promise<DbWorkspaceMemory | null> {
    const { data, error } = await supabase
      .from('workspace_memories')
      .insert({
        workspace_id: params.workspace_id,
        category: params.category || 'fact',
        title: params.title,
        content: params.content,
        tags: params.tags || [],
        source_type: params.source_type || 'manual',
        source_id: params.source_id || null,
        created_by: params.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[WorkspaceMemoryService.createMemory] Error:', error);
      throw new Error(error.message || 'Failed to create memory');
    }

    return data as DbWorkspaceMemory;
  },

  /**
   * Update an existing memory record.
   */
  async updateMemory(
    id: string,
    updates: Partial<Pick<DbWorkspaceMemory, 'category' | 'title' | 'content' | 'tags'>>
  ): Promise<DbWorkspaceMemory | null> {
    const { data, error } = await supabase
      .from('workspace_memories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[WorkspaceMemoryService.updateMemory] Error:', error);
      throw new Error(error.message || 'Failed to update memory');
    }

    return data as DbWorkspaceMemory;
  },

  /**
   * Delete a memory item by ID.
   */
  async deleteMemory(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('workspace_memories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[WorkspaceMemoryService.deleteMemory] Error:', error);
      return false;
    }

    return true;
  },

  /**
   * Search workspace memories by keyword.
   */
  async searchMemories(workspaceId: string, query: string): Promise<DbWorkspaceMemory[]> {
    if (!workspaceId || !query.trim()) return this.getWorkspaceMemories(workspaceId);

    const { data, error } = await supabase
      .from('workspace_memories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WorkspaceMemoryService.searchMemories] Error:', error);
      return [];
    }

    return (data as DbWorkspaceMemory[]) || [];
  },
};
