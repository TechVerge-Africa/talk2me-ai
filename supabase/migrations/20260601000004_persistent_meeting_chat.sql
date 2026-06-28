-- Create meeting_messages table for persistent chat history
CREATE TABLE IF NOT EXISTS public.meeting_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  recipient_id TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by room_code
CREATE INDEX IF NOT EXISTS idx_meeting_messages_room_code ON public.meeting_messages(room_code);

-- Enable RLS
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Meeting messages are viewable by everyone in room" ON public.meeting_messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone in room can insert meeting messages" ON public.meeting_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Hosts can delete meeting messages" ON public.meeting_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.room_code = meeting_messages.room_code
        AND meetings.host_id = auth.uid()
    )
  );

-- Enable Realtime for meeting_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_messages;
