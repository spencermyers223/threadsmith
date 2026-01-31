/**
 * Industry Take Prompt
 * Purpose: Quick opinion on industry trends, news, or developments
 * Format: Single tweet, under 100 chars ideal
 * Voice: Strong opinion, zero hedging, authentic voice
 */

export interface IndustryTakeContext {
  niche?: string;
  tone?: 'aggressive' | 'measured' | 'contrarian';
  topic?: string;
  timeframe?: 'short-term' | 'medium-term' | 'long-term';
}

// Legacy type alias
export type MarketTakeContext = IndustryTakeContext;

export const INDUSTRY_TAKE_PROMPT = `
## INDUSTRY TAKE - SINGLE TWEET

You are generating an INDUSTRY TAKE for Tech Twitter. This is a quick, opinionated read on news, trends, or developments in the user's niche.

### Algorithm Optimization (Baked In)
- Replies = 75x weight, Likes = 0.5x weight -> OPTIMIZE FOR CONVERSATION
- First 60 minutes determine reach -> Hook must stop the scroll
- Under 100 characters = 17% higher engagement -> Be concise
- NO hashtags in the hook -> Save for reply if needed at all
- Questions drive replies (27x more valuable than likes) -> End with implied or explicit question

### Voice Requirements
- Direct over diplomatic - NO hedging language
- Use vocabulary natural to the user's niche
- Confident but not arrogant
- Concise over comprehensive
- NO corporate speak ("leveraging synergies")
- NO over-hedging ("this might potentially possibly...")

### Industry Take Structure
1. **Clear Position**: State your stance directly
2. **Specific Reasoning**: One concrete reason, not vague vibes
3. **Conversation Hook**: Implied or explicit question to drive replies

### Length Rules
- IDEAL: Under 100 characters (17% higher engagement)
- MAXIMUM: 150 characters
- Every word must earn its place

### Voice Examples

WRONG (hedging, corporate):
"AI adoption might potentially face some challenges if regulatory conditions change"

RIGHT (direct):
"Enterprise AI adoption is stalling. The ROI isn't there yet and execs are noticing."

WRONG (vague, no stance):
"The industry could go either way from here depending on various factors"

RIGHT (clear position):
"Open source is eating commercial AI. First time I've felt this confident about it."

### Conversation Hooks That Work
- "What are you seeing?" (invites their analysis)
- State something slightly wrong on purpose (people love to correct)
- Leave an obvious gap ("The one thing that changes my mind...")
- End with your position as a question ("Am I early or am I wrong?")

### What NOT to Do
- Don't predict without reasoning
- Don't flip-flop from previous takes (the internet has receipts)
- Don't use hype language without substance
- Don't explain obvious things
- Don't hedge everything into meaninglessness

### Output Format
Generate 3 variations. Each must be READY TO POST - no explanation needed.

---
1
[Tweet - just the content, nothing else]
---

---
2
[Tweet - different angle]
---

---
3
[Tweet - third angle]
---

CRITICAL:
- Under 100 characters ideal, 150 max
- NO explanations or metadata
- NO character counts in the output
- Just pure, postable content between the --- markers
`;

// Legacy alias
export const MARKET_TAKE_PROMPT = INDUSTRY_TAKE_PROMPT;

export const INDUSTRY_TAKE_HOOKS = [
  {
    pattern: "clear_position",
    template: "[Topic] is [looking strong/struggling]. [One-line reasoning].",
    example: "AI agent hype is peaking. Real adoption is still 18 months out minimum.",
  },
  {
    pattern: "reversal_signal",
    template: "[Development]. First time I've been [bullish/bearish] on [topic] in [timeframe].",
    example: "Microsoft's new API pricing. First time I've been bullish on their AI strategy in years.",
  },
  {
    pattern: "contrarian_call",
    template: "Everyone's [bearish/bullish] on [topic] but [specific observation].",
    example: "Everyone's bearish on VR but enterprise adoption numbers tell a different story.",
  },
  {
    pattern: "news_read",
    template: "[News event] and nobody's talking about what this really means.",
    example: "Google just open-sourced Gemma and nobody's talking about what this really means.",
  },
  {
    pattern: "sentiment_check",
    template: "Industry sentiment on [topic] at [extreme]. You know what happens next.",
    example: "Industry sentiment on AI startups at max hype. You know what happens next.",
  },
  {
    pattern: "position_check",
    template: "[Taking position] on [topic]. Am I early or am I wrong?",
    example: "Betting big on local-first AI. Am I early or am I wrong?",
  },
];

// Legacy alias
export const MARKET_TAKE_HOOKS = INDUSTRY_TAKE_HOOKS;

/**
 * Generate an industry take prompt with user context
 */
export function marketTakePrompt(context?: IndustryTakeContext): string {
  let prompt = INDUSTRY_TAKE_PROMPT;

  if (context) {
    prompt += `\n\n## USER CONTEXT\n`;

    if (context.niche) {
      prompt += `**Niche/Focus:** ${context.niche}\n`;
      prompt += `- Keep the take relevant to this space\n`;
      prompt += `- Use terminology this community understands\n`;
    }

    if (context.tone) {
      const toneGuides: Record<string, string> = {
        aggressive: '- Be direct, punchy, no qualifications\n- "This is happening" not "This might happen"',
        measured: '- Confident but acknowledge uncertainty\n- Show your reasoning clearly',
        contrarian: '- Go against current consensus\n- But have specific reasoning why',
      };
      prompt += `**Tone:** ${context.tone}\n${toneGuides[context.tone]}\n`;
    }

    if (context.topic) {
      prompt += `**Topic Focus:** ${context.topic}\n`;
      prompt += `- Center the take on this topic\n`;
    }

    if (context.timeframe) {
      const timeframeGuides: Record<string, string> = {
        'short-term': '- Focus on immediate developments (days to weeks)',
        'medium-term': '- Focus on trend changes and shifts (weeks to months)',
        'long-term': '- Focus on macro trends and industry direction (months to years)',
      };
      prompt += `**Timeframe:** ${context.timeframe}\n${timeframeGuides[context.timeframe]}\n`;
    }
  }

  return prompt;
}

// Legacy alias
export const industryTakePrompt = marketTakePrompt;
