-- ============================================================
-- Migration: Persistent Workspace AI Memory System
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'fact' CHECK (category IN ('decision', 'spec', 'fact', 'user_preference', 'summary', 'action_item')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::text[],
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('meeting', 'chat', 'manual', 'ai_extraction')),
  source_id TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_workspace_memories_workspace ON public.workspace_memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memories_category ON public.workspace_memories(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_workspace_memories_created ON public.workspace_memories(workspace_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.workspace_memories ENABLE ROW LEVEL SECURITY;

-- Workspace Memories RLS Policies
CREATE POLICY "Memories viewable by workspace members" ON public.workspace_memories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_memories.workspace_id
        AND workspace_members.user_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated workspace members can insert memories" ON public.workspace_memories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated workspace members can update memories" ON public.workspace_memories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated workspace members can delete memories" ON public.workspace_memories
  FOR DELETE USING (auth.role() = 'authenticated');

-- Enable Supabase Realtime for workspace_memories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_memories;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
