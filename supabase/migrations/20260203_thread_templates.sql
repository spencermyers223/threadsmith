-- Thread Templates Library
-- 6 proven thread formats for engagement

-- Add content_type column if it doesn't exist (to distinguish posts vs threads)
ALTER TABLE public.post_templates ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'post';

-- ============================================================
-- THREAD TEMPLATES (6)
-- ============================================================

INSERT INTO public.post_templates (title, category, description, prompt_template, variables, engagement_type, best_time, difficulty, content_type) VALUES

(
  'Step-by-Step Guide',
  'thread',
  'Break down a process into clear, actionable steps. High save rate.',
  'Write a thread teaching people how to {{skill}}. Create a 5-7 tweet thread where each tweet is one clear step. Hook: Start with the outcome/transformation. Each step should be specific and actionable. End with encouragement to try it.',
  '[{"name": "skill", "label": "What skill/process to teach", "placeholder": "e.g., write viral tweets, build a landing page in 1 hour", "required": true}]',
  'retweets',
  'Tuesday-Thursday mornings',
  'beginner',
  'thread'
),

(
  'Lessons Thread',
  'thread',
  'Share multiple lessons from experience. Great for establishing expertise.',
  'Write a thread sharing {{count}} lessons about {{topic}}. Hook: Tease the value (X lessons from Y experience). Each lesson gets its own tweet - specific, not generic. End with a call to save/share.',
  '[{"name": "count", "label": "Number of lessons", "placeholder": "e.g., 7, 10", "required": true}, {"name": "topic", "label": "Topic/Experience", "placeholder": "e.g., 5 years of building startups", "required": true}]',
  'retweets',
  'Weekday mornings',
  'beginner',
  'thread'
),

(
  'Story Thread',
  'thread',
  'Tell a compelling story with a lesson. Most engaging thread format.',
  'Write a story thread about {{story}}. Start with a hook that creates curiosity or tension. Build the narrative across 5-7 tweets. Include a turning point. End with the lesson learned. Make it personal and specific.',
  '[{"name": "story", "label": "Story summary", "placeholder": "e.g., How I went from $0 to $10K MRR in 6 months", "required": true}]',
  'replies',
  'Evenings and weekends',
  'intermediate',
  'thread'
),

(
  'Comparison Thread',
  'thread',
  'Compare two approaches, tools, or mindsets. Drives debate and saves.',
  'Write a thread comparing {{option_a}} vs {{option_b}}. Hook: Pose the comparison dramatically. Cover 4-5 dimensions of comparison (cost, speed, quality, etc). Be opinionated - pick a winner and explain why. End with when to use each.',
  '[{"name": "option_a", "label": "First option", "placeholder": "e.g., Building in public", "required": true}, {"name": "option_b", "label": "Second option", "placeholder": "e.g., Building in stealth", "required": true}]',
  'replies',
  'Weekday afternoons',
  'intermediate',
  'thread'
),

(
  'Breakdown Thread',
  'thread',
  'Analyze something successful - a tweet, strategy, product, etc.',
  'Write a thread breaking down {{subject}}. Hook: State what you''re analyzing and why it''s worth studying. Go tweet-by-tweet explaining what makes it work. Pull out 3-5 specific tactics. End with how readers can apply this.',
  '[{"name": "subject", "label": "What to break down", "placeholder": "e.g., How @naval''s tweet got 50K likes, Why Notion''s landing page converts", "required": true}]',
  'retweets',
  'Weekday mornings',
  'intermediate',
  'thread'
),

(
  'Contrarian Thread',
  'thread',
  'Challenge conventional wisdom. High engagement through debate.',
  'Write a thread arguing that {{contrarian_take}}. Hook: State the controversial opinion boldly. Build your argument across 5-7 tweets with evidence and examples. Acknowledge the counterargument, then demolish it. End with a call to action or question.',
  '[{"name": "contrarian_take", "label": "Your contrarian take", "placeholder": "e.g., Networking events are a waste of time, You don''t need a niche to succeed", "required": true}]',
  'replies',
  'Weekday mornings',
  'advanced',
  'thread'
);

-- Update category index hint
COMMENT ON COLUMN public.post_templates.content_type IS 'post or thread - determines which templates tab section to show';
