-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  role TEXT DEFAULT 'user',
  is_interpreter BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  room_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  start_time FLOAT NOT NULL, -- Offset in seconds from meeting start
  end_time FLOAT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Meetings Policies
CREATE POLICY "Meetings are viewable by everyone" ON public.meetings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Transcripts Policies
CREATE POLICY "Transcripts are viewable by meeting participants" ON public.transcripts
  FOR SELECT USING (true); -- Simplified for now, can be restricted later

CREATE POLICY "Authenticated users can insert transcripts" ON public.transcripts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
