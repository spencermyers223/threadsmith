-- Update generation_type constraint to include all current post types + user_generated
-- Run in Supabase SQL Editor

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_generation_type_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_generation_type_check
  CHECK (generation_type IS NULL OR generation_type IN (
    'alpha_thread', 'market_take', 'hot_take',
    'on_chain_insight', 'protocol_breakdown', 'build_in_public',
    'user_generated'
  ));
