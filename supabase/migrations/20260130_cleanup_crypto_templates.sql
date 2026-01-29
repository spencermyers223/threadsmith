-- Cleanup: Remove crypto-specific templates
-- xthread is for general tech Twitter, not crypto-specific
-- Keep only the 20 general tech/founder templates

-- Delete ALL system templates first
DELETE FROM public.post_templates WHERE is_system = true;

-- Re-insert only the general templates (copied from 20250129_general_templates.sql)
INSERT INTO public.post_templates (title, category, description, prompt_template, variables, engagement_type, best_time, difficulty) VALUES

-- BUILD IN PUBLIC (5)
('Weekly Progress Update', 'build-in-public', 'Share your weekly wins, metrics, and learnings.', 'Write a build-in-public progress update for {{project}}. Include these metrics: {{metrics}}. Share one win, one challenge, and what''s next. Be honest and specific.', '[{"name": "project", "label": "Project Name", "placeholder": "e.g., My SaaS", "required": true}, {"name": "metrics", "label": "Key Metrics", "placeholder": "e.g., 500 users, $2K MRR", "required": true}]', 'follows', 'Friday afternoons', 'beginner'),

('Lesson Learned Post', 'build-in-public', 'Share a hard lesson from building.', 'Write a post about a lesson learned while building {{project}}. The lesson: {{lesson}}. Be vulnerable about what went wrong, then share the actionable insight.', '[{"name": "project", "label": "Project", "placeholder": "e.g., my startup", "required": true}, {"name": "lesson", "label": "Lesson", "placeholder": "e.g., Don''t build features nobody asked for", "required": true}]', 'replies', 'Weekday mornings', 'beginner'),

('Feature Launch Announcement', 'build-in-public', 'Announce a new feature with energy.', 'Write a feature launch announcement for {{project}}. The new feature: {{feature}}. Explain the problem it solves and include a clear CTA.', '[{"name": "project", "label": "Project", "placeholder": "e.g., xthread", "required": true}, {"name": "feature", "label": "New Feature", "placeholder": "e.g., AI thread generation", "required": true}]', 'likes', 'Tuesday-Thursday mornings', 'beginner'),

('Revenue/Growth Milestone', 'build-in-public', 'Celebrate hitting a milestone.', 'Write a post celebrating {{milestone}} for {{project}}. Share the journey timeline and what decisions made the difference.', '[{"name": "project", "label": "Project", "placeholder": "e.g., My SaaS", "required": true}, {"name": "milestone", "label": "Milestone", "placeholder": "e.g., $5K MRR, 1000 users", "required": true}]', 'follows', 'Any time', 'intermediate'),

('Behind the Scenes', 'build-in-public', 'Show the messy reality of building.', 'Write a behind-the-scenes post about {{topic}} in building {{project}}. Show the reality that most people don''t see.', '[{"name": "project", "label": "Project", "placeholder": "e.g., my app", "required": true}, {"name": "topic", "label": "Topic", "placeholder": "e.g., How I handle customer support alone", "required": true}]', 'replies', 'Evenings', 'beginner'),

-- HOT TAKES / CONTRARIAN (5)
('Unpopular Opinion', 'contrarian', 'Share a contrarian take that challenges conventional wisdom.', 'Write an unpopular opinion post about {{topic}}. Make it spicy but defensible. Back it up with one strong reason.', '[{"name": "topic", "label": "Topic", "placeholder": "e.g., Why hustle culture is overrated", "required": true}]', 'replies', 'Weekday evenings', 'beginner'),

('Everyone''s Wrong About X', 'contrarian', 'Challenge the crowd with evidence.', 'Write a post arguing that most people are wrong about {{topic}}. Provide {{evidence}} as your main argument.', '[{"name": "topic", "label": "Topic", "placeholder": "e.g., productivity advice", "required": true}, {"name": "evidence", "label": "Evidence", "placeholder": "e.g., Studies show most tips don''t work", "required": true}]', 'replies', 'Weekday mornings', 'intermediate'),

('The Real Reason X Happened', 'contrarian', 'Insider-knowledge framing.', 'Write a post explaining the real reason behind {{event}}. The surface explanation is {{surface}}, but the actual driver is {{real_reason}}.', '[{"name": "event", "label": "Event", "placeholder": "e.g., Why that startup failed", "required": true}, {"name": "surface", "label": "Surface Explanation", "placeholder": "e.g., They ran out of money", "required": true}, {"name": "real_reason", "label": "Real Reason", "placeholder": "e.g., Founder-market fit issues", "required": true}]', 'retweets', 'Afternoons', 'advanced'),

('Myth-Busting', 'contrarian', 'Correct a common misconception with facts.', 'Write a myth-busting post about {{myth}}. Explain why it''s wrong and provide {{correction}} as the truth.', '[{"name": "myth", "label": "Common Myth", "placeholder": "e.g., You need VC funding to succeed", "required": true}, {"name": "correction", "label": "The Truth", "placeholder": "e.g., Most successful businesses are bootstrapped", "required": true}]', 'likes', 'Mornings', 'beginner'),

