-- Post Templates Library (General Tech/Founder Focus)
-- System templates for Tech Twitter creators

-- System templates table (create if not exists)
CREATE TABLE IF NOT EXISTS public.post_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  prompt_template text NOT NULL,
  example_output text,
  variables jsonb,
  engagement_type text,
  best_time text,
  difficulty text DEFAULT 'beginner',
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read system templates
DROP POLICY IF EXISTS "Anyone can read system templates" ON public.post_templates;
CREATE POLICY "Anyone can read system templates"
  ON public.post_templates FOR SELECT
  USING (true);

-- Clear existing templates and insert new ones
DELETE FROM public.post_templates WHERE is_system = true;

-- ============================================================
-- FOUNDER/BUILD IN PUBLIC (5)
-- ============================================================

INSERT INTO public.post_templates (title, category, description, prompt_template, variables, engagement_type, best_time, difficulty) VALUES

(
  'Weekly Progress Update',
  'build-in-public',
  'Share your weekly wins, metrics, and learnings. Great for accountability and building an audience.',
  'Write a build-in-public progress update for {{project}}. Include these metrics: {{metrics}}. Share one win, one challenge, and what''s next. Be honest and specific - people connect with real numbers, not vague progress.',
  '[{"name": "project", "label": "Project Name", "placeholder": "e.g., My SaaS, My App", "required": true}, {"name": "metrics", "label": "Key Metrics", "placeholder": "e.g., 500 users, $2K MRR", "required": true}]',
  'follows',
  'Friday afternoons',
  'beginner'
),

(
  'Lesson Learned Post',
  'build-in-public',
  'Share a hard lesson from building. Vulnerability creates connection.',
  'Write a post about a lesson learned while building {{project}}. The lesson: {{lesson}}. Be vulnerable about what went wrong, then share the actionable insight. End with advice for others.',
  '[{"name": "project", "label": "Project", "placeholder": "e.g., my startup", "required": true}, {"name": "lesson", "label": "Lesson", "placeholder": "e.g., Don''t build features nobody asked for", "required": true}]',
  'replies',
  'Weekday mornings',
  'beginner'
),

(
  'Feature Launch Announcement',
  'build-in-public',
  'Announce a new feature with energy. Show the problem it solves.',
  'Write a feature launch announcement for {{project}}. The new feature: {{feature}}. Explain the problem it solves, why users wanted it, and include a clear CTA. Keep the energy high but authentic.',
  '[{"name": "project", "label": "Project", "placeholder": "e.g., xthread", "required": true}, {"name": "feature", "label": "New Feature", "placeholder": "e.g., AI thread generation", "required": true}]',
  'likes',
  'Tuesday-Thursday mornings',
  'beginner'
),

(
  'Revenue/Growth Milestone',
  'build-in-public',
  'Celebrate hitting a milestone. Real numbers build credibility.',
  'Write a post celebrating {{milestone}} for {{project}}. Share the journey timeline, what decisions made the difference, and what you learned. Be genuine, not braggy.',
  '[{"name": "project", "label": "Project", "placeholder": "e.g., My SaaS", "required": true}, {"name": "milestone", "label": "Milestone", "placeholder": "e.g., $5K MRR, 1000 users", "required": true}]',
  'follows',
  'Any time',
  'intermediate'
),

(
  'Behind the Scenes',
  'build-in-public',
  'Show the messy reality of building. Authenticity wins.',
  'Write a behind-the-scenes post about {{topic}} in building {{project}}. Show the reality that most people don''t see. Be specific about the process, struggles, or decisions involved.',
  '[{"name": "project", "label": "Project", "placeholder": "e.g., my app", "required": true}, {"name": "topic", "label": "Topic", "placeholder": "e.g., How I handle customer support alone", "required": true}]',
  'replies',
  'Evenings',
  'beginner'
),

-- ============================================================
-- HOT TAKES / CONTRARIAN (5)
-- ============================================================

