-- Voice Training Feature Migration
-- Adds voice_samples table and voice_profile columns to content_profiles

-- 1. Create voice_samples table
CREATE TABLE IF NOT EXISTS public.voice_samples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tweet_text text NOT NULL,
  tweet_url text,
  created_at timestamptz DEFAULT now()
);

-- 2. Add voice_profile columns to content_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'voice_profile') THEN
    ALTER TABLE public.content_profiles ADD COLUMN voice_profile jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content_profiles' AND column_name = 'voice_trained_at') THEN
    ALTER TABLE public.content_profiles ADD COLUMN voice_trained_at timestamptz;
  END IF;
END $$;

-- 3. Enable RLS on voice_samples
ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view own voice samples"
  ON public.voice_samples FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice samples"
  ON public.voice_samples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice samples"
  ON public.voice_samples FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice samples"
  ON public.voice_samples FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_voice_samples_user_id ON public.voice_samples(user_id);
