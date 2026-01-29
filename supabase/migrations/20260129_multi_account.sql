-- Multi-Account Support Migration
-- Allows users to manage multiple X accounts from one xthread account
-- Each X account gets separate: voice, folders, posts, calendar, analytics, settings

-- ============================================================================
-- 1. CREATE X_ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.x_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_user_id text NOT NULL,
  x_username text NOT NULL,
  x_display_name text,
  x_profile_image_url text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, x_user_id)
);

-- Only one primary account per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_x_accounts_primary 
  ON public.x_accounts(user_id) 
  WHERE is_primary = true;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON public.x_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_x_accounts_x_user_id ON public.x_accounts(x_user_id);

-- Enable RLS
ALTER TABLE public.x_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own x_accounts"
  ON public.x_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own x_accounts"
  ON public.x_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own x_accounts"
  ON public.x_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own x_accounts"
  ON public.x_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. MIGRATE EXISTING X DATA FROM PROFILES TO X_ACCOUNTS
-- ============================================================================

-- Create x_accounts records for existing users who have X connected
INSERT INTO public.x_accounts (user_id, x_user_id, x_username, is_primary)
SELECT id, x_user_id, x_username, true
FROM public.profiles
WHERE x_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. UPDATE X_TOKENS TO REFERENCE X_ACCOUNTS
-- ============================================================================

-- Add x_account_id column to x_tokens
ALTER TABLE public.x_tokens ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;

-- Populate x_account_id from existing data
UPDATE public.x_tokens t
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE t.user_id = xa.user_id AND t.x_user_id = xa.x_user_id;

-- Create index
CREATE INDEX IF NOT EXISTS idx_x_tokens_x_account_id ON public.x_tokens(x_account_id);

-- ============================================================================
-- 4. ADD X_ACCOUNT_ID TO CONTENT TABLES
-- ============================================================================

-- Posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_posts_x_account_id ON public.posts(x_account_id);

-- Folders
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_folders_x_account_id ON public.folders(x_account_id);

-- Files
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_files_x_account_id ON public.files(x_account_id);

-- Tags
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tags_x_account_id ON public.tags(x_account_id);

-- Voice Samples
ALTER TABLE public.voice_samples ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_voice_samples_x_account_id ON public.voice_samples(x_account_id);

-- Content Profiles (voice settings, niche, etc.)
ALTER TABLE public.content_profiles ADD COLUMN IF NOT EXISTS x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_content_profiles_x_account_id ON public.content_profiles(x_account_id);

-- ============================================================================
-- 5. MIGRATE EXISTING DATA TO DEFAULT X_ACCOUNT
-- ============================================================================

-- Update posts to use primary x_account
UPDATE public.posts p
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE p.user_id = xa.user_id AND xa.is_primary = true AND p.x_account_id IS NULL;

-- Update folders to use primary x_account
UPDATE public.folders f
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE f.user_id = xa.user_id AND xa.is_primary = true AND f.x_account_id IS NULL;

-- Update files to use primary x_account
UPDATE public.files f
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE f.user_id = xa.user_id AND xa.is_primary = true AND f.x_account_id IS NULL;

-- Update tags to use primary x_account
UPDATE public.tags t
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE t.user_id = xa.user_id AND xa.is_primary = true AND t.x_account_id IS NULL;

-- Update voice_samples to use primary x_account
UPDATE public.voice_samples vs
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE vs.user_id = xa.user_id AND xa.is_primary = true AND vs.x_account_id IS NULL;

-- Update content_profiles to use primary x_account
UPDATE public.content_profiles cp
SET x_account_id = xa.id
FROM public.x_accounts xa
WHERE cp.user_id = xa.user_id AND xa.is_primary = true AND cp.x_account_id IS NULL;

-- ============================================================================
-- 6. FUNCTION TO CREATE DEFAULT FOLDERS FOR NEW X_ACCOUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_folders_for_x_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default folders for the new X account
  INSERT INTO public.folders (user_id, x_account_id, name, position)
  VALUES
    (NEW.user_id, NEW.id, 'Drafts', 0),
    (NEW.user_id, NEW.id, 'Research', 1),
    (NEW.user_id, NEW.id, 'Published', 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_x_account_created_create_folders ON public.x_accounts;

-- Create trigger to auto-create folders when an X account is added
CREATE TRIGGER on_x_account_created_create_folders
  AFTER INSERT ON public.x_accounts
  FOR EACH ROW EXECUTE FUNCTION public.create_default_folders_for_x_account();

-- ============================================================================
-- 7. ADD SUBSCRIPTION LIMITS FOR MULTI-ACCOUNT
-- ============================================================================

-- Add max_x_accounts to track account limits per subscription tier
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS max_x_accounts integer DEFAULT 1;

-- Update existing subscriptions to have 1 account limit
UPDATE public.subscriptions SET max_x_accounts = 1 WHERE max_x_accounts IS NULL;

-- ============================================================================
-- 8. HELPER FUNCTION TO GET USER'S X_ACCOUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_x_accounts(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  x_user_id text,
  x_username text,
  x_display_name text,
  x_profile_image_url text,
  is_primary boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    xa.id,
    xa.x_user_id,
    xa.x_username,
    xa.x_display_name,
    xa.x_profile_image_url,
    xa.is_primary,
    xa.created_at
  FROM public.x_accounts xa
  WHERE xa.user_id = p_user_id
  ORDER BY xa.is_primary DESC, xa.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. UPDATED TIMESTAMP TRIGGER FOR X_ACCOUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_x_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS x_accounts_updated_at ON public.x_accounts;
CREATE TRIGGER x_accounts_updated_at
  BEFORE UPDATE ON public.x_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_x_account_updated_at();
