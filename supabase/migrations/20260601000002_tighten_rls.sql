-- Tighten transcript SELECT policy: only allow users to read transcripts
-- from meetings where they are the host or they authored a transcript.
DROP POLICY IF EXISTS "Transcripts are viewable by meeting participants" ON public.transcripts;

CREATE POLICY "Transcripts are viewable by meeting participants" ON public.transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE meetings.id = transcripts.meeting_id
        AND meetings.host_id = auth.uid()
    )
    OR user_id = auth.uid()::text
  );

-- Add UPDATE policy for meetings so only the host can modify their own meeting.
CREATE POLICY "Hosts can update their own meetings" ON public.meetings
  FOR UPDATE USING (host_id = auth.uid());

-- Add DELETE policy for meetings so only the host can delete their own meeting.
CREATE POLICY "Hosts can delete their own meetings" ON public.meetings
  FOR DELETE USING (host_id = auth.uid());
