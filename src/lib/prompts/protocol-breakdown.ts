/**
 * Protocol Breakdown Post Type
 * Purpose: Educational deep dive explaining how something works
 * Structure: Why care → How it works → Key mechanics → Risks → Implications
 */

import { buildUserContextSection, type UserVoiceProfile } from './shared';

export interface ProtocolBreakdownUserContext {
  niche?: string;
  tonePreferences?: {
    technicalDepth: 'beginner-friendly' | 'intermediate' | 'advanced';
    style: 'teacher' | 'analyst' | 'builder';
    honesty: 'diplomatic' | 'balanced' | 'brutally-honest';
  };
  targetAudience?: string;
}

export interface ProtocolBreakdownOptions {
  topic: string;
  userContext?: ProtocolBreakdownUserContext;
  additionalNotes?: string;
}

/**
 * Convert ProtocolBreakdownUserContext to UserVoiceProfile for shared function
 */
function toUserVoiceProfile(userContext: ProtocolBreakdownUserContext): UserVoiceProfile {
  return {
    niche: userContext.niche,
    targetAudience: userContext.targetAudience,
    tonePreferences: userContext.tonePreferences,
  };
}

/**
 * Generate the Protocol Breakdown system prompt
 * Incorporates algorithm rules, CT voice, and thread-specific requirements
 */
export function protocolBreakdownPrompt(options: ProtocolBreakdownOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { topic, userContext, additionalNotes } = options;

  const systemPrompt = `You are a crypto educator who explains complex protocols in a way that's accessible but never dumbed down. Your job is to create protocol breakdowns that teach, build credibility, and spark discussion.

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
- Optimal length: 5-10 tweets for protocol breakdowns
- Each tweet must stand alone (gets surfaced individually)
- Progressive complexity keeps readers engaged

**What Kills Reach:**
- External links in main tweets (50% penalty) → put in reply
- More than 2 hashtags (40% penalty, spam signal)
- Misspellings (95% penalty)
- Reading like project documentation (inauthentic)

## CT VOICE RULES FOR EDUCATION

**DO:**
- Educational but not academic
- Explain like a smart friend, not a textbook
- Use analogies that actually clarify
- Be honest about downsides and risks (builds massive credibility)
- Specific numbers over vague claims
- Direct over diplomatic

**DON'T:**
- Corporate speak or marketing language
- Shill without disclosure
- Ignore obvious risks or criticisms
- Read like project documentation
- Over-hedge to the point of saying nothing
- Use jargon without explanation (unless audience is advanced)

## PROTOCOL BREAKDOWN STRUCTURE

**Tweet 1 - Why Care Hook (CRITICAL)**
- Must answer: "Why should I care about this RIGHT NOW?"
- Under 280 characters (target under 100 for 17% more engagement)
- NO hashtags
- Connect to current events, trends, or pain points
- Not "What is X" but "Why X matters to your portfolio/strategy"

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

**Tweets 7-8 - The Risks (CRITICAL FOR CREDIBILITY)**
- Honest assessment of downsides
- What could go wrong
- This is where you build trust
- CT respects honesty about risks more than hype

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

Generate 3 DISTINCT variations with DIFFERENT ANGLES/HOOKS.

For each variation:

**Variation [1/2/3]: [Angle Description]**

1/ [Hook - why care NOW - include char count]

2/ [Simple explanation - include char count]

3/ [Simple explanation continued - include char count]

4/ [How it works - include char count]

5/ [Key mechanics - include char count]
[Suggest: Add diagram/image here]

6/ [Mechanics continued - include char count]

7/ [Risk #1 - include char count]

8/ [Risk #2 or more nuance - include char count]

9/ [Implications - include char count]

10/ [CTA + hashtags - include char count]

*Hook Analysis:* [Why this makes them care NOW]
*Educational Flow:* [How the complexity progresses]
*Trust Factor:* [How the risk section builds credibility]
*Reply Potential:* [Why the CTA generates quality discussion]

---

After all 3 variations, provide:

**Recommendation:** [Which variation and why]

**Angle Breakdown:**
- Variation 1: [Hook approach, e.g., "current event tie-in"]
- Variation 2: [Hook approach, e.g., "portfolio impact angle"]
- Variation 3: [Hook approach, e.g., "misconception correction"]

**Adaptation Notes:** [How to adjust length - which tweets to cut for 5-7, which to expand for 10+]`;

  const userPrompt = `Create a protocol breakdown thread about: ${topic}

${additionalNotes ? `Additional context:\n${additionalNotes}\n` : ''}
Generate 3 variations with distinctly different hooks and angles. Each should make the reader understand why they need to know this NOW, then actually teach them something valuable.

Remember:
- The hook is about WHY CARE, not WHAT IS
- Progressive complexity - don't front-load jargon
- Honest about risks (this is what builds your reputation)
- End with a question that invites the experts to chime in
- Educational but never boring`;

  return { systemPrompt, userPrompt };
}


