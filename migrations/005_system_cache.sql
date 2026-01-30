-- System cache table for storing baseline data and other cached values
-- 2026-01-30

CREATE TABLE IF NOT EXISTS system_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Allow service role full access
ALTER TABLE system_cache ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role has full access to system_cache"
  ON system_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_cache_updated_at ON system_cache(updated_at);

COMMENT ON TABLE system_cache IS 'System-level cache for engagement baselines, settings, etc.';
