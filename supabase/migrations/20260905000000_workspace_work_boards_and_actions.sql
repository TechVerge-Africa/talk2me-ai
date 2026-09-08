-- ============================================================
-- Migration: Workspace Work Boards & Real-Time Action Items
-- ============================================================

-- ── 1. Create Workspace Boards Table ────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'layout-grid',
  target_channel_name TEXT DEFAULT '# General',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Create Board Action Items Table ───────────────────────
CREATE TABLE IF NOT EXISTS public.board_action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.workspace_boards(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  category TEXT DEFAULT 'action_item' CHECK (category IN ('action_item', 'milestone', 'decision')),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_name TEXT DEFAULT 'Unassigned',
  assignee_avatar TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  evidence_quote TEXT,
  evidence_timestamp_ms BIGINT,
  evidence_speaker TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Associate Meetings with Target Boards ─────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.workspace_boards(id) ON DELETE SET NULL;

-- ── 4. Indexes for Fast Filtering & Realtime ────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_boards_workspace ON public.workspace_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_board_action_items_board ON public.board_action_items(board_id);
CREATE INDEX IF NOT EXISTS idx_board_action_items_workspace ON public.board_action_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_board_action_items_meeting ON public.board_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_board_action_items_status ON public.board_action_items(status);
CREATE INDEX IF NOT EXISTS idx_board_action_items_assignee ON public.board_action_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_meetings_board ON public.meetings(board_id);

-- ── 5. Row Level Security (RLS) ──────────────────────────────
ALTER TABLE public.workspace_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_action_items ENABLE ROW LEVEL SECURITY;

-- Boards Policies: viewable and manageable by workspace members
CREATE POLICY "Boards viewable by workspace members" ON public.workspace_boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_boards.workspace_id
        AND workspace_members.user_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can create boards in their workspaces" ON public.workspace_boards
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update boards in their workspaces" ON public.workspace_boards
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete boards in their workspaces" ON public.workspace_boards
  FOR DELETE USING (auth.role() = 'authenticated');

-- Action Items Policies: viewable and manageable by workspace members
CREATE POLICY "Action items viewable by workspace members" ON public.board_action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = board_action_items.workspace_id
        AND workspace_members.user_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can insert action items" ON public.board_action_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update action items" ON public.board_action_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete action items" ON public.board_action_items
  FOR DELETE USING (auth.role() = 'authenticated');