(
  'Unpopular Opinion',
  'contrarian',
  'Share a contrarian take that challenges conventional wisdom. Generates massive engagement.',
  'Write an unpopular opinion post about {{topic}}. The take should genuinely go against common consensus. Back it up with one strong reason. Make it spicy but defensible.',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g., Why hustle culture is overrated", "required": true}]',
  'replies',
  'Weekday evenings',
  'beginner'
),

(
  'Everyone''s Wrong About X',
  'contrarian',
  'A stronger contrarian format. Challenge the crowd with evidence.',
  'Write a post arguing that most people are wrong about {{topic}}. Start with a bold claim, then provide {{evidence}} as your main argument. Make people question their assumptions.',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g., productivity advice", "required": true}, {"name": "evidence", "label": "Evidence", "placeholder": "e.g., Studies show most tips don''t work", "required": true}]',
  'replies',
  'Weekday mornings',
  'intermediate'
),

(
  'The Real Reason X Happened',
  'contrarian',
  'Insider-knowledge framing. Connect dots others miss.',
  'Write a post explaining the real reason behind {{event}}. The surface explanation is {{surface}}, but the actual driver is {{real_reason}}. Connect dots that others aren''t connecting.',
  '[{"name": "event", "label": "Event", "placeholder": "e.g., Why that startup failed", "required": true}, {"name": "surface", "label": "Surface Explanation", "placeholder": "e.g., They ran out of money", "required": true}, {"name": "real_reason", "label": "Real Reason", "placeholder": "e.g., Founder-market fit issues", "required": true}]',
  'retweets',
  'Afternoons',
  'advanced'
),

(
  'Myth-Busting',
  'contrarian',
  'Correct a common misconception with facts. Builds authority.',
  'Write a myth-busting post about {{myth}}. Clearly state what people believe, then explain why it''s wrong. Provide {{correction}} as the truth. Be educational, not condescending.',
  '[{"name": "myth", "label": "Common Myth", "placeholder": "e.g., You need VC funding to succeed", "required": true}, {"name": "correction", "label": "The Truth", "placeholder": "e.g., Most successful businesses are bootstrapped", "required": true}]',
  'likes',
  'Mornings',
  'beginner'
),

(
  'Hot Take with Stakes',
  'contrarian',
  'Make a bold prediction or claim. Put your reputation on the line.',
  'Write a hot take about {{topic}}. Make a specific, bold claim: {{claim}}. Explain your reasoning briefly. End with conviction - "I''ll die on this hill" energy.',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g., The future of AI", "required": true}, {"name": "claim", "label": "Bold Claim", "placeholder": "e.g., Most AI startups will fail by 2026", "required": true}]',
  'replies',
  'Peak hours',
  'intermediate'
),

-- ============================================================
-- INSIGHTS / VALUE POSTS (5)
-- ============================================================

(
  'How I Did X (Specific Result)',
  'alpha',
  'Share a specific result with the exact steps. High-value, save-worthy content.',
  'Write a post about how you achieved {{result}}. Be specific about the {{method}} you used. Include 3-5 actionable steps. The more specific the numbers, the better.',
  '[{"name": "result", "label": "Result", "placeholder": "e.g., Got 10K followers in 60 days", "required": true}, {"name": "method", "label": "Method", "placeholder": "e.g., Reply strategy and consistent posting", "required": true}]',
  'retweets',
  'Mornings',
  'intermediate'
),

(
  'Tools I Actually Use',
  'alpha',
  'Share your real tech stack or tools. People love seeing behind the curtain.',
  'Write a post about the tools you actually use for {{purpose}}. List {{tools}} with a brief note on why each one. Be honest - include free alternatives if relevant.',
  '[{"name": "purpose", "label": "Purpose", "placeholder": "e.g., Running my SaaS, Content creation", "required": true}, {"name": "tools", "label": "Tools", "placeholder": "e.g., Notion, Linear, Figma", "required": true}]',
  'likes',
  'Weekdays',
  'beginner'
),

