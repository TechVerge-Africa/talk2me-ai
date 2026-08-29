-- Migration: Workspace Visual Whiteboard & Realtime Collaboration
-- File: supabase/migrations/20260829000000_workspace_visual_whiteboard.sql

-- 1. Create workspace_boards table
CREATE TABLE IF NOT EXISTS public.workspace_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Main Board',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create workspace_board_notes table
CREATE TABLE IF NOT EXISTS public.workspace_board_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.workspace_boards(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Team Member',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow',
  category TEXT NOT NULL DEFAULT 'idea',
  pos_x INTEGER NOT NULL DEFAULT 100,
  pos_y INTEGER NOT NULL DEFAULT 100,
  width INTEGER NOT NULL DEFAULT 230,
  height INTEGER NOT NULL DEFAULT 180,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_workspace_boards_ws_id ON public.workspace_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_board_notes_board_id ON public.workspace_board_notes(board_id);
CREATE INDEX IF NOT EXISTS idx_workspace_board_notes_ws_id ON public.workspace_board_notes(workspace_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.workspace_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_board_notes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for workspace_boards
CREATE POLICY "Allow members to read workspace boards" ON public.workspace_boards
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow members to insert workspace boards" ON public.workspace_boards
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow members to update workspace boards" ON public.workspace_boards
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow members to delete workspace boards" ON public.workspace_boards
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. RLS Policies for workspace_board_notes
CREATE POLICY "Allow members to read board notes" ON public.workspace_board_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow members to insert board notes" ON public.workspace_board_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow members to update board notes" ON public.workspace_board_notes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow members to delete board notes" ON public.workspace_board_notes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 7. Enable Realtime Publication for workspace_board_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'workspace_board_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_board_notes;
  END IF;
END $$;
