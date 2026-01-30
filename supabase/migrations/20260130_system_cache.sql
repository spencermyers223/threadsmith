-- System cache table for storing baseline data and other cached values

CREATE TABLE IF NOT EXISTS system_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Allow all operations (will use service role key)
ALTER TABLE system_cache ENABLE ROW LEVEL SECURITY;

-- Create or replace the policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_cache' AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access" ON system_cache FOR ALL USING (true);
  END IF;
END $$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_cache_updated_at ON system_cache(updated_at);
