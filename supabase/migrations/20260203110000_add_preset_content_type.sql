-- Add content_type to presets table
-- This allows presets to be either 'tweet' or 'thread' presets
-- The AI generation will use this to know what type of content to create

ALTER TABLE public.presets 
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'tweet' 
CHECK (content_type IN ('tweet', 'thread'));

-- Make style_template_id optional (not all presets need a voice style)
ALTER TABLE public.presets 
ALTER COLUMN style_template_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.presets.content_type IS 'Type of content this preset generates: tweet (single post) or thread (multi-tweet thread)';

-- Create index for filtering by content_type
CREATE INDEX IF NOT EXISTS idx_presets_content_type ON public.presets(content_type);
