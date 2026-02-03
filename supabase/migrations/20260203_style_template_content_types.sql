-- Add content_type to style_templates
-- Allows templates to be specific to tweet, thread, or article generation

-- Add content_type column
ALTER TABLE public.style_templates 
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'tweet' 
CHECK (content_type IN ('tweet', 'thread', 'article'));

-- Add comment
COMMENT ON COLUMN public.style_templates.content_type IS 
'Type of content this style template is optimized for: tweet, thread, or article';

-- For thread templates, tweets array holds individual thread tweets
-- For article templates, we use a different structure in tweets:
-- { opening_hook: string, section_headings: string[], transitions: string[], closing_style: string, tone_notes: string }

-- Index for filtering by content type
CREATE INDEX IF NOT EXISTS idx_style_templates_content_type ON public.style_templates(content_type);

-- Update existing templates to be tweet type (already defaulted, but explicit)
UPDATE public.style_templates SET content_type = 'tweet' WHERE content_type IS NULL;
