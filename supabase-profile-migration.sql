-- BrewSpot profile editing migration
-- Run this once in Supabase Dashboard -> SQL Editor against the project used
-- by VITE_SUPABASE_URL/SUPABASE_URL. It is safe to run more than once.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_type TEXT NOT NULL DEFAULT 'default',
  avatar_path TEXT NOT NULL DEFAULT 'coffee-beans.png',
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT profiles_avatar_type CHECK (avatar_type IN ('default', 'uploaded'))
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_type TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT NOT NULL DEFAULT 'coffee-beans.png';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Import old rows only where the same UUID is also a Supabase Auth user.
-- Existing profile rows are never overwritten.
INSERT INTO public.profiles (id, username, display_name, avatar_url)
SELECT
  u.id,
  left(regexp_replace(lower(coalesce(nullif(u.name, ''), 'user')), '[^a-z0-9_]', '_', 'g') || '_' || left(replace(u.id::text, '-', ''), 4), 30),
  coalesce(nullif(u.name, ''), 'User'),
  u.profile
FROM public.users u
JOIN auth.users au ON au.id = u.id
ON CONFLICT (id) DO NOTHING;

-- Ensure every Auth user can edit a profile, including users created before
-- the profile trigger existed.
INSERT INTO public.profiles (id, username, display_name)
SELECT
  au.id,
  left(regexp_replace(lower(coalesce(nullif(au.raw_user_meta_data->>'username', ''), split_part(au.email, '@', 1), 'user')), '[^a-z0-9_]', '_', 'g') || '_' || left(replace(au.id::text, '-', ''), 4), 30),
  coalesce(nullif(au.raw_user_meta_data->>'display_name', ''), nullif(au.raw_user_meta_data->>'name', ''), split_part(au.email, '@', 1), 'User')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  candidate TEXT;
BEGIN
  base_username := lower(regexp_replace(coalesce(nullif(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1), 'user'), '[^a-z0-9_]', '_', 'g'));
  base_username := left(base_username, 24);
  IF length(base_username) < 3 THEN base_username := 'user'; END IF;
  candidate := left(base_username || '_' || left(replace(NEW.id::text, '-', ''), 4), 30);

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, candidate, coalesce(nullif(NEW.raw_user_meta_data->>'display_name', ''), nullif(NEW.raw_user_meta_data->>'name', ''), 'User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Align existing Auth display names/usernames with the profile table.
-- Profiles are the app source of truth; this keeps the Auth dashboard and
-- future Auth-trigger fallbacks consistent for the same UID.
UPDATE auth.users au
SET raw_user_meta_data = coalesce(au.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'name', p.display_name,
    'display_name', p.display_name,
    'username', p.username
  )
FROM public.profiles p
WHERE p.id = au.id;

-- The bucket itself must already exist. These policies protect only the
-- user's own {auth.uid()}/... folder.
UPDATE storage.buckets SET public = true WHERE id = 'profile-defaults';
DROP POLICY IF EXISTS "Public default avatars read" ON storage.objects;
CREATE POLICY "Public default avatars read" ON storage.objects FOR SELECT USING (bucket_id = 'profile-defaults');
DROP POLICY IF EXISTS "Public profile images read" ON storage.objects;
CREATE POLICY "Public profile images read" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
DROP POLICY IF EXISTS "Users insert own profile image" ON storage.objects;
CREATE POLICY "Users insert own profile image" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users update own profile image" ON storage.objects;
CREATE POLICY "Users update own profile image" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users delete own profile image" ON storage.objects;
CREATE POLICY "Users delete own profile image" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);
