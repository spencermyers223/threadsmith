-- 7-Day Free Trial Migration
-- Gives all new users full premium access for 7 days

-- ============================================================================
-- 1. UPDATE STATUS CONSTRAINT TO INCLUDE 'trialing'
-- ============================================================================

-- Drop and recreate the status check constraint to include 'trialing'
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;
  
  -- Add updated constraint with 'trialing' status
  ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('pending', 'active', 'trialing', 'lifetime', 'cancelled', 'past_due', 'expired'));
END $$;

-- ============================================================================
-- 2. ADD TRIAL_ENDS_AT COLUMN
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions' 
    AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD COLUMN trial_ends_at timestamp with time zone;
  END IF;
END $$;

COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 
'When the free trial expires. After this date, user reverts to free tier unless they subscribe.';

-- ============================================================================
-- 3. CREATE/UPDATE FUNCTION TO AUTO-CREATE TRIAL SUBSCRIPTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a subscription record with 7-day free trial
  INSERT INTO public.subscriptions (
    user_id,
    status,
    tier,
    trial_ends_at,
    max_x_accounts,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'trialing',
    'premium',  -- Give premium features during trial
    NOW() + INTERVAL '7 days',
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Don't override if already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER FOR NEW PROFILES
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;

-- Create trigger that fires after profile creation
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================================
-- 5. GIVE EXISTING USERS WITHOUT SUBSCRIPTION A TRIAL
-- ============================================================================

-- For existing users who don't have a subscription record, give them a 7-day trial
INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at, max_x_accounts, created_at, updated_at)
SELECT 
  p.id,
  'trialing',
  'premium',
  NOW() + INTERVAL '7 days',
  1,
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
);

-- ============================================================================
-- 6. CREATE FUNCTION TO CHECK/EXPIRE TRIALS (for scheduled job)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_ended_trials()
RETURNS void AS $$
BEGIN
  -- Update trialing subscriptions that have expired
  UPDATE public.subscriptions
  SET 
    status = 'expired',
    tier = 'free',
    updated_at = NOW()
  WHERE 
    status = 'trialing'
    AND trial_ends_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.expire_ended_trials() IS 
'Call periodically to expire trials. Can be run via pg_cron or Supabase edge function.';

-- ============================================================================
-- 7. INDEX FOR TRIAL QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at 
ON public.subscriptions(trial_ends_at) 
WHERE status = 'trialing';
