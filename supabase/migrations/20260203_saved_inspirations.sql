-- Saved Inspirations table for Repurpose Mode
-- Users can save tweets they want to repurpose later

CREATE TABLE IF NOT EXISTS saved_inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  x_account_id UUID REFERENCES x_accounts(id) ON DELETE SET NULL,
  
  -- Tweet data
  tweet_url TEXT NOT NULL,
  tweet_id TEXT,  -- X tweet ID
  tweet_text TEXT NOT NULL,
  
  -- Author info
  author_username TEXT,
  author_name TEXT,
  author_avatar_url TEXT,
  
  -- Metrics at time of saving
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  
  -- User notes
  notes TEXT,
  tags TEXT[],
  
  -- Status
  repurposed BOOLEAN DEFAULT false,
  repurposed_at TIMESTAMPTZ,
  
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate saves of same tweet
  UNIQUE(user_id, tweet_url)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_inspirations_user ON saved_inspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_inspirations_saved_at ON saved_inspirations(saved_at DESC);

-- RLS policies
ALTER TABLE saved_inspirations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inspirations"
  ON saved_inspirations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inspirations"
  ON saved_inspirations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inspirations"
  ON saved_inspirations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inspirations"
  ON saved_inspirations FOR DELETE
  USING (auth.uid() = user_id);
