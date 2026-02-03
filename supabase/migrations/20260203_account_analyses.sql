-- Account Analyses table for Account Researcher feature
-- Stores full AI analysis of any X account (replaces simple tweet fetching)

CREATE TABLE IF NOT EXISTS account_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  x_account_id UUID REFERENCES x_accounts(id) ON DELETE SET NULL,
  
  -- Account being analyzed
  analyzed_username TEXT NOT NULL,
  analyzed_user_id TEXT,  -- X API user ID
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Top tweets (array of objects with text, likes, retweets, url, whyItWorks)
  top_tweets JSONB DEFAULT '[]'::jsonb,
  
  -- Strategy analysis
  strategy_analysis JSONB DEFAULT '{}'::jsonb,
  -- { postingFrequency, contentMix, bestPerformingTypes[], threadFrequency }
  
  -- Voice & style analysis
  voice_analysis JSONB DEFAULT '{}'::jsonb,
  -- { summary, toneMarkers[], sentenceStyle, hookTechniques[], signatureMoves[] }
  
  -- Engagement patterns
  engagement_patterns JSONB DEFAULT '{}'::jsonb,
  -- { bestDays[], avgLikes, avgRetweets, threadVsTweetRatio, topTopics[] }
  
  -- Actionable tactics
  tactics_to_steal JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  tweets_fetched INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 5,
  
  -- Link to style template if user adds to their profiles
  style_template_id UUID REFERENCES style_templates(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only have one analysis per username (upsert on re-analyze)
  UNIQUE(user_id, analyzed_username)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_account_analyses_user ON account_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_account_analyses_username ON account_analyses(analyzed_username);

-- RLS policies
ALTER TABLE account_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses"
  ON account_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON account_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON account_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON account_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_account_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_analyses_updated_at
  BEFORE UPDATE ON account_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_account_analyses_updated_at();
