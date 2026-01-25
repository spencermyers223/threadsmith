-- Onboarding & Creator Hub Schema (SAFE VERSION)
-- Run this in Supabase SQL Editor - handles existing objects gracefully

-- ============================================================================
-- 1. CONTENT_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null unique,
  niche text,
  content_goal text,
  target_audience text,
  admired_accounts text[] default '{}',
  posts_per_day integer default 2,
  preferred_times text[] default '{}',
  timezone text default 'America/New_York',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add new columns for extended onboarding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'struggles') THEN
    ALTER TABLE public.content_profiles ADD COLUMN struggles text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'growth_stage') THEN
    ALTER TABLE public.content_profiles ADD COLUMN growth_stage text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'time_spent') THEN
    ALTER TABLE public.content_profiles ADD COLUMN time_spent text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_niche') THEN
    ALTER TABLE public.content_profiles ADD COLUMN primary_niche text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'secondary_interests') THEN
    ALTER TABLE public.content_profiles ADD COLUMN secondary_interests text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'specific_protocols') THEN
    ALTER TABLE public.content_profiles ADD COLUMN specific_protocols text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'voice_examples') THEN
    ALTER TABLE public.content_profiles ADD COLUMN voice_examples text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'voice_description') THEN
    ALTER TABLE public.content_profiles ADD COLUMN voice_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'tone_formal_casual') THEN
    ALTER TABLE public.content_profiles ADD COLUMN tone_formal_casual integer default 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'tone_hedged_direct') THEN
    ALTER TABLE public.content_profiles ADD COLUMN tone_hedged_direct integer default 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'tone_serious_playful') THEN
    ALTER TABLE public.content_profiles ADD COLUMN tone_serious_playful integer default 3;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_goal') THEN
    ALTER TABLE public.content_profiles ADD COLUMN primary_goal text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'content_frequency') THEN
    ALTER TABLE public.content_profiles ADD COLUMN content_frequency text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.content_profiles ADD COLUMN onboarding_completed boolean default false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'posting_schedule') THEN
    ALTER TABLE public.content_profiles ADD COLUMN posting_schedule jsonb default '{"postsPerDay": 2, "preferredTimes": [], "timezone": "America/New_York"}'::jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.content_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own content profile" ON public.content_profiles;
DROP POLICY IF EXISTS "Users can insert own content profile" ON public.content_profiles;
DROP POLICY IF EXISTS "Users can update own content profile" ON public.content_profiles;
DROP POLICY IF EXISTS "Users can delete own content profile" ON public.content_profiles;

CREATE POLICY "Users can view own content profile" ON public.content_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content profile" ON public.content_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content profile" ON public.content_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content profile" ON public.content_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_content_profiles_user_id ON public.content_profiles(user_id);

-- ============================================================================
-- 2. FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'parent_id') THEN
    ALTER TABLE public.folders ADD COLUMN parent_id uuid references public.folders on delete cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'folders' AND column_name = 'position') THEN
    ALTER TABLE public.folders ADD COLUMN position integer default 0;
  END IF;
END $$;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);

-- ============================================================================
-- 3. TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  color text default '#3b82f6',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_user_id_name_key') THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;

CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- ============================================================================
-- 4. ALTER FILES TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'folder_id') THEN
    ALTER TABLE public.files ADD COLUMN folder_id uuid references public.folders on delete set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'tags') THEN
    ALTER TABLE public.files ADD COLUMN tags text[] default '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'original_filename') THEN
    ALTER TABLE public.files ADD COLUMN original_filename text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);

-- ============================================================================
-- 5. ALTER POSTS TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'source_file_id') THEN
    ALTER TABLE public.files ADD COLUMN source_file_id uuid references public.files on delete set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'topic') THEN
    ALTER TABLE public.posts ADD COLUMN topic text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'post_type') THEN
    ALTER TABLE public.posts ADD COLUMN post_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'is_thread') THEN
    ALTER TABLE public.posts ADD COLUMN is_thread boolean default false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'tags') THEN
    ALTER TABLE public.posts ADD COLUMN tags text[] default '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_source_file_id ON public.posts(source_file_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

-- ============================================================================
-- 6. DEFAULT FOLDERS FUNCTION & TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_folders()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.folders (user_id, name, position)
  VALUES
    (NEW.id, 'Drafts', 0),
    (NEW.id, 'Research', 1),
    (NEW.id, 'Published', 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_create_folders ON public.profiles;

CREATE TRIGGER on_profile_created_create_folders
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_folders();

-- ============================================================================
-- 7. CREATE DEFAULT FOLDERS FOR EXISTING USERS
-- ============================================================================

INSERT INTO public.folders (user_id, name, position)
SELECT p.id, 'Drafts', 0 FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.folders f WHERE f.user_id = p.id AND f.name = 'Drafts')
ON CONFLICT DO NOTHING;

INSERT INTO public.folders (user_id, name, position)
SELECT p.id, 'Research', 1 FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.folders f WHERE f.user_id = p.id AND f.name = 'Research')
ON CONFLICT DO NOTHING;

INSERT INTO public.folders (user_id, name, position)
SELECT p.id, 'Published', 2 FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.folders f WHERE f.user_id = p.id AND f.name = 'Published')
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Migration completed successfully' as status;
