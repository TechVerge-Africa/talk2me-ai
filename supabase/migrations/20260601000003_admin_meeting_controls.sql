-- Create meeting_participants table for persistent admin & lobby control
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  identity TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'cohost', 'participant')),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'rejected', 'left')),
  is_muted BOOLEAN DEFAULT false,
  is_video_off BOOLEAN DEFAULT false,
  hand_raised BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, identity)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_status ON public.meeting_participants(status);

-- Enable Row Level Security
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_participants
-- 1. Anyone can view participants in active meetings
CREATE POLICY "Meeting participants are viewable by everyone in meeting" ON public.meeting_participants
  FOR SELECT USING (true);

-- 2. Authenticated users & guests can insert themselves into meeting_participants
CREATE POLICY "Anyone can join meeting participants" ON public.meeting_participants
  FOR INSERT WITH CHECK (true);

-- 3. Participants can update their own row OR meeting hosts/co-hosts can update participant rows
CREATE POLICY "Participants and Hosts can update participant status" ON public.meeting_participants
  FOR UPDATE USING (
    identity = auth.uid()::text 
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = meeting_participants.meeting_id
        AND meetings.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.meeting_participants AS mp
      WHERE mp.meeting_id = meeting_participants.meeting_id
        AND (mp.user_id = auth.uid() OR mp.identity = auth.uid()::text)
        AND mp.role IN ('host', 'cohost')
    )
  );

-- Enable Realtime for meeting_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;
