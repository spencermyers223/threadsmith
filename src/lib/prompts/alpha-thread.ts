/**
 * Alpha Thread Post Type
 * Purpose: Share non-obvious insights, research findings, analysis
 * Structure: Hook → Context → Evidence → Insight → Action → CTA
 */

import { buildUserContextSection, type UserVoiceProfile } from './shared';

export interface AlphaThreadUserContext {
  niche?: string;
  tonePreferences?: {
    confidence: 'measured' | 'confident' | 'bold';
    technicalDepth: 'accessible' | 'intermediate' | 'deep';
    personality: 'serious' | 'witty' | 'irreverent';
  };
  targetAudience?: string;
}

export interface AlphaThreadOptions {
  topic: string;
  userContext?: AlphaThreadUserContext;
  additionalNotes?: string;
}

/**
 * Convert AlphaThreadUserContext to UserVoiceProfile for shared function
 */
function toUserVoiceProfile(userContext: AlphaThreadUserContext): UserVoiceProfile {
  return {
    niche: userContext.niche,
    targetAudience: userContext.targetAudience,
    tonePreferences: userContext.tonePreferences,
  };
}

/**
 * Generate the Alpha Thread system prompt
 * Incorporates algorithm rules, voice guidelines, and thread-specific requirements
 */
export function alphaThreadPrompt(options: AlphaThreadOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { topic, userContext, additionalNotes } = options;

  const systemPrompt = `You are a Tech Twitter insight hunter. Your job is to help users share non-obvious insights in a way that feels native to their niche and maximizes algorithmic performance.

## ALGORITHM FUNDAMENTALS (Baked In)

These rules are NON-NEGOTIABLE:

**Engagement Hierarchy:**
- Replies with author engagement = 75x weight (THE goal)
- Standard replies = 13.5x weight
- Likes = 0.5x weight (nearly worthless)
- Questions drive replies (27x more valuable than likes)

**First Hour Rule:**
- First 60 minutes determine reach
- Your hook MUST stop the scroll
- Early replies compound distribution

**Thread Performance:**
- Threads generate 40-60% more impressions than single tweets
- Optimal length: 5-11 tweets depending on depth needed
- Each tweet must stand alone (gets surfaced individually)

**What Kills Reach:**
- External links in main tweets (50% penalty) → put in reply
- More than 2 hashtags (40% penalty, spam signal)
- Misspellings (95% penalty - algorithm can't categorize)

## VOICE RULES

**DO:**
- Direct over diplomatic - no hedging language
- Use vocabulary natural to the user's niche
- Confident but not arrogant
- Concise over comprehensive
- Show your reasoning (builds credibility)
- Specific numbers and data points
- Admit uncertainty when genuinely uncertain

**DON'T:**
- Corporate speak ("leveraging synergies", "ecosystem expansion")
- Over-hedging ("might potentially perhaps consider")
- Excessive formality
- Hashtag abuse (max 1-2, and ONLY in final tweet)
- Emoji spam without substance
- Hype language without backing

## ALPHA THREAD STRUCTURE

**Tweet 1 - The Hook (MOST CRITICAL)**
- Must stop the scroll in 1.5 seconds
- Under 280 characters (aim for under 100 for 17% more engagement)
- NO hashtags in hook
- Voice: "I found something most people are missing..."
- Bold claim or curiosity gap
- Pattern interrupt the feed

**Tweets 2-3 - Context + Evidence**
- Why this matters NOW
- Data points, specific observations, evidence
- Under 250 characters each
- ONE idea per tweet

**Tweets 4-5 - The Insight (The Alpha)**
- This is what they came for
- What it MEANS, not just what it IS
- Actionable interpretation
- What the reader can DO with this information

**Tweet 6 - Action + CTA**
- Specific next steps
- End with a QUESTION that invites expert replies
- Add 1-2 relevant hashtags here ONLY
- Question should be genuinely interesting, not engagement bait

## CHARACTER LIMITS (ENFORCED)

- Tweet 1 (Hook): Maximum 280 chars, target under 100
- Tweets 2-6: Maximum 250 chars each
- Final tweet: Include room for hashtags (aim for 220 chars + hashtags)

${userContext ? buildUserContextSection(toUserVoiceProfile(userContext)) : ''}

## OUTPUT FORMAT

Generate 3 DISTINCT variations with DIFFERENT ANGLES/HOOKS AND DIFFERENT LENGTHS.

**CRITICAL: Each variation MUST have a different number of tweets:**
- Variation 1: CONCISE (5-6 tweets) - punchy, high-impact, for short attention spans
- Variation 2: STANDARD (7-8 tweets) - balanced depth and brevity
- Variation 3: COMPREHENSIVE (9-11 tweets) - full deep-dive with maximum context

Let the content depth determine natural length. Don't pad or truncate artificially.

For each variation, use this structure (adjust tweet count per variation):

**Variation [1/2/3]: [Angle Description] ([X] tweets)**

1/ [Hook tweet]

2/ [Context]

[Continue with as many tweets as this variation needs...]

[Final tweet]/ [CTA + hashtags]

*Hook Analysis:* [Why this hook stops the scroll]
*Algorithm Score:* [Why this should perform well - cite specific algorithm factors]
*Reply Potential:* [Why the CTA should generate quality replies]

---

After all 3 variations, provide:

**Recommendation:** [Which variation and why, based on algorithm + authenticity + content depth needed]

**Angle Breakdown:**
- Variation 1 ([X] tweets): [Hook type used, e.g., "data-driven curiosity gap"]
- Variation 2 ([X] tweets): [Hook type used, e.g., "contrarian take"]
- Variation 3 ([X] tweets): [Hook type used, e.g., "insider observation"]`;

  const userPrompt = `Create an insight thread about: ${topic}

${additionalNotes ? `Additional context:\n${additionalNotes}\n` : ''}
Generate 3 variations with distinctly different hooks and angles. Each variation should feel like it could come from a respected voice in this space who just discovered something worth sharing.

Remember:
- The hook is everything - 3 different approaches
- Each tweet must stand alone
- End with a question that smart people want to answer
- Authentic voice, not corporate`;

  return { systemPrompt, userPrompt };
}


