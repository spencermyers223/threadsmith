-- X Authentication Support
-- Run this migration in Supabase SQL Editor

-- Add X user info to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_user_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_username TEXT;

-- Create index for X user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_x_user_id ON profiles(x_user_id);

-- Create x_tokens table for OAuth token storage
CREATE TABLE IF NOT EXISTS x_tokens (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  x_user_id TEXT NOT NULL,
  x_username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE x_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view own tokens" 
  ON x_tokens FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" 
  ON x_tokens FOR UPDATE 
  USING (auth.uid() = user_id);

-- Service role can do everything (for token refresh)
CREATE POLICY "Service role full access" 
  ON x_tokens FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');
