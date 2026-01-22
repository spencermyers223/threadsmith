-- Add generation_type column to posts table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add generation_type column
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS generation_type text
CHECK (generation_type IS NULL OR generation_type IN ('scroll_stopper', 'debate_starter', 'viral_catalyst'));

-- Create index for filtering by generation_type
CREATE INDEX IF NOT EXISTS idx_posts_generation_type ON public.posts(generation_type);
