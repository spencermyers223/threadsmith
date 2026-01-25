-- Onboarding & Creator Hub Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================================================
-- 1. CONTENT_PROFILES TABLE
-- ============================================================================
-- This table may already exist from manual creation. We'll create if not exists
-- then add new columns for the extended onboarding flow.

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

-- Add new columns for extended onboarding (Pain Discovery - Phase 1)
DO $$
BEGIN
  -- struggles: multi-select of pain points
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'struggles') THEN
    ALTER TABLE public.content_profiles ADD COLUMN struggles text[] default '{}';
  END IF;

  -- growth_stage: where they are in their journey
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'growth_stage') THEN
    ALTER TABLE public.content_profiles ADD COLUMN growth_stage text;
  END IF;

  -- time_spent: how much time they spend on content
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'time_spent') THEN
    ALTER TABLE public.content_profiles ADD COLUMN time_spent text;
  END IF;
END $$;

-- Add new columns for Profile Setup (Phase 2)
DO $$
BEGIN
  -- Rename niche to primary_niche if it exists, or add primary_niche
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'niche') THEN
    -- Keep niche as alias, add primary_niche as well
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_niche') THEN
      ALTER TABLE public.content_profiles ADD COLUMN primary_niche text;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_niche') THEN
      ALTER TABLE public.content_profiles ADD COLUMN primary_niche text;
    END IF;
  END IF;

  -- primary_niches: multi-select niches (array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_niches') THEN
    ALTER TABLE public.content_profiles ADD COLUMN primary_niches text[] default '{}';
  END IF;

  -- secondary_interests: multi-select
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'secondary_interests') THEN
    ALTER TABLE public.content_profiles ADD COLUMN secondary_interests text[] default '{}';
  END IF;

  -- specific_protocols: free text for chains/protocols they cover
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'specific_protocols') THEN
    ALTER TABLE public.content_profiles ADD COLUMN specific_protocols text;
  END IF;
END $$;

-- Add new columns for Voice Learning
DO $$
BEGIN
  -- voice_examples: pasted example tweets
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'voice_examples') THEN
    ALTER TABLE public.content_profiles ADD COLUMN voice_examples text;
  END IF;

  -- voice_description: described style in words
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'voice_description') THEN
    ALTER TABLE public.content_profiles ADD COLUMN voice_description text;
  END IF;

  -- Tone sliders (1-5 scale)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'tone_formal_casual') THEN
    ALTER TABLE public.content_profiles ADD COLUMN tone_formal_casual integer default 3 check (tone_formal_casual between 1 and 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'tone_hedged_direct') THEN
    ALTER TABLE public.content_profiles ADD COLUMN tone_hedged_direct integer default 3 check (tone_hedged_direct between 1 and 5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'tone_serious_playful') THEN
    ALTER TABLE public.content_profiles ADD COLUMN tone_serious_playful integer default 3 check (tone_serious_playful between 1 and 5);
  END IF;
END $$;

-- Add new columns for Goals
DO $$
BEGIN
  -- primary_goal: main objective (singular - for backwards compatibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_goal') THEN
    ALTER TABLE public.content_profiles ADD COLUMN primary_goal text;
  END IF;

  -- primary_goals: multi-select goals (array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'primary_goals') THEN
    ALTER TABLE public.content_profiles ADD COLUMN primary_goals text[] default '{}';
  END IF;

  -- content_frequency: posting frequency target
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'content_frequency') THEN
    ALTER TABLE public.content_profiles ADD COLUMN content_frequency text;
  END IF;
END $$;

-- Add onboarding state
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE public.content_profiles ADD COLUMN onboarding_completed boolean default false;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.content_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own content profile" ON public.content_profiles;
DROP POLICY IF EXISTS "Users can insert own content profile" ON public.content_profiles;
DROP POLICY IF EXISTS "Users can update own content profile" ON public.content_profiles;
DROP POLICY IF EXISTS "Users can delete own content profile" ON public.content_profiles;

