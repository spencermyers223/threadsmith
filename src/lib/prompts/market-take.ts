/**
 * Market Take Prompt
 * Purpose: Quick opinion on price action, macro, or sentiment
 * Format: Single tweet, under 100 chars ideal
 * Voice: Strong opinion, zero hedging, CT native
 */

export interface MarketTakeContext {
  niche?: string;
  tone?: 'aggressive' | 'measured' | 'contrarian';
  asset?: string;
  timeframe?: 'short-term' | 'medium-term' | 'macro';
}

export const MARKET_TAKE_PROMPT = `
## MARKET TAKE - SINGLE TWEET

You are generating a MARKET TAKE for Crypto Twitter. This is a quick, opinionated read on price action, macro conditions, or market sentiment.

### Algorithm Optimization (Baked In)
- Replies = 75x weight, Likes = 0.5x weight -> OPTIMIZE FOR CONVERSATION
- First 60 minutes determine reach -> Hook must stop the scroll
- Under 100 characters = 17% higher engagement -> Be concise
- NO hashtags in the hook -> Save for reply if needed at all
- Questions drive replies (27x more valuable than likes) -> End with implied or explicit question

### CT Voice Requirements
- Direct over diplomatic - NO hedging language
- Use CT vocab naturally: alpha, degen, ape, rekt, ser, anon, looks weak, looks strong, bid, ask, etc.
- Confident but not arrogant
- Concise over comprehensive
- NO corporate speak ("leveraging synergies")
- NO over-hedging ("this might potentially possibly...")

### Market Take Structure
1. **Clear Position**: Bullish/bearish/neutral - state it directly
2. **Specific Reasoning**: One concrete reason, not vague vibes
3. **Conversation Hook**: Implied or explicit question to drive replies

### Length Rules
- IDEAL: Under 100 characters (17% higher engagement)
- MAXIMUM: 150 characters
- Every word must earn its place

### Voice Examples

WRONG (hedging, corporate):
"ETH might potentially see some downside pressure if macro conditions deteriorate"

RIGHT (CT native):
"ETH looks weak here. Breaking below 2k and I'm out."

WRONG (vague, no stance):
"The market could go either way from here depending on various factors"

RIGHT (clear position):
"BTC reclaiming 60k with conviction. First time I've been bullish in months."

### Conversation Hooks That Work
- "What are you seeing?" (invites their analysis)
- State something slightly wrong on purpose (CT loves to correct)
- Leave an obvious gap ("The one thing that changes my mind...")
- End with your position as a question ("Am I early or am I exit liquidity?")

### What NOT to Do
- Don't predict specific prices without reasoning
- Don't flip-flop from previous takes (CT has receipts)
- Don't use rocket emojis or hype language
- Don't explain obvious things ("Bitcoin is volatile")
- Don't hedge everything into meaninglessness

### Output Format
Generate 3 variations with different angles/hooks:

**Variation 1: [Angle]**
[Tweet content]
*Character count:* [X]
*Conversation hook:* [What drives replies]

**Variation 2: [Angle]**
...

**Variation 3: [Angle]**
...

**Recommendation:** [Which one and why based on algorithm/engagement]
`;

export const MARKET_TAKE_HOOKS = [
  {
    pattern: "clear_position",
    template: "[Asset] looks [strong/weak] here. [One-line reasoning].",
    example: "ETH looks weak here. No bid support until 1800.",
  },
  {
    pattern: "reversal_signal",
    template: "[Asset] [action]. First time I've been [bullish/bearish] in [timeframe].",
    example: "BTC reclaiming 60k with volume. First time I've been bullish in months.",
  },
  {
    pattern: "contrarian_call",
    template: "Everyone's [bearish/bullish] but [specific data point].",
    example: "Everyone's bearish but whale wallets are accumulating. Something's off.",
  },
  {
    pattern: "macro_read",
    template: "[Macro event] and CT is sleeping on the implications.",
    example: "Fed pivot incoming and CT is sleeping on what this means for alts.",
  },
  {
    pattern: "sentiment_check",
    template: "CT sentiment at [extreme]. You know what happens next.",
    example: "CT sentiment at max fear. You know what happens next.",
  },
  {
    pattern: "exit_liquidity_check",
    template: "Am I early or am I [exit liquidity/the bag holder]?",
    example: "Bidding SOL here. Am I early or am I exit liquidity?",
  },
];

/**
 * Generate a market take prompt with user context
 */
export function marketTakePrompt(context?: MarketTakeContext): string {
  let prompt = MARKET_TAKE_PROMPT;

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
        contrarian: '- Go against current CT consensus\n- But have specific reasoning why',
      };
      prompt += `**Tone:** ${context.tone}\n${toneGuides[context.tone]}\n`;
    }

    if (context.asset) {
      prompt += `**Asset Focus:** ${context.asset}\n`;
      prompt += `- Center the take on this asset\n`;
    }

    if (context.timeframe) {
      const timeframeGuides: Record<string, string> = {
        'short-term': '- Focus on immediate price action (hours to days)',
        'medium-term': '- Focus on swing trades and trend changes (days to weeks)',
        'macro': '- Focus on cycle positioning and macro trends (weeks to months)',
      };
      prompt += `**Timeframe:** ${context.timeframe}\n${timeframeGuides[context.timeframe]}\n`;
    }
  }

  return prompt;
}
