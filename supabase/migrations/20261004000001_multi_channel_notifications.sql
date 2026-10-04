-- ============================================================
-- Migration: Multi-Channel Notifications (SMS, Email, Push)
-- ============================================================

-- ── 1. Update Profiles with Contact & Notification Preferences ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "channels": {
      "email": true,
      "sms": false,
      "push": true
    },
    "events": {
      "meeting_reminders": true,
      "urgent_messages": true
    }
  }'::jsonb;

-- ── 2. Add Priority & Important Flag to Workspace Messages ────
ALTER TABLE public.workspace_messages
  ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent'));

-- ── 3. Add Reminder Configuration to Meetings ───────────────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS send_reminders BOOLEAN DEFAULT true;

-- ── 4. Create Notification Logs Table (Idempotency & Auditing) ─
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'meeting_reminder_15m', 'meeting_reminder_start', 'urgent_channel_message'
  channel TEXT NOT NULL,    -- 'email', 'sms', 'push'
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  reference_id TEXT NOT NULL, -- meeting_id or message_id
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_notification_delivery UNIQUE(recipient_id, event_type, channel, reference_id)
);

-- ── 5. Indexes for Fast Lookups and Cron Queries ────────────────
CREATE INDEX IF NOT EXISTS idx_notification_logs_lookup 
  ON public.notification_logs(reference_id, event_type, channel);

CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient 
  ON public.notification_logs(recipient_id);

CREATE INDEX IF NOT EXISTS idx_meetings_upcoming_reminders 
  ON public.meetings(scheduled_at, is_active) 
  WHERE scheduled_at IS NOT NULL;

-- ── 6. Row Level Security for Notification Logs ────────────────
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "System or authenticated users can insert notification logs" ON public.notification_logs
  FOR INSERT WITH CHECK (true);
