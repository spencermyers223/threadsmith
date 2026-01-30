-- DM Outreach Templates Migration
-- Stores reusable DM templates for cold outreach via Chrome extension

-- ============================================================================
-- 1. CREATE DM_TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dm_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE,
  
  -- Template content
  title text NOT NULL,
  message_body text NOT NULL,
  
  -- Variables supported: {{username}}, {{display_name}}, {{bio_snippet}}
  
  -- Usage tracking
  times_used integer DEFAULT 0,
  
  -- Ordering
  position integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dm_templates_user_id ON public.dm_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_templates_x_account_id ON public.dm_templates(x_account_id);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE public.dm_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Users can view their own templates
DROP POLICY IF EXISTS "Users can view own dm_templates" ON public.dm_templates;
CREATE POLICY "Users can view own dm_templates"
  ON public.dm_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
DROP POLICY IF EXISTS "Users can insert own dm_templates" ON public.dm_templates;
CREATE POLICY "Users can insert own dm_templates"
  ON public.dm_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
DROP POLICY IF EXISTS "Users can update own dm_templates" ON public.dm_templates;
CREATE POLICY "Users can update own dm_templates"
  ON public.dm_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own templates
DROP POLICY IF EXISTS "Users can delete own dm_templates" ON public.dm_templates;
CREATE POLICY "Users can delete own dm_templates"
  ON public.dm_templates FOR DELETE
  USING (auth.uid() = user_id);
