-- Engagement Patterns Migration
-- Stores learned patterns from user's actual tweet performance
-- Used to personalize engagement scoring

-- ============================================================================
-- 1. CREATE ENGAGEMENT_PATTERNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.engagement_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Learned optimal ranges for this user's audience
  optimal_length_min integer DEFAULT 180,
  optimal_length_max integer DEFAULT 280,
  
  -- What works for this user (0-100 effectiveness scores)
  questions_effectiveness integer DEFAULT 50,
  numbers_effectiveness integer DEFAULT 50,
  bold_claims_effectiveness integer DEFAULT 50,
  lists_effectiveness integer DEFAULT 50,
  emojis_effectiveness integer DEFAULT 50,
  
  -- Personalized weights (sum should = 100)
  weight_hook integer DEFAULT 25,
  weight_reply_potential integer DEFAULT 30,
  weight_length integer DEFAULT 15,
  weight_readability integer DEFAULT 10,
  weight_hashtags integer DEFAULT 10,
  weight_emojis integer DEFAULT 10,
  
  -- Best performing patterns (JSON arrays of examples)
  top_hooks jsonb DEFAULT '[]'::jsonb,
  top_ctas jsonb DEFAULT '[]'::jsonb,
  
  -- Stats from analysis
  tweets_analyzed integer DEFAULT 0,
  avg_engagement_rate numeric(5,2),
  last_analyzed_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE public.engagement_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagement patterns"
  ON public.engagement_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement patterns"
  ON public.engagement_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement patterns"
  ON public.engagement_patterns FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. INDEX FOR FAST LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_engagement_patterns_user_id 
ON public.engagement_patterns(user_id);

-- ============================================================================
-- 4. COMMENT
-- ============================================================================

COMMENT ON TABLE public.engagement_patterns IS 
'Stores learned engagement patterns from user''s actual tweet performance. Used to personalize scoring predictions.';
