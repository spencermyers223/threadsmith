-- Voice System V2 Migration
-- Creates tables for: saved_posts (unlimited), voice_library (max 5), style_profiles (max 3)

-- 1. saved_posts - Unlimited bookmarked tweets (reads from DOM, costs nothing)
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tweet_text text NOT NULL,
  tweet_url text,
  author_username text,
  is_own_tweet boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. voice_library - Max 5 tweets that define user's voice (few-shot examples)
CREATE TABLE IF NOT EXISTS public.voice_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tweet_text text NOT NULL,
  tweet_url text,
  author_username text,
  is_own_tweet boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. style_profiles - Max 3 admired accounts with extracted patterns
CREATE TABLE IF NOT EXISTS public.style_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  account_username text NOT NULL,
  account_display_name text,
  profile_data jsonb NOT NULL DEFAULT '{}',
  tweets_analyzed int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, account_username)
);

-- Enable RLS on all tables
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_posts
CREATE POLICY "Users can view own saved posts"
  ON public.saved_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved posts"
  ON public.saved_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved posts"
  ON public.saved_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for voice_library
CREATE POLICY "Users can view own voice library"
  ON public.voice_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice library"
  ON public.voice_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice library"
  ON public.voice_library FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for style_profiles
CREATE POLICY "Users can view own style profiles"
  ON public.style_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own style profiles"
  ON public.style_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own style profiles"
  ON public.style_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own style profiles"
  ON public.style_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_library_user_id ON public.voice_library(user_id);
CREATE INDEX IF NOT EXISTS idx_style_profiles_user_id ON public.style_profiles(user_id);
