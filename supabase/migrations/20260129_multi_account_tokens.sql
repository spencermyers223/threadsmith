-- Multi-Account Tokens Migration
-- Updates x_tokens to support multiple X accounts per user

-- ============================================================================
-- 1. RESTRUCTURE X_TOKENS TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'x_tokens') THEN
    
    -- Add id column if it doesn't exist (will become new primary key)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'x_tokens' AND column_name = 'id'
    ) THEN
      ALTER TABLE public.x_tokens ADD COLUMN id uuid DEFAULT gen_random_uuid();
    END IF;
    
    -- Drop the old primary key constraint (user_id)
    -- First check if it exists and what it's named
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'x_tokens' 
      AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE public.x_tokens DROP CONSTRAINT IF EXISTS x_tokens_pkey;
    END IF;
    
    -- Add new primary key on id
    ALTER TABLE public.x_tokens ADD PRIMARY KEY (id);
    
    -- Add unique constraint on x_account_id (one token record per X account)
    -- Drop first if exists
    ALTER TABLE public.x_tokens DROP CONSTRAINT IF EXISTS x_tokens_x_account_id_key;
    
    -- Only add if x_account_id column exists and is not null for existing rows
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'x_tokens' AND column_name = 'x_account_id'
    ) THEN
      -- Create unique index instead of constraint (more flexible)
      DROP INDEX IF EXISTS idx_x_tokens_x_account_unique;
      CREATE UNIQUE INDEX idx_x_tokens_x_account_unique ON public.x_tokens(x_account_id) WHERE x_account_id IS NOT NULL;
    END IF;
    
    -- Also keep an index on user_id for queries
    CREATE INDEX IF NOT EXISTS idx_x_tokens_user_id ON public.x_tokens(user_id);
    
  END IF;
END $$;