/**
 * Protocol breakdown hook patterns for reference and suggestions
 */
export const PROTOCOL_BREAKDOWN_HOOKS = [
  {
    pattern: 'current_event_tie',
    template: "[Recent event] just happened.\n\nMost people don't understand [protocol] well enough to see why it matters:",
    example: "The SEC just sued another exchange.\n\nMost people don't understand settlement layers well enough to see why it matters:",
    why: "Ties education to current news, creates urgency, positions reader as potentially uninformed",
  },
  {
    pattern: 'portfolio_impact',
    template: "If you hold [asset/position], you need to understand [protocol].\n\nHere's the 5-minute version:",
    example: "If you hold any LSTs, you need to understand restaking risk.\n\nHere's the 5-minute version:",
    why: "Direct financial relevance, promises efficient learning, personal stakes",
  },
  {
    pattern: 'misconception_correction',
    template: "Most people think [protocol] does X.\n\nThey're missing the actual innovation:",
    example: "Most people think rollups just make things faster.\n\nThey're missing the actual innovation:",
    why: "Challenges existing understanding, promises new insight, positions reader to learn",
  },
  {
    pattern: 'complexity_decoder',
    template: "[Protocol/concept] sounds complicated.\n\nIt's actually simple once you see it:",
    example: "Intents sound complicated.\n\nThey're actually simple once you see it:",
    why: "Removes intimidation, promises clarity, appeals to those who've avoided the topic",
  },
  {
    pattern: 'builder_perspective',
    template: "I've been building on [protocol] for [time].\n\nHere's what actually matters:",
    example: "I've been building on Solana for 8 months.\n\nHere's what actually matters:",
    why: "First-hand experience = credibility, promises practical over theoretical",
  },
  {
    pattern: 'comparison_frame',
    template: "Everyone compares [X] to [Y].\n\nThey're fundamentally different, and here's why it matters:",
    example: "Everyone compares Cosmos to Polkadot.\n\nThey're fundamentally different, and here's why it matters:",
    why: "Addresses common confusion, promises clarity on debate, specific educational value",
  },
];

/**
 * CTA question templates for ending protocol breakdowns
 */
export const PROTOCOL_BREAKDOWN_CTAS = [
  "What should I break down next? Drop protocols below.",
  "What's still confusing? I'll clarify in replies.",
  "Builders - what am I missing? Correct me.",
  "What's the biggest risk I didn't mention?",
  "Anyone using this in production? What's your experience?",
  "What other protocols use similar mechanics?",
  "What's the bull case I'm underweighting?",
  "Which part deserves its own deep dive?",
];

/**
 * Risk section templates for credibility
 */
export const PROTOCOL_RISK_TEMPLATES = [
  {
    category: 'smart_contract',
    template: "Smart contract risk: [protocol] has [X] in TVL. If there's a bug, that's all at risk.",
    note: "Always acknowledge smart contract risk for DeFi protocols",
  },
  {
    category: 'centralization',
    template: "Centralization risk: [specific concern]. This is often overlooked.",
    note: "Be specific about what's centralized and why it matters",
  },
  {
    category: 'economic',
    template: "Economic risk: The model works in [condition]. In [other condition], it could [failure mode].",
    note: "Explain conditions where the economics break down",
  },
  {
    category: 'regulatory',
    template: "Regulatory risk: [protocol] could face [specific regulatory concern] in [jurisdiction].",
    note: "Be specific, not just 'regulations might happen'",
  },
  {
    category: 'competition',
    template: "Competition risk: [competitor] is building [similar thing] with [advantage].",
    note: "Acknowledging competition shows objectivity",
  },
];
