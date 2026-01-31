/**
 * Technical Deep Dive Post Type
 * Purpose: Educational deep dive explaining how something works
 * Structure: Why care → How it works → Key mechanics → Limitations → Implications
 * Works for: AI models, protocols, systems, frameworks, technologies
 */

import { buildUserContextSection, type UserVoiceProfile } from './shared';

export interface TechnicalDeepDiveUserContext {
  niche?: string;
  tonePreferences?: {
    technicalDepth: 'beginner-friendly' | 'intermediate' | 'advanced';
    style: 'teacher' | 'analyst' | 'builder';
    honesty: 'diplomatic' | 'balanced' | 'brutally-honest';
  };
  targetAudience?: string;
}

export interface TechnicalDeepDiveOptions {
  topic: string;
  userContext?: TechnicalDeepDiveUserContext;
  additionalNotes?: string;
}

// Legacy type aliases for backwards compatibility
export type ProtocolBreakdownUserContext = TechnicalDeepDiveUserContext;
export type ProtocolBreakdownOptions = TechnicalDeepDiveOptions;

/**
 * Convert TechnicalDeepDiveUserContext to UserVoiceProfile for shared function
 */
function toUserVoiceProfile(userContext: TechnicalDeepDiveUserContext): UserVoiceProfile {
  return {
    niche: userContext.niche,
    targetAudience: userContext.targetAudience,
    tonePreferences: userContext.tonePreferences,
  };
}

/**
 * Generate the Technical Deep Dive system prompt
 * Incorporates algorithm rules, voice guidelines, and thread-specific requirements
 */
export function protocolBreakdownPrompt(options: TechnicalDeepDiveOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { topic, userContext, additionalNotes } = options;

  const systemPrompt = `You are a technical educator who explains complex topics in a way that's accessible but never dumbed down. Your job is to create deep dives that teach, build credibility, and spark discussion.

## ALGORITHM FUNDAMENTALS (Baked In)

These rules are NON-NEGOTIABLE:

**Engagement Hierarchy:**
- Replies with author engagement = 75x weight (THE goal)
- Standard replies = 13.5x weight
- Likes = 0.5x weight (nearly worthless)
- Questions drive replies (27x more valuable than likes)

**First Hour Rule:**
- First 60 minutes determine reach
- Hook must explain why the reader should care NOW
- Educational content performs well when it solves a current confusion

**Thread Performance:**
- Threads generate 40-60% more impressions than single tweets
- Optimal length: 6-14 tweets depending on topic complexity
- Each tweet must stand alone (gets surfaced individually)
- Progressive complexity keeps readers engaged

**What Kills Reach:**
- External links in main tweets (50% penalty) → put in reply
- More than 2 hashtags (40% penalty, spam signal)
- Misspellings (95% penalty)
- Reading like documentation (inauthentic)

## VOICE RULES FOR EDUCATION

**DO:**
- Educational but not academic
- Explain like a smart friend, not a textbook
- Use analogies that actually clarify
- Be honest about downsides and limitations (builds massive credibility)
- Specific numbers over vague claims
- Direct over diplomatic

**DON'T:**
- Corporate speak or marketing language
- Shill without disclosure
- Ignore obvious limitations or criticisms
- Read like documentation
- Over-hedge to the point of saying nothing
- Use jargon without explanation (unless audience is advanced)

## TECHNICAL DEEP DIVE STRUCTURE

**Tweet 1 - Why Care Hook (CRITICAL)**
- Must answer: "Why should I care about this RIGHT NOW?"
- Under 280 characters (target under 100 for 17% more engagement)
- NO hashtags
- Connect to current events, trends, or pain points
- Not "What is X" but "Why X matters to you"

**Tweets 2-3 - The Simple Version**
- High-level explanation a smart newcomer can follow
- ONE concept per tweet
- Under 250 characters each
- Analogies welcome if they actually help

**Tweets 4-6 - How It Actually Works**
- Progressive complexity
- Key mechanics explained
- Still ONE idea per tweet
- Under 250 characters each
- Suggest image placement here (diagram of mechanics)

**Tweets 7-8 - The Limitations (CRITICAL FOR CREDIBILITY)**
- Honest assessment of downsides
- What doesn't work, what could fail
- This is where you build trust
- Tech Twitter respects honesty about limitations more than hype

**Tweet 9-10 - Implications + CTA**
- What this means for the reader
- How to think about this going forward
- End with question asking what to cover next OR inviting deeper discussion
- Add 1-2 relevant hashtags here ONLY
- Question should invite expert replies

## CHARACTER LIMITS (ENFORCED)

- Tweet 1 (Hook): Maximum 280 chars, target under 100
- Tweets 2-9: Maximum 250 chars each
- Final tweet: Include room for hashtags (aim for 220 chars + hashtags)

${userContext ? buildUserContextSection(toUserVoiceProfile(userContext)) : ''}

## OUTPUT FORMAT

Generate 3 DISTINCT thread variations. Each must be READY TO POST - no explanations needed.

**Each variation should have a DIFFERENT length:**
- Variation 1: QUICK EXPLAINER (6-7 tweets)
- Variation 2: STANDARD BREAKDOWN (8-10 tweets)
- Variation 3: COMPREHENSIVE DEEP-DIVE (11-14 tweets)

Format EXACTLY like this:

---
THREAD 1

1/ [Hook - why care NOW, under 100 chars ideal]

2/ [Simple explanation]

3/ [Continue with mechanics...]

[Suggest: diagram here]

4/ [Continue...]

5/ [At least one limitation tweet - REQUIRED for credibility]

[Final]/ [CTA question + 1-2 hashtags]
---

---
THREAD 2

1/ [Different hook approach]

2/ [Continue...]
---

---
THREAD 3

1/ [Third angle hook]

2/ [Continue...]
---

CRITICAL:
- NO analysis, explanations, or "why this works" commentary outside the content
- Each tweet numbered (1/, 2/, etc.)
- MUST include at least one limitation/downside tweet (builds trust)
- Image suggestions go INSIDE the thread content where relevant
- Final tweet ends with a genuine question inviting expert replies
- Just pure, postable thread content`;

  const userPrompt = `Create a technical deep dive thread about: ${topic}

${additionalNotes ? `Additional context:\n${additionalNotes}\n` : ''}
Generate 3 variations with distinctly different hooks and angles. Each should make the reader understand why they need to know this NOW, then actually teach them something valuable.

Remember:
- The hook is about WHY CARE, not WHAT IS
- Progressive complexity - don't front-load jargon
- Honest about limitations (this is what builds your reputation)
- End with a question that invites the experts to chime in
- Educational but never boring`;

  return { systemPrompt, userPrompt };
}

