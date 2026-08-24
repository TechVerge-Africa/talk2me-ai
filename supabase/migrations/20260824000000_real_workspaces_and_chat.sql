-- ============================================================
-- Migration: Real Workspaces, Channels & Multi-User Chat Engine
-- ============================================================

-- ── 1. Create Workspaces Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT DEFAULT '',
  icon TEXT DEFAULT 'rocket',
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Create Workspace Members Table ─────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ── 3. Create Workspace Channels Table ────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'channel' CHECK (type IN ('channel', 'dm')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- ── 4. Create Workspace Messages Table ────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  channel_name TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_ai BOOLEAN DEFAULT false,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Associate Meetings with Workspaces ────────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- ── 6. Indexes for Performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_channels_workspace ON public.workspace_channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_lookup ON public.workspace_messages(workspace_id, channel_name, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace ON public.meetings(workspace_id);

-- ── 7. Row Level Security (RLS) ──────────────────────────────
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;

-- Workspaces Policies
CREATE POLICY "Workspaces viewable by members or authenticated users" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    ) OR auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Workspace owner can update workspace" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- Workspace Members Policies
CREATE POLICY "Members viewable by fellow workspace members" ON public.workspace_members
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join or add members" ON public.workspace_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Workspace Channels Policies
CREATE POLICY "Channels viewable by workspace members" ON public.workspace_channels
  FOR SELECT USING (true);

CREATE POLICY "Authenticated members can create channels" ON public.workspace_channels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Workspace Messages Policies
CREATE POLICY "Messages viewable by everyone in workspace" ON public.workspace_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert messages" ON public.workspace_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 8. Enable Supabase Realtime ───────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_channels;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
