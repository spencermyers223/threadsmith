-- Inspiration Tweets Migration
-- Stores high-performing tweets saved from other users for voice training and repurposing

-- ============================================================================
-- 1. CREATE INSPIRATION_TWEETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inspiration_tweets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE,
  
  -- Tweet data
  tweet_id text NOT NULL,
  tweet_text text NOT NULL,
  tweet_url text,
  
  -- Author data
  author_id text NOT NULL,
  author_username text NOT NULL,
  author_name text,
  author_profile_image_url text,
  
  -- Engagement metrics (at time of save)
  reply_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  repost_count integer DEFAULT 0,
  quote_count integer DEFAULT 0,
  
  -- Metadata
  saved_at timestamptz DEFAULT now(),
  notes text, -- Optional user notes about why they saved it
  
  -- Prevent duplicate saves of same tweet for same account
  UNIQUE(user_id, x_account_id, tweet_id)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inspiration_tweets_user_id ON public.inspiration_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_tweets_x_account_id ON public.inspiration_tweets(x_account_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_tweets_author ON public.inspiration_tweets(author_username);
CREATE INDEX IF NOT EXISTS idx_inspiration_tweets_saved_at ON public.inspiration_tweets(saved_at DESC);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE public.inspiration_tweets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Users can view their own inspiration tweets
DROP POLICY IF EXISTS "Users can view own inspiration_tweets" ON public.inspiration_tweets;
CREATE POLICY "Users can view own inspiration_tweets"
  ON public.inspiration_tweets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own inspiration tweets
DROP POLICY IF EXISTS "Users can insert own inspiration_tweets" ON public.inspiration_tweets;
CREATE POLICY "Users can insert own inspiration_tweets"
  ON public.inspiration_tweets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own inspiration tweets (for notes)
DROP POLICY IF EXISTS "Users can update own inspiration_tweets" ON public.inspiration_tweets;
CREATE POLICY "Users can update own inspiration_tweets"
  ON public.inspiration_tweets FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own inspiration tweets
DROP POLICY IF EXISTS "Users can delete own inspiration_tweets" ON public.inspiration_tweets;
CREATE POLICY "Users can delete own inspiration_tweets"
  ON public.inspiration_tweets FOR DELETE
  USING (auth.uid() = user_id);
