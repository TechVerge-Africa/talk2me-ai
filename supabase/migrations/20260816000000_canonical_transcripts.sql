-- ============================================================
-- Migration: Canonical Transcripts & AI Decisions Engine
-- ============================================================

-- Add canonical transcript columns to public.transcripts
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS start_ms BIGINT,
  ADD COLUMN IF NOT EXISTS end_ms BIGINT,
  ADD COLUMN IF NOT EXISTS speaker_id TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS words JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'final',
  ADD COLUMN IF NOT EXISTS turn_id TEXT;

-- Create index for canonical transcript time queries
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_start_ms
  ON public.transcripts(meeting_id, start_ms ASC);

-- Create meeting_decisions table for AI-extracted proposals, questions, decisions & action items
CREATE TABLE IF NOT EXISTS public.meeting_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('proposal', 'question', 'suggestion', 'decision', 'action_item')),
  text TEXT NOT NULL,
  evidence_speaker TEXT NOT NULL,
  evidence_timestamp_ms BIGINT NOT NULL,
  evidence_quote TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on meeting_decisions
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

-- Meeting decisions read/write policies
CREATE POLICY "Decisions viewable by meeting participants" ON public.meeting_decisions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert decisions" ON public.meeting_decisions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting
  ON public.meeting_decisions(meeting_id, created_at ASC);
