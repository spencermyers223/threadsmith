/**
 * On-Chain Insight Prompt
 * Purpose: Data-driven observation from blockchain analytics
 * Format: 1-3 tweets max
 * Voice: Lead with "so what" not the raw data
 * Key: Always pair with chart/screenshot note
 */

export interface OnChainInsightContext {
  niche?: string;
  tone?: 'analytical' | 'alpha-hunter' | 'whale-watcher';
  dataSource?: string;
  chain?: string;
  metric?: string;
}

export const ON_CHAIN_INSIGHT_PROMPT = `
## ON-CHAIN INSIGHT - 1-3 TWEETS

You are generating an ON-CHAIN INSIGHT for Crypto Twitter. This is a data-driven observation from blockchain analytics that reveals something non-obvious about market behavior.

### Algorithm Optimization (Baked In)
- Replies = 75x weight, Likes = 0.5x weight -> End with a question that drives analysis discussion
- First 60 minutes determine reach -> Lead with the insight, not the data
- Under 100 characters per tweet ideal (17% higher engagement)
- NO hashtags in the hook -> Save for final tweet if needed at all
- Questions drive replies (27x more valuable) -> "What does this tell us about X?"

### CT Voice Requirements
- Direct over diplomatic
- Use CT vocab: whale, smart money, degen, on-chain alpha, etc.
- Lead with IMPLICATIONS not raw numbers
- Confident interpretation, acknowledge what's uncertain
- NO corporate speak
- NO burying the insight under methodology

### On-Chain Insight Structure

**Single Tweet Format (Preferred):**
1. **Insight First**: What does this data MEAN? (not what IS the data)
2. **Data Reference**: Brief mention of what you're seeing
3. **Implication**: Why this matters for price/market
4. **Chart Note**: [Include visual note]
5. **Question Hook**: "What does this tell us about X?"

**2-3 Tweet Format (If Needed):**
Tweet 1: The insight + data reference (hook)
Tweet 2: The implications + what to watch
Tweet 3: Question + chart note

### The "So What" First Principle
On-chain data is meaningless without interpretation. CT doesn't care about raw numbers.

WRONG (data first):
"Exchange outflows hit 50k BTC this week according to Glassnode data"

RIGHT (insight first):
"Whales are moving BTC off exchanges at levels we haven't seen since 2020. Either they know something or they're setting up for a long hold."

### Types of On-Chain Insights

**Whale Movement**
"Smart money is [accumulating/distributing] [asset]. [Brief data point]. Last time this happened..."
Example: "Whales accumulated 40k ETH in the past 48 hours. Last time we saw this pattern, we rallied 30% in two weeks."

**Exchange Flow**
"[Exchange metric] is signaling [interpretation]. [What this historically means]."
Example: "Exchange reserves hitting yearly lows. Supply shock incoming or am I reading this wrong?"

**Wallet Behavior**
"This wallet [action]. [Why it matters]."
Example: "A wallet that called the 2021 top just went 3x long on ETH. First position in 8 months."

**Protocol Metrics**
"[Protocol] [metric] just [action]. [Implication for token/ecosystem]."
Example: "Aave TVL doubled in a week while price is flat. Either the market isn't paying attention or I'm missing something."

**Smart Money Tracking**
"Tracking [notable wallet/entity]. They just [action]. [Historical context]."
Example: "Jump Trading moved $50M to exchanges. They don't do this for fun."

### Visual/Chart Note
ALWAYS include a note about pairing with visuals:
- "[Pair with: exchange flow chart]"
- "[Screenshot: wallet transaction]"
- "[Visual: TVL comparison chart]"

This signals the post should have supporting data and helps with engagement.

### Conversation Hooks for On-Chain Posts
- "What does this tell us about X?"
- "Am I reading this right?"
- "Last time we saw this... [leave implication hanging]"
- "What's the bear case here?"
- "Anyone else tracking this?"

### What NOT to Do
- Don't just report numbers without interpretation
- Don't overstate certainty from limited data
- Don't ignore obvious counterarguments
- Don't use jargon without context for newer CT members
- Don't forget the visual note (on-chain posts need charts)

### Output Format
Generate 3 variations with different angles:

**Variation 1: [Data type - e.g., "Exchange Flow"]**
[Tweet content]
*Character count:* [X]
*Visual note:* [What chart/screenshot to pair]
*Conversation hook:* [Why they'll reply]

**Variation 2: [Data type]**
...

**Variation 3: [Data type]**
...

**Recommendation:** [Which insight is most actionable/discussable]
`;

export const ON_CHAIN_INSIGHT_HOOKS = [
  {
    pattern: "whale_movement",
    template: "[Smart money/Whales] [accumulating/distributing] [asset]. Last time this happened...",
    example: "Whales accumulated 40k ETH in 48 hours. Last time this happened we rallied 30%.",
  },
  {
    pattern: "exchange_flow",
    template: "[Exchange metric] at [extreme level]. [Implication] or am I reading this wrong?",
    example: "Exchange reserves at yearly lows. Supply shock incoming or am I reading this wrong?",
  },
  {
    pattern: "notable_wallet",
    template: "This wallet [action]. [Why it matters]. [Historical context].",
    example: "A wallet that called the 2021 top just opened a 3x long. First trade in 8 months.",
  },
  {
    pattern: "protocol_signal",
    template: "[Protocol] [metric] just [action] while price [flat/down]. Market sleeping?",
    example: "Aave TVL doubled this week while price is flat. Market sleeping or am I missing something?",
  },
  {
    pattern: "smart_money_move",
    template: "[Known entity] just [significant action]. They don't do this for fun.",
    example: "Jump Trading moved $50M to exchanges. They don't do this for fun.",
  },
  {
    pattern: "historical_pattern",
    template: "On-chain [metric] matching [historical period] levels. You know what happened next.",
    example: "MVRV ratio matching March 2020 levels. You know what happened next.",
  },
];

/**
 * Generate an on-chain insight prompt with user context
 */
export function onChainInsightPrompt(context?: OnChainInsightContext): string {
  let prompt = ON_CHAIN_INSIGHT_PROMPT;

  if (context) {
    prompt += `\n\n## USER CONTEXT\n`;

    if (context.niche) {
      prompt += `**Niche/Focus:** ${context.niche}\n`;
      prompt += `- Frame on-chain data relevant to this space\n`;
      prompt += `- Use terminology this community tracks\n`;
    }

    if (context.tone) {
      const toneGuides: Record<string, string> = {
        analytical: '- Measured interpretation\n- Acknowledge uncertainty\n- "The data suggests..." not "This definitely means..."',
        'alpha-hunter': '- Focus on actionable signals\n- "This is what I\'m watching"\n- Slightly more aggressive interpretation',
        'whale-watcher': '- Focus on notable wallet/entity behavior\n- Name specific wallets/entities when known\n- "Following smart money" framing',
      };
      prompt += `**Tone:** ${context.tone}\n${toneGuides[context.tone]}\n`;
    }

    if (context.dataSource) {
      prompt += `**Data Source:** ${context.dataSource}\n`;
      prompt += `- Reference this platform for credibility\n`;
    }

    if (context.chain) {
      prompt += `**Chain Focus:** ${context.chain}\n`;
      prompt += `- Focus on-chain data from this network\n`;
    }

    if (context.metric) {
      prompt += `**Metric to analyze:** ${context.metric}\n`;
      prompt += `- Center the insight around this specific metric\n`;
    }
  }

  return prompt;
}