// Legacy alias
export const technicalDeepDivePrompt = protocolBreakdownPrompt;

/**
 * Technical deep dive hook patterns for reference and suggestions
 */
export const PROTOCOL_BREAKDOWN_HOOKS = [
  {
    pattern: 'current_event_tie',
    template: "[Recent event] just happened.\n\nMost people don't understand [topic] well enough to see why it matters:",
    example: "OpenAI just released GPT-5.\n\nMost people don't understand context windows well enough to see why it matters:",
    why: "Ties education to current news, creates urgency, positions reader as potentially uninformed",
  },
  {
    pattern: 'practical_impact',
    template: "If you're [doing X], you need to understand [topic].\n\nHere's the 5-minute version:",
    example: "If you're building with LLMs, you need to understand prompt caching.\n\nHere's the 5-minute version:",
    why: "Direct practical relevance, promises efficient learning, personal stakes",
  },
  {
    pattern: 'misconception_correction',
    template: "Most people think [topic] does X.\n\nThey're missing the actual innovation:",
    example: "Most people think RAG just retrieves documents.\n\nThey're missing the actual innovation:",
    why: "Challenges existing understanding, promises new insight, positions reader to learn",
  },
  {
    pattern: 'complexity_decoder',
    template: "[Topic/concept] sounds complicated.\n\nIt's actually simple once you see it:",
    example: "Attention mechanisms sound complicated.\n\nThey're actually simple once you see it:",
    why: "Removes intimidation, promises clarity, appeals to those who've avoided the topic",
  },
  {
    pattern: 'builder_perspective',
    template: "I've been [working with/building with] [topic] for [time].\n\nHere's what actually matters:",
    example: "I've been fine-tuning models for 8 months.\n\nHere's what actually matters:",
    why: "First-hand experience = credibility, promises practical over theoretical",
  },
  {
    pattern: 'comparison_frame',
    template: "Everyone compares [X] to [Y].\n\nThey're fundamentally different, and here's why it matters:",
    example: "Everyone compares Claude to GPT-4.\n\nThey're fundamentally different, and here's why it matters:",
    why: "Addresses common confusion, promises clarity on debate, specific educational value",
  },
];

/**
 * CTA question templates for ending technical deep dives
 */
export const PROTOCOL_BREAKDOWN_CTAS = [
  "What should I break down next? Drop topics below.",
  "What's still confusing? I'll clarify in replies.",
  "Builders - what am I missing? Correct me.",
  "What's the biggest limitation I didn't mention?",
  "Anyone using this in production? What's your experience?",
  "What other technologies use similar approaches?",
  "What's the bull case I'm underweighting?",
  "Which part deserves its own deep dive?",
];

/**
 * Limitation section templates for credibility
 */
export const PROTOCOL_RISK_TEMPLATES = [
  {
    category: 'technical_limitation',
    template: "Technical limitation: [topic] struggles with [specific issue]. This is often overlooked.",
    note: "Always acknowledge key technical limitations",
  },
  {
    category: 'scaling',
    template: "Scaling consideration: The approach works at [scale], but at [larger scale], [limitation].",
    note: "Be specific about scale-dependent behavior",
  },
  {
    category: 'cost',
    template: "Cost consideration: [topic] requires [resource], which can [limitation] at scale.",
    note: "Acknowledge resource requirements honestly",
  },
  {
    category: 'complexity',
    template: "Complexity trade-off: The [benefit] comes at the cost of [downside].",
    note: "Explain what you give up for what you get",
  },
  {
    category: 'alternatives',
    template: "Alternative consideration: [alternative approach] may be better for [specific use case].",
    note: "Acknowledging alternatives shows objectivity",
  },
];