CREATE POLICY "Users can view own content profile"
  ON public.content_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content profile"
  ON public.content_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content profile"
  ON public.content_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content profile"
  ON public.content_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_profiles_user_id ON public.content_profiles(user_id);

-- ============================================================================
-- 2. FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  parent_id uuid references public.folders on delete cascade,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own folders"
  ON public.folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON public.folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON public.folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON public.folders FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
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
  created_at timestamp with time zone default timezone('utc'::text, now()),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- ============================================================================
-- 4. ALTER FILES TABLE
-- ============================================================================

-- Add folder_id column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'folder_id') THEN
    ALTER TABLE public.files ADD COLUMN folder_id uuid references public.folders on delete set null;
  END IF;
END $$;

-- Add tags array column (stores tag IDs or names)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'tags') THEN
    ALTER TABLE public.files ADD COLUMN tags text[] default '{}';
  END IF;
END $$;

-- Add original_filename for uploaded files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'original_filename') THEN
    ALTER TABLE public.files ADD COLUMN original_filename text;
  END IF;
END $$;

-- Index for folder lookups
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);

-- ============================================================================
-- 5. ALTER POSTS TABLE
-- ============================================================================

-- Add source_file_id for posts generated from files
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'source_file_id') THEN
    ALTER TABLE public.posts ADD COLUMN source_file_id uuid references public.files on delete set null;
  END IF;
END $$;

-- Add topic field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'topic') THEN
    ALTER TABLE public.posts ADD COLUMN topic text;
  END IF;
END $$;

-- Add post_type for CT-native post types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'post_type') THEN
    ALTER TABLE public.posts ADD COLUMN post_type text;
  END IF;
END $$;

-- Add constraint for post_type values (separate statement to handle existing data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'posts' AND constraint_name = 'posts_post_type_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_post_type_check
      CHECK (post_type IS NULL OR post_type IN ('alpha_thread', 'market_take', 'hot_take', 'on_chain_insight', 'protocol_breakdown', 'build_in_public'));
  END IF;
END $$;

-- Add is_thread boolean
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'is_thread') THEN
    ALTER TABLE public.posts ADD COLUMN is_thread boolean default false;
  END IF;
END $$;

-- Add tags array to posts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'tags') THEN
    ALTER TABLE public.posts ADD COLUMN tags text[] default '{}';
  END IF;
END $$;

-- Index for source file lookups
CREATE INDEX IF NOT EXISTS idx_posts_source_file_id ON public.posts(source_file_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

-- ============================================================================
-- 6. DEFAULT FOLDERS FUNCTION & TRIGGER
-- ============================================================================

-- Function to create default folders for new users
CREATE OR REPLACE FUNCTION public.create_default_folders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default folders for the new user
  INSERT INTO public.folders (user_id, name, position)
  VALUES
    (NEW.id, 'Drafts', 0),
    (NEW.id, 'Research', 1),
    (NEW.id, 'Published', 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_create_folders ON public.profiles;

-- Create trigger to auto-create folders when a profile is created
CREATE TRIGGER on_profile_created_create_folders
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_folders();

-- ============================================================================
-- 7. CREATE DEFAULT FOLDERS FOR EXISTING USERS
-- ============================================================================

-- Insert default folders for any existing users who don't have them
INSERT INTO public.folders (user_id, name, position)
SELECT p.id, 'Drafts', 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.folders f
  WHERE f.user_id = p.id AND f.name = 'Drafts'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.folders (user_id, name, position)
SELECT p.id, 'Research', 1
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.folders f
  WHERE f.user_id = p.id AND f.name = 'Research'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.folders (user_id, name, position)
SELECT p.id, 'Published', 2
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.folders f
  WHERE f.user_id = p.id AND f.name = 'Published'
)
ON CONFLICT DO NOTHING;