(
  'Framework or Mental Model',
  'alpha',
  'Share a thinking framework that helps you make decisions.',
  'Write a post explaining the {{framework}} framework for {{application}}. Explain the concept simply, then give a concrete example of how to apply it. Make it actionable.',
  '[{"name": "framework", "label": "Framework Name", "placeholder": "e.g., 2x2 matrix, First Principles", "required": true}, {"name": "application", "label": "What It''s For", "placeholder": "e.g., Prioritizing features, Making decisions", "required": true}]',
  'retweets',
  'Weekday mornings',
  'intermediate'
),

(
  'Mistakes to Avoid',
  'alpha',
  'Warn others about common pitfalls. People learn from mistakes.',
  'Write a post about mistakes to avoid when {{situation}}. List {{mistakes}} with brief explanations of why each is harmful. End with what to do instead.',
  '[{"name": "situation", "label": "Situation", "placeholder": "e.g., Starting a startup, Launching a product", "required": true}, {"name": "mistakes", "label": "Key Mistakes", "placeholder": "e.g., Building without talking to users", "required": true}]',
  'likes',
  'Any time',
  'beginner'
),

(
  'Industry Trend Analysis',
  'alpha',
  'Share your take on where things are heading. Position yourself as a thinker.',
  'Write a post analyzing the trend of {{trend}} in {{industry}}. Share what you''re observing, why it matters, and your prediction for what happens next. Be specific.',
  '[{"name": "trend", "label": "Trend", "placeholder": "e.g., AI-assisted coding", "required": true}, {"name": "industry", "label": "Industry", "placeholder": "e.g., Software development", "required": true}]',
  'retweets',
  'Weekday mornings',
  'advanced'
),

-- ============================================================
-- ENGAGEMENT / COMMUNITY (5)
-- ============================================================

(
  'Question for the Timeline',
  'engagement',
  'Ask a genuine question to spark discussion. Easy engagement.',
  'Write a post asking {{question}} about {{topic}}. Make it specific enough to get thoughtful responses. Optionally share your own answer first to get the conversation started.',
  '[{"name": "question", "label": "Question", "placeholder": "e.g., What''s the best advice you ignored?", "required": true}, {"name": "topic", "label": "Topic Area", "placeholder": "e.g., Building products, Career", "required": true}]',
  'replies',
  'Evenings',
  'beginner'
),

(
  'This or That',
  'engagement',
  'Binary choice debate. Forces people to pick sides.',
  'Write a "this or that" debate post: {{option_a}} vs {{option_b}}. Give a brief case for each side. Ask people to pick and explain why. Make it genuinely debatable.',
  '[{"name": "option_a", "label": "Option A", "placeholder": "e.g., Move fast", "required": true}, {"name": "option_b", "label": "Option B", "placeholder": "e.g., Move carefully", "required": true}]',
  'replies',
  'Afternoons',
  'beginner'
),

(
  'Rate This 1-10',
  'engagement',
  'Ask people to rate something. Simple engagement mechanic.',
  'Write a post asking people to rate {{thing}} from 1-10. Share your own rating with a brief reason. Make it something people have opinions about.',
  '[{"name": "thing", "label": "Thing to Rate", "placeholder": "e.g., Remote work, AI tools", "required": true}]',
  'replies',
  'Evenings',
  'beginner'
),

(
  'Fill in the Blank',
  'engagement',
  'Mad-libs style engagement. Incredibly easy to respond to.',
  'Write a fill-in-the-blank post about {{topic}}. Make the blank reveal something interesting about the responder. Share your own answer to start.',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g., Productivity, Building", "required": true}]',
  'replies',
  'Lunch time',
  'beginner'
),

(
  'Underrated Thing',
  'engagement',
  'Ask people to share hidden gems. Crowdsource great content.',
  'Write a post asking for the most underrated {{category}}. Share your own pick with a brief reason why. Encourage quote tweets for visibility.',
  '[{"name": "category", "label": "Category", "placeholder": "e.g., Productivity app, Business book, Tool", "required": true}]',
  'replies',
  'Mornings',
  'beginner'
);
