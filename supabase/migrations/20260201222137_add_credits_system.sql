-- Migration: Add credits and posts tracking to subscriptions
-- Date: 2026-02-02
-- Description: Implements the credit system for xthread

-- Add credits columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS posts_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Set initial credits based on tier
UPDATE public.subscriptions 
SET credits = CASE 
  WHEN tier = 'free' THEN 5
  WHEN tier = 'premium' THEN 50
  WHEN tier = 'pro' THEN 100
  ELSE 0
END
WHERE credits = 0 OR credits IS NULL;

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'subscription_grant', 'purchase', 'usage', 'refund'
  description TEXT,
  reference_id TEXT, -- Stripe payment ID, action ID, etc.
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view their own transactions
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to credit transactions" ON public.credit_transactions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.credit_transactions IS 'Tracks all credit-related transactions for audit trail';