('Hot Take with Stakes', 'contrarian', 'Make a bold prediction or claim.', 'Write a hot take about {{topic}}. Make a specific, bold claim: {{claim}}. Explain your reasoning with conviction.', '[{"name": "topic", "label": "Topic", "placeholder": "e.g., The future of AI", "required": true}, {"name": "claim", "label": "Bold Claim", "placeholder": "e.g., Most AI startups will fail by 2026", "required": true}]', 'replies', 'Peak hours', 'intermediate'),

-- INSIGHTS / VALUE (5)
('How I Did X', 'alpha', 'Share a specific result with exact steps.', 'Write a post about how you achieved {{result}}. Be specific about the {{method}} you used. Include 3-5 actionable steps.', '[{"name": "result", "label": "Result", "placeholder": "e.g., Got 10K followers in 60 days", "required": true}, {"name": "method", "label": "Method", "placeholder": "e.g., Reply strategy and consistent posting", "required": true}]', 'retweets', 'Mornings', 'intermediate'),

('Tools I Actually Use', 'alpha', 'Share your real tech stack or tools.', 'Write a post about the tools you actually use for {{purpose}}. List {{tools}} with a brief note on why each one.', '[{"name": "purpose", "label": "Purpose", "placeholder": "e.g., Running my SaaS", "required": true}, {"name": "tools", "label": "Tools", "placeholder": "e.g., Notion, Linear, Figma", "required": true}]', 'likes', 'Weekdays', 'beginner'),

('Framework or Mental Model', 'alpha', 'Share a thinking framework.', 'Write a post explaining the {{framework}} framework for {{application}}. Give a concrete example of how to apply it.', '[{"name": "framework", "label": "Framework Name", "placeholder": "e.g., 2x2 matrix, First Principles", "required": true}, {"name": "application", "label": "What It''s For", "placeholder": "e.g., Prioritizing features", "required": true}]', 'retweets', 'Weekday mornings', 'intermediate'),

('Mistakes to Avoid', 'alpha', 'Warn others about common pitfalls.', 'Write a post about mistakes to avoid when {{situation}}. List {{mistakes}} with brief explanations.', '[{"name": "situation", "label": "Situation", "placeholder": "e.g., Starting a startup", "required": true}, {"name": "mistakes", "label": "Key Mistakes", "placeholder": "e.g., Building without talking to users", "required": true}]', 'likes', 'Any time', 'beginner'),

('Industry Trend Analysis', 'alpha', 'Share your take on where things are heading.', 'Write a post analyzing the trend of {{trend}} in {{industry}}. Share what you''re observing and your prediction.', '[{"name": "trend", "label": "Trend", "placeholder": "e.g., AI-assisted coding", "required": true}, {"name": "industry", "label": "Industry", "placeholder": "e.g., Software development", "required": true}]', 'retweets', 'Weekday mornings', 'advanced'),

-- ENGAGEMENT (5)
('Question for the Timeline', 'engagement', 'Ask a genuine question to spark discussion.', 'Write a post asking {{question}} about {{topic}}. Share your own answer first to get conversation started.', '[{"name": "question", "label": "Question", "placeholder": "e.g., What''s the best advice you ignored?", "required": true}, {"name": "topic", "label": "Topic Area", "placeholder": "e.g., Building products", "required": true}]', 'replies', 'Evenings', 'beginner'),

('This or That', 'engagement', 'Binary choice debate.', 'Write a "this or that" debate post: {{option_a}} vs {{option_b}}. Give a brief case for each side.', '[{"name": "option_a", "label": "Option A", "placeholder": "e.g., Move fast", "required": true}, {"name": "option_b", "label": "Option B", "placeholder": "e.g., Move carefully", "required": true}]', 'replies', 'Afternoons', 'beginner'),

('Rate This 1-10', 'engagement', 'Ask people to rate something.', 'Write a post asking people to rate {{thing}} from 1-10. Share your own rating with a brief reason.', '[{"name": "thing", "label": "Thing to Rate", "placeholder": "e.g., Remote work, AI tools", "required": true}]', 'replies', 'Evenings', 'beginner'),

('Fill in the Blank', 'engagement', 'Mad-libs style engagement.', 'Write a fill-in-the-blank post about {{topic}}. Make the blank reveal something interesting. Share your own answer.', '[{"name": "topic", "label": "Topic", "placeholder": "e.g., Productivity, Building", "required": true}]', 'replies', 'Lunch time', 'beginner'),

('Underrated Thing', 'engagement', 'Ask people to share hidden gems.', 'Write a post asking for the most underrated {{category}}. Share your own pick with a brief reason.', '[{"name": "category", "label": "Category", "placeholder": "e.g., Productivity app, Business book", "required": true}]', 'replies', 'Mornings', 'beginner');
