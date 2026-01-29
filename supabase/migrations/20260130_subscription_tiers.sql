-- Subscription Tiers Migration
-- Adds tier column to support Premium ($19.99) vs Pro ($39.99) distinction

-- ============================================================================
-- 1. ADD TIER COLUMN
-- ============================================================================

DO $$
BEGIN
  -- Add tier column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions' 
    AND column_name = 'tier'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD COLUMN tier text DEFAULT 'free' 
    CHECK (tier IN ('free', 'premium', 'pro'));
  END IF;
END $$;

-- ============================================================================
-- 2. UPDATE EXISTING SUBSCRIPTIONS
-- ============================================================================

-- Existing active subscriptions default to 'premium' tier (original pricing)
UPDATE public.subscriptions 
SET tier = 'premium' 
WHERE status IN ('active', 'trialing', 'lifetime') 
AND (tier IS NULL OR tier = 'free');

-- ============================================================================
-- 3. SET MAX ACCOUNTS BASED ON TIER
-- ============================================================================

-- Premium tier gets 1 account
UPDATE public.subscriptions 
SET max_x_accounts = 1 
WHERE tier = 'premium' AND (max_x_accounts IS NULL OR max_x_accounts > 1);

-- Pro tier gets 5 accounts
UPDATE public.subscriptions 
SET max_x_accounts = 5 
WHERE tier = 'pro';

-- Free tier gets 1 account (but limited features)
UPDATE public.subscriptions 
SET max_x_accounts = 1 
WHERE tier = 'free' OR tier IS NULL;

-- ============================================================================
-- 4. INDEX FOR TIER LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);

-- ============================================================================
-- 5. HELPFUL COMMENT
-- ============================================================================

COMMENT ON COLUMN public.subscriptions.tier IS 
'Subscription tier: free (no payment), premium ($19.99/mo - 1 account), pro ($39.99/mo - 5 accounts, advanced analytics)';