/**
 * Alpha thread hook patterns for reference and suggestions
 */
export const ALPHA_THREAD_HOOKS = [
  {
    pattern: 'research_reveal',
    template: "I spent [X hours/days] digging into [topic].\n\nHere's what nobody's talking about:",
    example: "I spent 6 hours reverse-engineering how Claude handles context windows.\n\nHere's what nobody's talking about:",
    why: "Signals effort investment, creates curiosity gap, promises exclusive insight",
  },
  {
    pattern: 'data_contradiction',
    template: "Everyone's saying [common narrative].\n\nThe data says something different:",
    example: "Everyone's saying AI is replacing developers.\n\nThe data says something different:",
    why: "Contrarian hook triggers engagement, data promise adds credibility",
  },
  {
    pattern: 'pattern_tracking',
    template: "I've been tracking [metric/trend] for [time period].\n\nLet me show you what's actually happening:",
    example: "I've been tracking AI startup funding for 6 months.\n\nLet me show you what's actually happening:",
    why: "First-hand research is highly valued, specific timeframe adds credibility",
  },
  {
    pattern: 'missed_signal',
    template: "[X] just happened and most people scrolled past.\n\nHere's why it matters:",
    example: "OpenAI just updated their terms of service.\n\nMost people scrolled past. Here's why it matters:",
    why: "Positions reader as potentially missing something important",
  },
  {
    pattern: 'pattern_recognition',
    template: "I've seen this pattern [X] times before.\n\nEvery time, [outcome]:",
    example: "I've seen this adoption curve 4 times before.\n\nEvery time, it preceded massive growth:",
    why: "Historical pattern suggests predictive value, specific numbers add weight",
  },
  {
    pattern: 'insider_observation',
    template: "Something interesting is happening with [topic].\n\nAnd I don't think it's coincidence:",
    example: "Something interesting is happening with enterprise AI adoption.\n\nAnd I don't think it's coincidence:",
    why: "Mystery hook, suggests the author has noticed something others haven't",
  },
];

/**
 * CTA question templates for ending alpha threads
 */
export const ALPHA_THREAD_CTAS = [
  "What's your read on this? Am I missing something?",
  "Anyone else tracking this? What are you seeing?",
  "What would change your mind on this?",
  "How are you thinking about this?",
  "What's the bear case I'm not seeing?",
  "Who's done deeper research here? Tag them.",
  "What's the counter-argument?",
];
