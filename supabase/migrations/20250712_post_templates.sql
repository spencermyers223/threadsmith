-- Post Templates Library
-- System templates (curated CT post formats) and user custom templates

-- System templates table
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

-- User custom templates table
CREATE TABLE IF NOT EXISTS public.user_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text,
  prompt_template text NOT NULL,
  variables jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS for user_templates
ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON public.user_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.user_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.user_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.user_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Public read for system templates (no RLS needed, but let's be explicit)
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system templates"
  ON public.post_templates FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_post_templates_category ON public.post_templates(category);
CREATE INDEX idx_user_templates_user_id ON public.user_templates(user_id);

-- ============================================================
-- SEED DATA: 25 proven CT post templates
-- ============================================================

INSERT INTO public.post_templates (title, category, description, prompt_template, example_output, variables, engagement_type, best_time, difficulty) VALUES

-- ============================================================
-- ALPHA DROPS (5)
-- ============================================================

(
  'Deep Dive Research Reveal',
  'alpha',
  'Share exclusive research findings that make you look like a serious analyst. Perfect for building credibility.',
  'Write a compelling crypto Twitter post revealing deep research findings about {{topic}}. Include a specific data point or insight about {{key_finding}}. The tone should be authoritative but accessible — like you''re letting people in on something you spent hours researching. End with a forward-looking implication. Keep it under 280 characters for the hook tweet, then expand in a short thread if needed.',
  '🔍 Spent 6 hours digging into Eigenlayer''s restaking contracts.

Most people don''t realize: 73% of restaked ETH comes from just 12 wallets.

This isn''t "decentralized security" — it''s a cartel with extra steps.

Here''s what this means for your ETH 🧵👇',
  '[{"name": "topic", "label": "Research Topic", "placeholder": "e.g. Eigenlayer restaking mechanics", "required": true}, {"name": "key_finding", "label": "Key Finding", "placeholder": "e.g. Concentration of restaked ETH in few wallets", "required": true}]',
  'retweets',
  'Weekday mornings EST (9-11 AM)',
  'advanced'
),

(
  'What Nobody''s Talking About',
  'alpha',
  'The classic "hidden signal" format. Creates FOMO and positions you as someone who sees what others miss.',
  'Write a crypto Twitter post about something important regarding {{topic}} that the market is overlooking. Frame it as "what nobody''s talking about" — the hidden signal in {{signal}}. Be specific with at least one concrete detail. Create urgency without being clickbaity. Under 280 chars.',
  'What nobody''s talking about:

{{protocol}} just quietly changed their token emission schedule.

New unlock: 40M tokens hitting the market March 15.

That''s 8% of circulating supply in one day.

Set your reminders. This will move price.',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g. Token unlock schedules", "required": true}, {"name": "signal", "label": "Hidden Signal", "placeholder": "e.g. Quiet changes to emission schedules", "required": true}]',
  'retweets',
  'Late evening EST (8-10 PM)',
  'intermediate'
),

(
  'Project Comparison Analysis',
  'alpha',
  'Side-by-side comparison that helps people make decisions. High save/bookmark rate.',
  'Write a crypto Twitter post comparing {{project_a}} vs {{project_b}} on {{comparison_metric}}. Use specific numbers or metrics. Be fair but have a clear lean. Format with clean spacing for readability. The goal is to help people understand the real differences, not just hype one over the other.',
  '{{project_a}} vs {{project_b}} — let''s talk real numbers:

TVL: $2.1B vs $890M
Daily active users: 45K vs 112K
Revenue/TVL ratio: 0.3% vs 1.2%

One has the money. The other has the users.

In crypto, users eventually win. Every time.',
  '[{"name": "project_a", "label": "Project A", "placeholder": "e.g. Aave", "required": true}, {"name": "project_b", "label": "Project B", "placeholder": "e.g. Compound", "required": true}, {"name": "comparison_metric", "label": "Comparison Focus", "placeholder": "e.g. Capital efficiency, user growth, revenue", "required": true}]',
  'likes',
  'Weekday afternoons EST (1-3 PM)',
  'intermediate'
),

(
  'Hidden Gem Discovery',
  'alpha',
  'The "I found something early" format. Drives massive engagement from people wanting to be early.',
  'Write a crypto Twitter post about discovering {{project}} as a potential hidden gem. Mention why it''s flying under the radar, highlight {{unique_angle}} as the key differentiator. Include market cap or valuation context. Be enthusiastic but not shilly — show genuine analytical reasoning.',
  'Found something interesting at $8M mcap that nobody''s covering yet.

{{project}} is building {{unique_angle}} and their GitHub has 200+ commits this month alone.

The team previously built at {{previous_company}}.

Not financial advice, but my research bag is positioned. 👀',
  '[{"name": "project", "label": "Project Name", "placeholder": "e.g. A lesser-known DeFi protocol", "required": true}, {"name": "unique_angle", "label": "What Makes It Special", "placeholder": "e.g. Novel approach to MEV protection", "required": true}]',
  'replies',
  'Weekend mornings EST (10 AM - 12 PM)',
  'intermediate'
),

(
  'Technical Analysis Breakdown',
  'alpha',
  'Chart-based analysis post. Works great with an image attachment showing the chart.',
  'Write a crypto Twitter post breaking down the technical analysis of {{asset}}. Reference {{pattern_or_indicator}} and give a clear thesis on what happens next. Include specific price levels. Be direct — traders want actionable levels, not vague predictions. Mention timeframe.',
  '{{asset}} 4H chart is screaming.

Three things I''m watching:
• Bull div on RSI at $X support (held 4 times)
• Volume declining into this wedge (breakout loading)
• {{indicator}} just crossed bullish for first time since [date]

Target: $X
Invalidation: $Y

This is the cleanest setup I''ve seen in weeks.',
  '[{"name": "asset", "label": "Asset", "placeholder": "e.g. ETH, BTC, SOL", "required": true}, {"name": "pattern_or_indicator", "label": "Pattern/Indicator", "placeholder": "e.g. Bull divergence on RSI, descending wedge", "required": true}]',
  'likes',
  'Market open hours (9:30 AM EST)',
  'advanced'
),

-- ============================================================
-- CONTRARIAN TAKES (5)
-- ============================================================

(
  'Unpopular Opinion',
  'contrarian',
  'The classic contrarian format. Generates massive engagement because people NEED to reply either agreeing or disagreeing.',
  'Write a crypto Twitter "unpopular opinion" post about {{topic}}. The take should be genuinely contrarian — something that goes against the current consensus in {{narrative}}. Back it up with one strong reason. Make it spicy but defensible. Under 280 chars.',
  'Unpopular opinion: {{topic}} is actually bearish for crypto.

Here''s why nobody wants to hear this:

It centralizes power in the hands of [specific group] while giving retail the illusion of [benefit].

We''ve seen this playbook before. It ended badly.',
  '[{"name": "topic", "label": "Contrarian Topic", "placeholder": "e.g. ETF approval, L2 adoption, VC funding", "required": true}, {"name": "narrative", "label": "Current Narrative", "placeholder": "e.g. The consensus view you''re pushing against", "required": true}]',
  'replies',
  'Weekday evenings EST (6-8 PM)',
  'beginner'
),

(
  'Everyone''s Wrong About X',
  'contrarian',
  'Stronger version of unpopular opinion. The "I''m going to prove the crowd wrong" format.',
  'Write a crypto Twitter post arguing that the market is wrong about {{topic}}. Start with a bold claim, then provide {{evidence}} as your main argument. The tone should be confident but not arrogant. Make people question their assumptions.',
  'Everyone''s wrong about {{topic}}.

The market thinks: [consensus view]
The reality: [your contrarian view]

Here''s the data nobody''s looking at:
[specific evidence]

The last time sentiment was this one-sided, {{asset}} did [X]% in [timeframe].

Fade the crowd.',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g. Solana''s scaling approach", "required": true}, {"name": "evidence", "label": "Supporting Evidence", "placeholder": "e.g. On-chain data, historical precedent", "required": true}]',
  'replies',
  'Weekday mornings EST (8-10 AM)',
  'intermediate'
),

(
  'Counter-Narrative with Data',
  'contrarian',
  'The data-backed contrarian take. Harder to dismiss because you''re bringing receipts.',
  'Write a crypto Twitter post presenting a counter-narrative about {{topic}} backed by {{data_point}}. The current narrative is {{current_narrative}} but the data tells a different story. Be specific with numbers. Let the data do the talking.',
  'The narrative: "{{current_narrative}}"

The data:
📊 {{data_point}}
📉 [supporting metric]
🔍 [on-chain evidence]

When narrative and data diverge, always follow the data.

The last 3 times this happened: [historical examples]',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g. DeFi is dying narrative", "required": true}, {"name": "current_narrative", "label": "Current Narrative", "placeholder": "e.g. DeFi is dead, NFTs are over", "required": true}, {"name": "data_point", "label": "Key Data Point", "placeholder": "e.g. DeFi TVL up 40% in 90 days", "required": true}]',
  'retweets',
  'Weekday mornings EST (9-11 AM)',
  'advanced'
),

(
  'The Real Reason X Happened',
  'contrarian',
  'Insider-knowledge framing. Makes you look like you understand the game better than everyone else.',
  'Write a crypto Twitter post explaining the real reason behind {{event}}. The surface-level explanation is {{surface_explanation}} but the actual driver is {{real_reason}}. Connect dots that others aren''t connecting. Be specific.',
  'Everyone thinks {{event}} happened because of {{surface_explanation}}.

The real reason?

{{real_reason}}.

Follow the money:
→ [connection 1]
→ [connection 2]
→ [connection 3]

Once you see it, you can''t unsee it.',
  '[{"name": "event", "label": "Event", "placeholder": "e.g. The recent market dump, Protocol X''s pivot", "required": true}, {"name": "surface_explanation", "label": "Surface Explanation", "placeholder": "e.g. Macro fears, whale selling", "required": true}, {"name": "real_reason", "label": "Real Reason", "placeholder": "e.g. Insider knowledge about regulatory action", "required": true}]',
  'retweets',
  'Weekday afternoons EST (2-4 PM)',
  'advanced'
),

(
  'Myth-Busting Format',
  'contrarian',
  'The educational contrarian. Correct a common misconception with facts. Builds authority.',
  'Write a crypto Twitter post busting a common myth about {{myth}}. Clearly state what people believe, then explain why it''s wrong using {{correction}}. Keep it respectful but firm. The goal is to educate, not to dunk.',
  'Myth: "{{myth}}"

Reality: This hasn''t been true since [date/event].

Here''s what actually happens:

1. [Fact 1]
2. [Fact 2]  
3. [Fact 3]

Stop repeating this. It makes you look like you haven''t done your homework.

The real thing to watch: {{correction}}',
  '[{"name": "myth", "label": "Common Myth", "placeholder": "e.g. Mining is bad for the environment", "required": true}, {"name": "correction", "label": "The Truth", "placeholder": "e.g. Bitcoin mining incentivizes renewable energy", "required": true}]',
  'likes',
  'Weekday mornings EST (10 AM - 12 PM)',
  'beginner'
),

-- ============================================================
-- DATA POSTS (5)
-- ============================================================

(
  'On-Chain Metrics Spotlight',
  'data',
  'Pure data post. Screenshot-worthy metrics that people save and share.',
  'Write a crypto Twitter post highlighting interesting on-chain metrics for {{protocol}}. Focus on {{metric}} and explain why it matters. Use emoji bullets for clean formatting. Include the "so what" — why should anyone care about this number?',
  'On-chain update for {{protocol}}:

📊 {{metric}}: [specific number]
📈 30d change: +X%
🏦 Revenue: $X/day
👥 Daily active addresses: X

The metric nobody''s watching: [hidden insight]

This is what early-stage adoption looks like. Same pattern as [comparable protocol] in [year].',
  '[{"name": "protocol", "label": "Protocol", "placeholder": "e.g. Uniswap, Aave, Lido", "required": true}, {"name": "metric", "label": "Key Metric", "placeholder": "e.g. TVL growth, transaction volume, unique users", "required": true}]',
  'likes',
  'Weekday mornings EST (9-11 AM)',
  'intermediate'
),

(
  'Protocol Milestone Announcement',
  'data',
  'Celebrate a protocol hitting a big number. Works because people love round numbers and growth stories.',
  'Write a crypto Twitter post celebrating {{protocol}} hitting {{milestone}}. Put it in context — how fast did they get here? What does this mean vs competitors? Make it feel significant. Include a forward-looking take.',
  '🚨 {{protocol}} just hit {{milestone}}.

Timeline:
$0 → $100M: 8 months
$100M → $500M: 3 months  
$500M → $1B: 6 weeks

For context, [competitor] took [X] years to reach this level.

The acceleration is the signal. Not the number.',
  '[{"name": "protocol", "label": "Protocol", "placeholder": "e.g. Jupiter, Kamino", "required": true}, {"name": "milestone", "label": "Milestone", "placeholder": "e.g. $1B TVL, 1M users, 10M transactions", "required": true}]',
  'retweets',
  'Any time (milestone-driven)',
  'beginner'
),

(
  'Market Trend Analysis',
  'data',
  'Zoom out and spot the trend. Data-driven market commentary that ages well.',
  'Write a crypto Twitter post analyzing a market trend around {{trend}}. Use {{timeframe}} data to support your thesis. Include at least 2-3 specific data points. End with what you think happens next.',
  'A trend nobody''s connecting:

Over the past {{timeframe}}:
📊 {{trend}} metric: [direction + magnitude]
📈 Correlation with [related metric]: [X]%
🔍 Similar pattern last seen: [date]

What happened next last time: [outcome]

History doesn''t repeat, but it rhymes. Positioning accordingly.',
  '[{"name": "trend", "label": "Market Trend", "placeholder": "e.g. Stablecoin inflows, exchange outflows", "required": true}, {"name": "timeframe", "label": "Timeframe", "placeholder": "e.g. 30 days, 90 days, 6 months", "required": true}]',
  'retweets',
  'Weekday mornings EST (8-10 AM)',
  'advanced'
),

(
  'Wallet Tracking Insight',
  'data',
  'The "smart money is moving" format. People love following whale wallets.',
  'Write a crypto Twitter post about interesting wallet activity related to {{wallet_type}} and {{activity}}. Be specific about amounts and timing. Add your interpretation of what this movement signals.',
  'Smart money alert 🚨

A wallet linked to {{wallet_type}} just {{activity}}.

Details:
💰 Amount: $X
⏰ Timing: [context about timing]
📍 Destination: [where it went]

Last time this wallet made a similar move: [what happened]

Not saying it''s a signal, but... 👀',
  '[{"name": "wallet_type", "label": "Wallet Type", "placeholder": "e.g. A known VC fund, early ETH whale, protocol treasury", "required": true}, {"name": "activity", "label": "Activity", "placeholder": "e.g. Moved $50M to Coinbase, accumulated X token", "required": true}]',
  'replies',
  'As it happens (time-sensitive)',
  'intermediate'
),

(
  'TVL/Volume Comparison',
  'data',
  'Side-by-side data comparison. Clean formatting makes this highly shareable.',
  'Write a crypto Twitter post comparing TVL or volume data across {{category}} protocols. Compare {{protocols}} using clean formatting. Include a takeaway about what the data tells us about the sector.',
  '{{category}} leaderboard update:

1. [Protocol A]: $X TVL (+Y% 30d)
2. [Protocol B]: $X TVL (+Y% 30d)
3. [Protocol C]: $X TVL (+Y% 30d)
4. [Protocol D]: $X TVL (+Y% 30d)
5. [Protocol E]: $X TVL (+Y% 30d)

The story: [insight about category trends]

Biggest movers this month tell you where capital is rotating.',
  '[{"name": "category", "label": "Category", "placeholder": "e.g. Liquid staking, DEX, Lending", "required": true}, {"name": "protocols", "label": "Protocols to Compare", "placeholder": "e.g. Lido, Rocket Pool, Coinbase cbETH", "required": true}]',
  'likes',
  'Monday mornings EST (weekly recap feel)',
  'beginner'
),

-- ============================================================
-- BUILD IN PUBLIC (5)
-- ============================================================

(
  'Progress Update with Metrics',
  'build-in-public',
  'The weekly/monthly build update. Share real numbers to build trust and attract followers who root for you.',
  'Write a crypto Twitter build-in-public progress update for {{project}}. Include specific metrics: {{metrics}}. Be honest about both wins and challenges. End with what''s next. The tone should be genuine and humble.',
  '{{project}} — Week [X] update:

📊 {{metrics}}
✅ Shipped: [feature/milestone]
🐛 Fixed: [challenge overcome]
📚 Learned: [honest lesson]

What''s next:
→ [priority 1]
→ [priority 2]

Building in public because the accountability keeps me shipping. 🚢',
  '[{"name": "project", "label": "Your Project", "placeholder": "e.g. My DeFi dashboard, My NFT marketplace", "required": true}, {"name": "metrics", "label": "Key Metrics", "placeholder": "e.g. 500 users, $10K MRR, 2K daily active", "required": true}]',
  'follows',
  'Friday afternoons EST (weekly recap)',
  'beginner'
),

(
  'Lesson Learned Post',
  'build-in-public',
  'Share a hard lesson from building. Vulnerability + insight = high engagement.',
  'Write a crypto Twitter post about a lesson learned while building {{project}}. The lesson is about {{lesson}}. Be vulnerable about the mistake or challenge, then share the insight. People connect with honesty.',
  'Lesson from building {{project}} that nobody warns you about:

{{lesson}}

I wasted [X weeks/months/dollars] learning this the hard way.

What I''d do differently:
1. [actionable advice]
2. [actionable advice]
3. [actionable advice]

Sharing so you don''t have to make the same mistake. 🧵',
  '[{"name": "project", "label": "Your Project", "placeholder": "e.g. My crypto startup", "required": true}, {"name": "lesson", "label": "Lesson Learned", "placeholder": "e.g. Don''t build features nobody asked for", "required": true}]',
  'replies',
  'Weekday mornings EST (9-11 AM)',
  'beginner'
),

(
  'Feature Announcement',
  'build-in-public',
  'Announce a new feature with excitement. Show the before/after or the problem it solves.',
  'Write a crypto Twitter post announcing a new feature for {{project}}: {{feature}}. Explain the problem it solves and why users should care. Include a clear CTA. Keep the energy high but not over-the-top.',
  'Just shipped: {{feature}} for {{project}} 🚀

The problem: [what sucked before]
The fix: [what it does now]

This was our #1 requested feature and it took [timeframe] to get right.

Try it now: [link]

Reply with your feedback — we''re iterating fast. ⚡',
  '[{"name": "project", "label": "Your Project", "placeholder": "e.g. xthread", "required": true}, {"name": "feature", "label": "New Feature", "placeholder": "e.g. AI-powered thread generation, Dark mode", "required": true}]',
  'likes',
  'Tuesday-Thursday mornings EST',
  'beginner'
),

(
  'User Feedback Response',
  'build-in-public',
  'Show that you listen to users. Quote their feedback and show what you did about it.',
  'Write a crypto Twitter post responding to user feedback about {{project}}. A user said {{feedback}} and here''s what you did about it: {{response}}. Show that you listen and move fast.',
  'A user DMed me: "{{feedback}}"

They were right. This was a blind spot.

So we:
✅ [Action 1]
✅ [Action 2]  
✅ [Action 3]

Shipped the fix in [timeframe].

Your users are your best product managers. Listen to them. 🎯',
  '[{"name": "project", "label": "Your Project", "placeholder": "e.g. My DeFi app", "required": true}, {"name": "feedback", "label": "User Feedback", "placeholder": "e.g. Your onboarding is confusing", "required": true}, {"name": "response", "label": "What You Did", "placeholder": "e.g. Rebuilt the entire onboarding flow", "required": true}]',
  'follows',
  'Weekday afternoons EST',
  'beginner'
),

(
  'Revenue/Growth Milestone',
  'build-in-public',
  'Share a revenue or growth milestone. Real numbers build credibility and attract builders.',
  'Write a crypto Twitter post celebrating a revenue or growth milestone for {{project}}: {{milestone}}. Share the journey — where you started, how long it took, key decisions that got you here. Be genuine, not braggy.',
  '{{project}} just hit {{milestone}}.

The journey:
Month 1: $0, 3 users (all friends)
Month 3: $500 MRR, 50 users
Month 6: {{milestone}}

What actually moved the needle:
→ [key decision 1]
→ [key decision 2]
→ [key decision 3]

If you''re building in crypto right now — keep going. The market rewards persistence.',
  '[{"name": "project", "label": "Your Project", "placeholder": "e.g. My SaaS tool", "required": true}, {"name": "milestone", "label": "Milestone", "placeholder": "e.g. $5K MRR, 1000 users, first enterprise client", "required": true}]',
  'follows',
  'Any time (milestone-driven)',
  'intermediate'
),

-- ============================================================
-- ENGAGEMENT HOOKS (5)
-- ============================================================

(
  'Wrong Answers Only',
  'engagement',
  'The "wrong answers only" format. Low effort to reply = high engagement. Great for growing followers.',
  'Write a crypto Twitter "wrong answers only" post about {{topic}}. The prompt should be funny and relatable to crypto people. Make it easy for people to reply with creative wrong answers. Keep it short and punchy.',
  'Wrong answers only:

What does {{topic}} actually stand for? 👇

(I''ll start: [funny wrong answer])',
  '[{"name": "topic", "label": "Topic", "placeholder": "e.g. HODL, DeFi, DAO, WAGMI", "required": true}]',
  'replies',
  'Evenings/weekends EST',
  'beginner'
),

(
  'Hot Take: Rate 1-10',
  'engagement',
  'Ask people to rate something. Simple engagement mechanic that drives tons of replies.',
  'Write a crypto Twitter post asking people to rate {{topic}} on a scale of 1-10. Add your own rating with a brief justification. Make it something people have strong opinions about.',
  'Rate {{topic}} from 1-10.

My rating: [X]/10

Reason: [brief hot take justification]

Drop your rating below 👇

(Be honest, anon. No wrong answers.)',
  '[{"name": "topic", "label": "Thing to Rate", "placeholder": "e.g. Ethereum''s roadmap, Solana''s UX, Bitcoin maxis", "required": true}]',
  'replies',
  'Weekday evenings EST (6-9 PM)',
  'beginner'
),

(
  'Fill in the Blank',
  'engagement',
  'The fill-in-the-blank format. Incredibly easy to engage with. Great reply-farming mechanic.',
  'Write a crypto Twitter fill-in-the-blank post about {{topic}}. The blank should be positioned so that answers reveal something about the person''s crypto perspective. Make it fun and inviting.',
  'Fill in the blank:

"The most overrated thing in crypto is ________."

I''ll go first: {{topic}}

Your turn 👇',
  '[{"name": "topic", "label": "Topic/Theme", "placeholder": "e.g. Governance tokens, KOL calls, VC narratives", "required": true}]',
  'replies',
  'Weekday lunchtimes EST (12-1 PM)',
  'beginner'
),

(
  'This or That Debate',
  'engagement',
  'Binary choice debate starter. Forces people to pick a side, which drives engagement.',
  'Write a crypto Twitter "this or that" post comparing {{option_a}} vs {{option_b}}. Frame it as a genuine debate. Add a brief case for each side. Ask people to pick and explain why.',
  '{{option_a}} or {{option_b}}?

The case for {{option_a}}: [1-2 sentences]
The case for {{option_b}}: [1-2 sentences]

There''s no wrong answer, but your choice says a lot about your thesis.

Pick one and explain why 👇',
  '[{"name": "option_a", "label": "Option A", "placeholder": "e.g. ETH", "required": true}, {"name": "option_b", "label": "Option B", "placeholder": "e.g. SOL", "required": true}]',
  'replies',
  'Weekday afternoons EST (2-4 PM)',
  'beginner'
),

(
  'Most Underrated X',
  'engagement',
  'Community crowdsourcing format. Gets people sharing their favorite hidden gems.',
  'Write a crypto Twitter post asking the community about the most underrated {{category}}. Frame it so people want to share their picks. Add your own pick to get the conversation started.',
  'Most underrated {{category}} right now?

I''ll start: [your pick]

Reason: [1 sentence why]

Quote tweet or reply with yours — let''s build a list the timeline needs to see. 🔍',
  '[{"name": "category", "label": "Category", "placeholder": "e.g. L2, DeFi protocol, NFT project, crypto podcast", "required": true}]',
  'replies',
  'Weekday mornings EST (9-11 AM)',
  'beginner'
);
