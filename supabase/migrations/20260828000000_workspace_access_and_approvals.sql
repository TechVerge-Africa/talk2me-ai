-- ============================================================
-- Migration: Workspace Access Control & Pending Approval Workflow
-- ============================================================

-- 1. Add join_policy to workspaces table ('open' or 'approval')
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS join_policy TEXT DEFAULT 'open' CHECK (join_policy IN ('open', 'approval'));

-- 2. Add status to workspace_members table ('approved', 'pending', 'rejected')
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected'));

-- 3. Add index for pending membership requests lookup
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON public.workspace_members(workspace_id, status);

-- 4. Row Level Security Updates
-- Workspace Members: Workspace owners and admins can update member statuses (approve/reject/roles)
CREATE POLICY "Workspace owners and admins can update workspace members" ON public.workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members owner_check
      WHERE owner_check.workspace_id = workspace_members.workspace_id
        AND owner_check.user_id = auth.uid()
        AND owner_check.role IN ('owner', 'admin')
        AND owner_check.status = 'approved'
    )
  );

CREATE POLICY "Workspace owners and admins can delete workspace members" ON public.workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members owner_check
      WHERE owner_check.workspace_id = workspace_members.workspace_id
        AND owner_check.user_id = auth.uid()
        AND owner_check.role IN ('owner', 'admin')
        AND owner_check.status = 'approved'
    ) OR user_id = auth.uid()
  );

-- Workspace Channels: Owners and admins can delete channels
CREATE POLICY "Workspace owners and admins can delete channels" ON public.workspace_channels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members owner_check
      WHERE owner_check.workspace_id = workspace_channels.workspace_id
        AND owner_check.user_id = auth.uid()
        AND owner_check.role IN ('owner', 'admin')
        AND owner_check.status = 'approved'
    )
  );
