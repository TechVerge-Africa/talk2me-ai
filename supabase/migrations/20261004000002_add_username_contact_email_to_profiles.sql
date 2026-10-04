-- =========================================================================
-- Migration: Add username, contact, and email to public.profiles
-- Supports multi-channel notifications (SMS & Email) sourced directly from profiles
-- =========================================================================

-- 1. Add username, contact, and email columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS contact TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Case-insensitive unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles(LOWER(username))
  WHERE username IS NOT NULL;

-- 3. Index on contact and email for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_contact
  ON public.profiles(contact)
  WHERE contact IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email)
  WHERE email IS NOT NULL;

-- 4. Bidirectional sync between contact and phone_number for backward compatibility
UPDATE public.profiles
SET contact = phone_number
WHERE contact IS NULL AND phone_number IS NOT NULL;

UPDATE public.profiles
SET phone_number = contact
WHERE phone_number IS NULL AND contact IS NOT NULL;

-- 5. Backfill email from auth.users if available
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
EXCEPTION
  WHEN OTHERS THEN
    -- In environments where auth.users cross-schema join is restricted, ignore
    NULL;
END $$;

-- 6. Update user signup trigger to store username, contact, phone_number, and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_contact TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );

  v_contact := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'contact'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'phone_number'), '')
  );

  INSERT INTO public.profiles (
    id,
    email,
    username,
    contact,
    phone_number,
    phone_verified,
    full_name,
    avatar_url
  )
  VALUES (
    new.id,
    new.email,
    v_username,
    v_contact,
    v_contact,
    COALESCE(v_contact IS NOT NULL AND length(v_contact) >= 9, false),
    COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
      v_username,
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    contact = COALESCE(public.profiles.contact, EXCLUDED.contact),
    phone_number = COALESCE(public.profiles.phone_number, EXCLUDED.phone_number),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
