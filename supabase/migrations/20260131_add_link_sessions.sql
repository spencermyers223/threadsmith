-- Create x_link_sessions table for cross-device account linking
CREATE TABLE IF NOT EXISTS public.x_link_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  linked_x_username TEXT,
  error TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_link_sessions_user_id ON public.x_link_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_link_sessions_status ON public.x_link_sessions(status);

-- Enable RLS
ALTER TABLE public.x_link_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own link sessions
CREATE POLICY "Users can view own link sessions"
  ON public.x_link_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role full access"
  ON public.x_link_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-cleanup expired sessions (optional - can be run via cron)
-- DELETE FROM public.x_link_sessions WHERE expires_at < NOW() AND status = 'pending';
