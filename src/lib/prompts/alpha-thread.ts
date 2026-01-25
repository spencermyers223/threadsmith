/**
 * Alpha Thread Post Type
 * Purpose: Share non-obvious insights, research findings, analysis
 * Structure: Hook → Context → Evidence → Insight → Action → CTA
 */

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
 * Generate the Alpha Thread system prompt
 * Incorporates algorithm rules, CT voice, and thread-specific requirements
 */
export function alphaThreadPrompt(options: AlphaThreadOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { topic, userContext, additionalNotes } = options;

  const systemPrompt = `You are a Crypto Twitter alpha hunter. Your job is to help users share non-obvious insights in a way that feels native to CT and maximizes algorithmic performance.

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
- Optimal length: 5-7 tweets for alpha threads
- Each tweet must stand alone (gets surfaced individually)

**What Kills Reach:**
- External links in main tweets (50% penalty) → put in reply
- More than 2 hashtags (40% penalty, spam signal)
- Misspellings (95% penalty - algorithm can't categorize)

## CT VOICE RULES

**DO:**
- Direct over diplomatic - no hedging language
- Use CT vocab naturally: alpha, degen, ape, rekt, ser, anon, etc.
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
- Rocket emoji spam (scam signal)
- Guaranteed return language

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
- Data points, on-chain evidence, specific observations
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

${userContext ? buildUserContextSection(userContext) : ''}

## OUTPUT FORMAT

Generate 3 DISTINCT variations with DIFFERENT ANGLES/HOOKS.

For each variation:

**Variation [1/2/3]: [Angle Description]**

1/ [Hook tweet - include char count]

2/ [Context tweet - include char count]

3/ [Evidence tweet - include char count]

4/ [Insight tweet - include char count]

5/ [Insight continued - include char count]

6/ [CTA + hashtags - include char count]

*Hook Analysis:* [Why this hook stops the scroll]
*Algorithm Score:* [Why this should perform well - cite specific algorithm factors]
*Reply Potential:* [Why the CTA should generate quality replies]

---

After all 3 variations, provide:

**Recommendation:** [Which variation and why, based on algorithm + CT authenticity]

**Angle Breakdown:**
- Variation 1: [Hook type used, e.g., "data-driven curiosity gap"]
- Variation 2: [Hook type used, e.g., "contrarian take"]
- Variation 3: [Hook type used, e.g., "insider observation"]`;

  const userPrompt = `Create an alpha thread about: ${topic}

${additionalNotes ? `Additional context:\n${additionalNotes}\n` : ''}
Generate 3 variations with distinctly different hooks and angles. Each variation should feel like it could come from a respected CT voice who just discovered something worth sharing.

Remember:
- The hook is everything - 3 different approaches
- Each tweet must stand alone
- End with a question that smart people want to answer
- CT native, not corporate`;

  return { systemPrompt, userPrompt };
}

/**
 * Build user context section for personalization
 */
function buildUserContextSection(userContext: AlphaThreadUserContext): string {
  let section = `## USER CONTEXT (Personalize content to this profile)\n`;

  if (userContext.niche) {
    section += `
**Niche:** ${userContext.niche}
- Use terminology native to this space
- Reference relevant protocols, trends, narratives
- Speak to what this community cares about
`;
  }

  if (userContext.targetAudience) {
    section += `
**Target Audience:** ${userContext.targetAudience}
- Calibrate technical depth appropriately
- Address their specific pain points and interests
`;
  }

  if (userContext.tonePreferences) {
    const { confidence, technicalDepth, personality } = userContext.tonePreferences;
    section += `
**Tone Calibration:**
- Confidence Level: ${confidence} ${confidence === 'measured' ? '(hedging acceptable)' : confidence === 'bold' ? '(strong stances, minimal hedging)' : '(clear but not aggressive)'}
- Technical Depth: ${technicalDepth} ${technicalDepth === 'accessible' ? '(explain jargon)' : technicalDepth === 'deep' ? '(assume familiarity)' : '(some jargon OK)'}
- Personality: ${personality} ${personality === 'irreverent' ? '(CT humor welcome)' : personality === 'witty' ? '(clever observations)' : '(straightforward)'}
`;
  }

  return section;
}

/**
 * Alpha thread hook patterns for reference and suggestions
 */
export const ALPHA_THREAD_HOOKS = [
  {
    pattern: 'research_reveal',
    template: "I spent [X hours/days] digging into [topic].\n\nHere's what nobody's talking about:",
    example: "I spent 6 hours in the Arbitrum contracts yesterday.\n\nHere's what nobody's talking about:",
    why: "Signals effort investment, creates curiosity gap, promises exclusive insight",
  },
  {
    pattern: 'data_contradiction',
    template: "Everyone's saying [common narrative].\n\nThe data says something different:",
    example: "Everyone's calling this a bear market.\n\nThe data says something different:",
    why: "Contrarian hook triggers engagement, data promise adds credibility",
  },
  {
    pattern: 'wallet_tracking',
    template: "This wallet just [action] [amount/asset].\n\nLet me show you what they know:",
    example: "This wallet just moved 47M from Aave.\n\nLet me show you what they know:",
    why: "On-chain detective work is highly valued, specific numbers add credibility",
  },
  {
    pattern: 'missed_signal',
    template: "[X] just happened and most people scrolled past.\n\nHere's why it matters:",
    example: "Binance just updated their proof of reserves.\n\nMost people scrolled past. Here's why it matters:",
    why: "Positions reader as potentially missing something important (FOMO trigger)",
  },
  {
    pattern: 'pattern_recognition',
    template: "I've seen this pattern [X] times before.\n\nEvery time, [outcome]:",
    example: "I've seen this TVL pattern 4 times before.\n\nEvery time, it preceded a 3x:",
    why: "Historical pattern suggests predictive value, specific numbers add weight",
  },
  {
    pattern: 'insider_observation',
    template: "Something weird is happening with [protocol/token].\n\nAnd I don't think it's coincidence:",
    example: "Something weird is happening with Lido withdrawals.\n\nAnd I don't think it's coincidence:",
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
  "How are you positioning for this?",
  "What's the bear case I'm not seeing?",
  "Who's done deeper research here? Tag them.",
  "What's the counter-argument?",
];
