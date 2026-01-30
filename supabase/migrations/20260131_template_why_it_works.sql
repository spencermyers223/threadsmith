-- Add "why it works" explanations to templates
-- This helps users understand the psychology behind each template

ALTER TABLE post_templates ADD COLUMN IF NOT EXISTS why_it_works text;

-- Build in Public templates
UPDATE post_templates SET why_it_works = 'Social proof: Real metrics create credibility. Accountability narrative: Followers invest in your journey. Algorithm boost: Regular cadence trains the algorithm. FOMO: Others building want to see if their pace matches.' WHERE title = 'Weekly Progress Update';

UPDATE post_templates SET why_it_works = 'Vulnerability principle: Admitting mistakes builds trust (Brené Brown effect). Value exchange: Readers get wisdom without the pain. Reply magnet: People love sharing their own lessons. Saves/bookmarks: Actionable advice gets saved.' WHERE title = 'Lesson Learned';

UPDATE post_templates SET why_it_works = 'News hook: "New" triggers dopamine response. Problem-solution format: Clear value proposition. Urgency: Limited window to engage with fresh content. Social sharing: Early adopters share to seem "in the know."' WHERE title = 'Feature Launch';

UPDATE post_templates SET why_it_works = 'Aspiration trigger: Others want the same results. Credibility builder: Numbers don''t lie. Timeline storytelling: Journey arc is inherently engaging. Quote tweet bait: People share to add commentary.' WHERE title = 'Milestone Post';

UPDATE post_templates SET why_it_works = 'Exclusivity illusion: "Not everyone sees this." Relatability: Shows you''re human, not a polished brand. Curiosity gap: People want to peek behind the curtain. Conversation starter: Messy reality invites opinions.' WHERE title = 'Behind the Scenes';

-- Hot Takes / Contrarian templates
UPDATE post_templates SET why_it_works = 'Tribal activation: Forces agree/disagree → high engagement. Controversy algorithm: Replies weigh 75x more than likes. Identity expression: People reply to signal their values. Virality engine: Debate = more surface area.' WHERE title = 'Unpopular Opinion';

UPDATE post_templates SET why_it_works = 'Authority positioning: "I know something you don''t." Cognitive dissonance: Challenges beliefs → people must respond. Evidence requirement: Forces better thinking. Quote tweet goldmine: Perfect for "well actually" responses.' WHERE title ILIKE '%wrong about%' OR title = 'Contrarian Take';

UPDATE post_templates SET why_it_works = 'Insider framing: Creates perception of exclusive knowledge. Pattern recognition: Humans love connecting hidden dots. Conspiracy-lite appeal: Everyone wants to know "the truth." Retweet-worthy: People share to seem informed.' WHERE title ILIKE '%real reason%';

UPDATE post_templates SET why_it_works = 'Educational value: Clear save/bookmark trigger. Correctness instinct: People love being right. Shareable: "I''ve been saying this for years." Authority builder: Positions you as the truth-teller.' WHERE title ILIKE '%myth%';

UPDATE post_templates SET why_it_works = 'Commitment device: You''re betting your reputation. Time-bound tension: Creates anticipation and follow-up opportunity. Engagement insurance: People will remind you if wrong. Conversation thread: Natural multi-post potential.' WHERE title ILIKE '%hot take%' OR title ILIKE '%prediction%';

-- Insights / Value Posts templates
UPDATE post_templates SET why_it_works = 'Proof of concept: You did it, so it''s possible. Actionable format: Step-by-step is inherently saveable. Specificity principle: Exact numbers build trust. Reply trigger: "I tried this too" responses.' WHERE title ILIKE '%how i%' OR title ILIKE '%how to%';

UPDATE post_templates SET why_it_works = 'Curation value: You''ve done the research for them. Affiliate potential: Naturally monetizable. High save rate: Reference material for later. Recommendation algorithm: Lists perform well.' WHERE title ILIKE '%tools%' OR title ILIKE '%stack%';

UPDATE post_templates SET why_it_works = 'Intellectual credibility: Shows systematic thinking. Portable value: Frameworks apply beyond the example. Thread potential: Can expand each point. Quote tweet bait: "This changed how I think."' WHERE title ILIKE '%framework%' OR title ILIKE '%mental model%';

UPDATE post_templates SET why_it_works = 'Loss aversion: Humans weigh losses > gains (Kahneman). Warning = value: Saves readers from pain. Experience signal: Shows you''ve been in the trenches. Humble brag opportunity: Implies you''ve succeeded.' WHERE title ILIKE '%mistake%' OR title ILIKE '%avoid%';

UPDATE post_templates SET why_it_works = 'Future-facing: Predictions attract attention. Expertise signal: Shows you''re tracking the space. Debate starter: Others have different predictions. Follow magnet: People want to see if you''re right.' WHERE title ILIKE '%trend%' OR title ILIKE '%future%';

-- Engagement / Community templates
UPDATE post_templates SET why_it_works = 'Lowest friction: Questions are easy to answer. Algorithm gold: Direct reply invitation. Community building: Makes followers feel heard. Content research: Crowdsources ideas for future posts.' WHERE title ILIKE '%question%' AND title NOT ILIKE '%this or that%';

UPDATE post_templates SET why_it_works = 'Binary = easy: Two choices reduce decision fatigue. Tribal dynamics: People defend their choice. Debate engine: Natural disagreement built-in. High reply velocity: Quick responses → algorithm boost.' WHERE title ILIKE '%this or that%' OR title ILIKE '%vs%';

UPDATE post_templates SET why_it_works = 'Gamification: Numbers make it feel like a game. Low effort: Just pick a number. Opinion expression: People love sharing opinions. Data gathering: Can reference results later.' WHERE title ILIKE '%rate%' OR title ILIKE '%1-10%';

UPDATE post_templates SET why_it_works = 'Completion instinct: Humans want to fill gaps (Gestalt psychology). Self-expression: Reveals something about responder. Lowest friction possible: One word/phrase response. Viral potential: Creative answers get likes.' WHERE title ILIKE '%fill in%' OR title ILIKE '%blank%';

UPDATE post_templates SET why_it_works = 'Expertise showcase: Let others show what they know. Discovery value: Crowdsourced recommendations. Quote tweet friendly: People share their picks. Community building: Makes followers feel like contributors.' WHERE title ILIKE '%underrated%';

-- Generic fallback for any remaining templates
UPDATE post_templates SET why_it_works = 'This template format is proven to drive engagement through clear structure and natural reply triggers.' WHERE why_it_works IS NULL;
