-- Templates, Presets & Customization Feature Migration
-- Created: 2026-02-03
-- Adds: style_templates, presets, user_customization tables

-- ============================================================================
-- 1. STYLE TEMPLATES
-- User-created style templates with admired account + up to 5 curated tweets
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.style_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE,
  
  -- Template identity
  title text NOT NULL,
  description text,
  
  -- Admired account info
  admired_account_username text, -- @handle (without @)
  admired_account_display_name text,
  admired_account_avatar_url text,
  
  -- Array of up to 5 curated tweets (can be partially filled)
  -- Each tweet: { text: string, url?: string, added_at: timestamp }
  tweets jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. PRESETS
-- Saved combinations of style template + post template + optional files
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE,
  
  -- Preset identity
  name text NOT NULL,
  
  -- Required: both style and post template
  style_template_id uuid REFERENCES public.style_templates(id) ON DELETE SET NULL,
  post_template_id text NOT NULL, -- References our proprietary post_templates.id
  
  -- Optional: attached files
  attached_file_ids jsonb DEFAULT '[]'::jsonb, -- Array of file UUIDs
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. USER CUSTOMIZATION
-- All user personalization settings (tone, niches, goals, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_customization (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  x_account_id uuid REFERENCES public.x_accounts(id) ON DELETE CASCADE,
  
  -- Tone preferences
  -- { formality: 'casual' | 'professional' | 'mixed', humor: 1-5, energy: 1-5 }
  tone_preferences jsonb DEFAULT '{}'::jsonb,
  
  -- Content niches (array of strings)
  content_niches text[] DEFAULT '{}',
  
  -- Goals and audience description
  goals_audience text,
  
  -- Free-form style description
  style_description text,
  
  -- Admired accounts (quick reference list, separate from style templates)
  admired_accounts text[] DEFAULT '{}',
  
  -- Outreach/DM templates
  -- Array of { id, name, content, category }
  outreach_templates jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One customization per user per x_account (or null for global)
  UNIQUE(user_id, x_account_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.style_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_customization ENABLE ROW LEVEL SECURITY;

-- Style Templates Policies
CREATE POLICY "Users can view own style templates"
  ON public.style_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own style templates"
  ON public.style_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own style templates"
  ON public.style_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own style templates"
  ON public.style_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Presets Policies
CREATE POLICY "Users can view own presets"
  ON public.presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets"
  ON public.presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON public.presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON public.presets FOR DELETE
  USING (auth.uid() = user_id);

-- User Customization Policies
CREATE POLICY "Users can view own customization"
  ON public.user_customization FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customization"
  ON public.user_customization FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customization"
  ON public.user_customization FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customization"
  ON public.user_customization FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_style_templates_user_id ON public.style_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_style_templates_x_account ON public.style_templates(x_account_id);
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON public.presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_x_account ON public.presets(x_account_id);
CREATE INDEX IF NOT EXISTS idx_user_customization_user_id ON public.user_customization(user_id);
CREATE INDEX IF NOT EXISTS idx_user_customization_x_account ON public.user_customization(x_account_id);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_style_templates_updated_at ON public.style_templates;
CREATE TRIGGER update_style_templates_updated_at
  BEFORE UPDATE ON public.style_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_presets_updated_at ON public.presets;
CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON public.presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_customization_updated_at ON public.user_customization;
CREATE TRIGGER update_user_customization_updated_at
  BEFORE UPDATE ON public.user_customization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
