# Style Templates Analysis Migration

Run this in Supabase SQL Editor:

```sql
-- Add profile_data column to store Opus analysis results
ALTER TABLE style_templates 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT NULL;

-- Add analyzed_at timestamp to track when analysis was performed
ALTER TABLE style_templates 
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT NULL;

-- Add tweets_analyzed count
ALTER TABLE style_templates 
ADD COLUMN IF NOT EXISTS tweets_analyzed INTEGER DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN style_templates.profile_data IS 'Opus AI analysis of admired account writing patterns';
COMMENT ON COLUMN style_templates.analyzed_at IS 'When the admired account was last analyzed';
COMMENT ON COLUMN style_templates.tweets_analyzed IS 'Number of tweets used in the analysis';
```
