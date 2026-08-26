-- ============================================================
-- Migration: Enable Realtime for workspace_members
-- ============================================================
-- workspace_members was omitted from the supabase_realtime publication
-- in the original workspaces migration. This adds it so that
-- INSERT/DELETE events on this table are broadcast to subscribers,
-- enabling live member list updates in the dashboard.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
