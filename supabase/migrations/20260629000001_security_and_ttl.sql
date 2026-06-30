-- ============================================================
-- Migration: Security Hardening + Performance + Auto-Cleanup TTL
-- ============================================================

-- ── 1. Add missing scheduled_at column to meetings ──────────
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- ── 2. Composite indexes for all hot query paths ─────────────
-- Most-queried path: look up meeting by room_code + is_active
CREATE INDEX IF NOT EXISTS idx_meetings_room_code_active
  ON public.meetings(room_code, is_active);

-- Meeting messages fast lookup by room + time ordering
CREATE INDEX IF NOT EXISTS idx_meeting_messages_room_created
  ON public.meeting_messages(room_code, created_at DESC);

-- Participants filtered by meeting + status (lobby queries)
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_status
  ON public.meeting_participants(meeting_id, status);

-- Transcripts ordered by time within a meeting
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_start
  ON public.transcripts(meeting_id, start_time ASC);

-- Host's meeting history
CREATE INDEX IF NOT EXISTS idx_meetings_host_created
  ON public.meetings(host_id, created_at DESC);

-- ── 3. Tighten RLS on meeting_messages ───────────────────────
-- Drop the open INSERT policy
DROP POLICY IF EXISTS "Anyone in room can insert meeting messages" ON public.meeting_messages;

-- New: sender must be an admitted participant in the meeting
CREATE POLICY "Only admitted participants can send messages" ON public.meeting_messages
  FOR INSERT WITH CHECK (
    -- Allow if the sender is an admitted participant
    EXISTS (
      SELECT 1 FROM public.meeting_participants AS mp
      JOIN public.meetings AS m ON m.id = mp.meeting_id
      WHERE m.room_code = meeting_messages.room_code
        AND (mp.identity = meeting_messages.sender_id OR mp.user_id::text = meeting_messages.sender_id)
        AND mp.status = 'admitted'
    )
    -- Also allow the host (who may not have a participant row yet)
    OR EXISTS (
      SELECT 1 FROM public.meetings AS m
      WHERE m.room_code = meeting_messages.room_code
        AND m.host_id = auth.uid()
        AND m.is_active = true
    )
  );

-- ── 4. Tighten RLS on meeting_participants ────────────────────
-- Drop the fully open INSERT policy
DROP POLICY IF EXISTS "Anyone can join meeting participants" ON public.meeting_participants;

-- New: can only join an active meeting
CREATE POLICY "Can only join active meetings" ON public.meeting_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
        AND meetings.is_active = true
    )
  );

-- Add DELETE policy: only the participant themselves or the host can remove
DROP POLICY IF EXISTS "Participants or hosts can remove participants" ON public.meeting_participants;
CREATE POLICY "Participants or hosts can remove participants" ON public.meeting_participants
  FOR DELETE USING (
    -- The participant themselves
    user_id = auth.uid()
    OR identity = auth.uid()::text
    -- Or the meeting host
    OR EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
        AND meetings.host_id = auth.uid()
    )
  );

-- ── 5. TTL Auto-Cleanup Function ─────────────────────────────
-- This function purges stale data to keep the DB well under 500MB.
CREATE OR REPLACE FUNCTION public.cleanup_stale_meeting_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete chat messages older than 24 hours
  DELETE FROM public.meeting_messages
  WHERE created_at < NOW() - INTERVAL '24 hours';

  -- Delete participants from meetings that ended more than 1 hour ago
  DELETE FROM public.meeting_participants
  WHERE meeting_id IN (
    SELECT id FROM public.meetings
    WHERE is_active = false
      AND ended_at < NOW() - INTERVAL '1 hour'
  );

  -- Delete transcripts older than 7 days
  DELETE FROM public.transcripts
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Auto-end meetings that are marked active but ended_at is set and over 2 hours ago
  -- (handles cases where endMeeting crashed)
  UPDATE public.meetings
  SET is_active = false
  WHERE is_active = true
    AND ended_at IS NOT NULL
    AND ended_at < NOW() - INTERVAL '2 hours';

  -- Auto-end meetings that have been active for over 12 hours (safety cap)
  UPDATE public.meetings
  SET is_active = false, ended_at = NOW()
  WHERE is_active = true
    AND created_at < NOW() - INTERVAL '12 hours'
    AND ended_at IS NULL;
END;
$$;

-- Grant execute to service_role so the cron endpoint can call it
GRANT EXECUTE ON FUNCTION public.cleanup_stale_meeting_data() TO service_role;

-- ── 6. Schedule cleanup via pg_cron (if extension available) ──
-- pg_cron is available on Supabase free plan.
-- Runs every 15 minutes to keep DB lean.
DO $$
BEGIN
  -- Only schedule if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'talk2me-cleanup',
      '*/15 * * * *',
      'SELECT public.cleanup_stale_meeting_data()'
    );
  END IF;
END;
$$;

-- ── 7. Tighten profile SELECT policy ─────────────────────────
-- Profiles should not be fully public — only basics are needed
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Only authenticated users can see other profiles (prevents scraping)
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (
    auth.role() = 'authenticated'
    OR auth.uid() = id  -- own profile always visible
  );

-- Add INSERT policy for profiles (missing — needed for trigger to work cleanly)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── 8. Content length constraints ────────────────────────────
-- Prevent large payloads at DB level (defense in depth)
ALTER TABLE public.meeting_messages
  ADD CONSTRAINT chk_message_content_length
  CHECK (char_length(content) <= 2000);

ALTER TABLE public.transcripts
  ADD CONSTRAINT chk_transcript_content_length
  CHECK (char_length(content) <= 10000);

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profile_name_length
  CHECK (full_name IS NULL OR char_length(full_name) <= 100);
