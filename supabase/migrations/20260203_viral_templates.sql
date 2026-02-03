-- Viral Examples Templates
-- Real-world proven formats with analysis of why they work

INSERT INTO post_templates (title, category, description, prompt_template, why_it_works, content_type, difficulty) VALUES

-- Format 1: The Unexpected Truth
('The Unexpected Truth', 'viral', 
 'Challenge a common belief with a counterintuitive insight. Format: "[Common belief] is wrong. Here''s why..."',
 'Write a viral tweet that challenges the common belief about {{topic}}. 

Structure:
- Opening: State a widely held belief, then counter it
- Middle: Explain the unexpected truth with clarity
- End: Make it memorable with a sharp conclusion

The tweet should feel like a revelation. Make the reader stop scrolling and rethink their assumptions.',
 'Challenges assumptions, creates cognitive dissonance, positions author as contrarian thinker. People share content that makes them look smart for having found it.',
 'post', 'medium'),

-- Format 2: The Simple List
('The "X things I learned" List', 'viral',
 'Share lessons learned in a numbered list. Format: "I did X for Y time. Here''s what I learned..."',
 'Write a viral tweet sharing what you learned about {{topic}}.

Structure:
- Hook: "I spent [time] doing [thing]. Here''s what I learned:"
- List: 3-5 numbered lessons, each one punchy and actionable
- Each point should be a complete insight on its own

Make each lesson feel hard-earned and valuable. Mix obvious truths with surprising insights.',
 'Lists are scannable and shareable. The "I did X" opener creates credibility. People love condensed wisdom that saves them time.',
 'post', 'easy'),

-- Format 3: The Hot Take
('The Spicy Hot Take', 'viral',
 'A bold, controversial opinion that sparks debate. Must be defensible but provocative.',
 'Write a viral hot take tweet about {{topic}}.

Structure:
- Lead with the controversial opinion (no hedge words)
- Optional: One sentence of reasoning
- Must be something you can actually defend if challenged

The opinion should make some people say "finally someone said it" and others want to argue. Avoid being offensive - be thought-provoking instead.',
 'Controversial content drives engagement through replies and quote tweets. People share to either agree strongly or challenge. Creates "I was just thinking this" resonance.',
 'post', 'hard'),

-- Format 4: The Before/After
('The Transformation Story', 'viral',
 'Show a dramatic before/after change. Format: "3 years ago I was X. Today I''m Y. Here''s what changed..."',
 'Write a viral tweet about a transformation related to {{topic}}.

Structure:
- Before state: Paint a relatable struggle
- After state: Show the desirable outcome  
- The change: What specifically made the difference
- Optional: One actionable takeaway

Make both states vivid and specific. The transformation should feel achievable but impressive.',
 'Transformation stories are inherently compelling. They give hope while being relatable. The "how" creates curiosity and saves/bookmarks.',
 'post', 'medium'),

-- Format 5: The Uncomfortable Truth
('The Uncomfortable Truth', 'viral',
 'Say something true that most people don''t want to hear. Frames harsh reality as helpful medicine.',
 'Write a viral tweet sharing an uncomfortable truth about {{topic}}.

Structure:
- Open with "Uncomfortable truth:" or "Hard pill to swallow:"
- State the truth directly, no softening
- Explain why it matters or what to do about it

This should be something people need to hear, not just something controversial. It should help them, even if it stings.',
 'Brutal honesty cuts through noise. People share to feel "real" and to warn others. Creates strong agree/disagree reactions that drive engagement.',
 'post', 'hard'),

-- Format 6: The Practical Framework
('The Simple Framework', 'viral',
 'Give people a mental model or framework they can actually use. Format: "The X Framework for Y..."',
 'Create a viral tweet presenting a simple framework for {{topic}}.

Structure:
- Name the framework (make it memorable)
- Explain it in 1-2 sentences
- Show how to apply it with a quick example

The best frameworks are simple enough to remember and powerful enough to actually change behavior. Avoid jargon.',
 'Frameworks are highly shareable because they''re useful. People bookmark them and return to them. Creates "this is gold" reaction.',
 'post', 'medium'),

-- Format 7: The Pattern Recognition
('The Pattern I Noticed', 'viral',
 'Share an observation about a pattern most people miss. Format: "I''ve noticed something about [successful people/companies/trends]..."',
 'Write a viral tweet sharing a pattern you''ve noticed about {{topic}}.

Structure:
- "I''ve noticed..." or "Pattern:" opener
- Describe what successful people/outcomes have in common
- Make it specific and actionable

The pattern should feel like insider knowledge. Something hiding in plain sight that, once seen, can''t be unseen.',
 'Pattern recognition signals expertise. People share to seem observant. Creates "wow I never noticed that" moments.',
 'post', 'medium'),

-- Format 8: The Permission Slip
('The Permission Slip', 'viral',
 'Give people permission to do something they secretly want to do. Format: "It''s okay to X. In fact, it might be better..."',
 'Write a viral tweet giving people permission related to {{topic}}.

Structure:
- "It''s okay to..." opener
- Normalize something people feel guilty about
- Reframe it as potentially positive
- Optional: Explain why the old rules don''t apply anymore

This should feel liberating. Like finally someone said they can stop pretending.',
 'People crave permission to break social expectations. Sharing feels like spreading freedom. Creates "I needed to hear this" reactions.',
 'post', 'easy')

ON CONFLICT (title, category) DO UPDATE SET
  description = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  why_it_works = EXCLUDED.why_it_works,
  content_type = EXCLUDED.content_type,
  difficulty = EXCLUDED.difficulty;
