-- Update profiles table with settings and advanced roles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "deaf_mode": false,
  "auto_caption": true,
  "high_contrast": false,
  "sign_language_panel_position": "right"
}'::jsonb;

-- Add index on room_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_meetings_room_code ON public.meetings(room_code);

-- Add index on meeting_id for transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON public.transcripts(meeting_id);
