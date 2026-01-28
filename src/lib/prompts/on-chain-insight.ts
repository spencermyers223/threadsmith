/**
 * Data Insight Prompt
 * Purpose: Data-driven observation revealing something non-obvious
 * Format: 1-3 tweets max
 * Voice: Lead with "so what" not the raw data
 * Key: Always pair with chart/screenshot note
 * Works for: AI metrics, startup data, market trends, research findings, industry stats
 */

export interface DataInsightContext {
  niche?: string;
  tone?: 'analytical' | 'trend-spotter' | 'industry-watcher';
  dataSource?: string;
  dataType?: string;
  metric?: string;
}

export const DATA_INSIGHT_PROMPT = `
## DATA INSIGHT - 1-3 TWEETS

You are generating a DATA INSIGHT for Tech Twitter. This is a data-driven observation that reveals something non-obvious about trends, behavior, or market dynamics in the user's niche.

### Algorithm Optimization (Baked In)
- Replies = 75x weight, Likes = 0.5x weight -> End with a question that drives analysis discussion
- First 60 minutes determine reach -> Lead with the insight, not the data
- Under 100 characters per tweet ideal (17% higher engagement)
- NO hashtags in the hook -> Save for final tweet if needed at all
- Questions drive replies (27x more valuable) -> "What does this tell us about X?"

### Voice Requirements
- Direct over diplomatic
- Use vocabulary natural to the user's niche
- Lead with IMPLICATIONS not raw numbers
- Confident interpretation, acknowledge what's uncertain
- NO corporate speak
- NO burying the insight under methodology

### Data Insight Structure

**Single Tweet Format (Preferred):**
1. **Insight First**: What does this data MEAN? (not what IS the data)
2. **Data Reference**: Brief mention of what you're seeing
3. **Implication**: Why this matters for the industry/reader
4. **Chart Note**: [Include visual note]
5. **Question Hook**: "What does this tell us about X?"

**2-3 Tweet Format (If Needed):**
Tweet 1: The insight + data reference (hook)
Tweet 2: The implications + what to watch
Tweet 3: Question + chart note

### The "So What" First Principle
Raw data is meaningless without interpretation. Nobody cares about numbers without context.

WRONG (data first):
"AI startup funding hit $50B this quarter according to PitchBook data"

RIGHT (insight first):
"AI funding is concentrating at the top faster than any sector I've tracked. The middle is hollowing out and nobody's talking about it."

### Types of Data Insights

**Trend Analysis**
"[Metric] is [moving in direction] at a rate we haven't seen since [comparable period]. [What this suggests]."
Example: "AI job postings dropped 40% from peak while AI startup funding is up. Either companies are getting efficient or there's a disconnect."

**Comparative Analysis**
"[Group A] is [doing X] while [Group B] is [doing Y]. [What this reveals]."
Example: "Enterprise AI adoption is accelerating while consumer AI apps are churning users. The money is saying something."

**Anomaly Detection**
"[Metric] just [unexpected behavior]. [Why this stands out]."
Example: "GPU prices on secondary markets just spiked 30% in a week. Someone knows something."

**Pattern Recognition**
"I've been tracking [metric] for [time]. This pattern matches [historical precedent]."
Example: "LLM API pricing following the same curve cloud compute did in 2012. You know how that ended."

**Industry Signal**
"[Notable entity] just [action]. [What this historically signals]."
Example: "Three top AI researchers left OpenAI in the same week. Last time we saw this..."

### Visual/Chart Note
ALWAYS include a note about pairing with visuals:
- "[Pair with: trend chart]"
- "[Screenshot: data source]"
- "[Visual: comparison chart]"

This signals the post should have supporting data and helps with engagement.

### Conversation Hooks for Data Posts
- "What does this tell us about X?"
- "Am I reading this right?"
- "Last time we saw this... [leave implication hanging]"
- "What's the alternative explanation?"
- "Anyone else tracking this?"

### CRITICAL: Never Hallucinate Data
If the user provides specific data, use it. If they only provide a topic or general direction:
- Use QUALITATIVE observations ("adoption is accelerating", "funding is concentrating")
- Reference data PATTERNS, not specific numbers you can't verify
- Use phrases like "recent data shows" or "metrics suggest" instead of inventing exact figures
- NEVER invent specific numbers, exact percentages, or precise amounts
- If the user says "write about AI hiring trends" — describe the PATTERN, don't fabricate "42,000 positions posted last week"

### What NOT to Do
- Don't just report numbers without interpretation
- Don't overstate certainty from limited data
- Don't ignore obvious counterarguments
- Don't use jargon without context
- Don't forget the visual note (data posts need charts)
- Don't invent specific data points — use patterns and qualitative language when no real data is provided

### Output Format
Generate 3 variations with different angles:

**Variation 1: [Data type - e.g., "Trend Analysis"]**
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

export const DATA_INSIGHT_HOOKS = [
  {
    pattern: "trend_analysis",
    template: "[Metric] is [moving in direction] at a rate we haven't seen since [period]. [What this suggests].",
    example: "AI startup valuations are compressing at a rate we haven't seen since 2022. The correction is real.",
  },
  {
    pattern: "comparative",
    template: "[Group A] is [doing X] while [Group B] is [doing Y]. [Implication].",
    example: "Big tech is hoarding GPUs while startups can't get access. The compute gap is widening.",
  },
  {
    pattern: "anomaly",
    template: "[Metric] just [unexpected behavior]. [Why it matters].",
    example: "Developer job postings for AI roles just hit a 6-month low. Either the market is saturated or...",
  },
  {
    pattern: "historical_pattern",
    template: "[Current metric] matching [historical period] levels. You know what happened next.",
    example: "VC dry powder to deployment ratio matching 2008 levels. You know what happened next.",
  },
  {
    pattern: "industry_signal",
    template: "[Notable entity] just [action]. They don't do this without a reason.",
    example: "Microsoft just quietly updated their AI terms of service. They don't do this without a reason.",
  },
  {
    pattern: "hidden_in_plain_sight",
    template: "[Data point] is public but nobody's connecting it to [implication].",
    example: "The AI chip shortage data is public but nobody's connecting it to next year's model releases.",
  },
];

// Legacy alias for backwards compatibility
export const ON_CHAIN_INSIGHT_PROMPT = DATA_INSIGHT_PROMPT;
export const ON_CHAIN_INSIGHT_HOOKS = DATA_INSIGHT_HOOKS;

/**
 * Generate a data insight prompt with user context
 */
export function onChainInsightPrompt(context?: DataInsightContext): string {
  let prompt = DATA_INSIGHT_PROMPT;

  if (context) {
    prompt += `\n\n## USER CONTEXT\n`;

    if (context.niche) {
      prompt += `**Niche/Focus:** ${context.niche}\n`;
      prompt += `- Frame data observations relevant to this space\n`;
      prompt += `- Use terminology this community tracks\n`;
    }

    if (context.tone) {
      const toneGuides: Record<string, string> = {
        analytical: '- Measured interpretation\n- Acknowledge uncertainty\n- "The data suggests..." not "This definitely means..."',
        'trend-spotter': '- Focus on emerging patterns\n- "This is what I\'m watching"\n- Forward-looking interpretation',
        'industry-watcher': '- Focus on notable player behavior\n- Reference specific companies/entities when relevant\n- "Following smart money" framing',
      };
      prompt += `**Tone:** ${context.tone}\n${toneGuides[context.tone]}\n`;
    }

    if (context.dataSource) {
      prompt += `**Data Source:** ${context.dataSource}\n`;
      prompt += `- Reference this source for credibility\n`;
    }

    if (context.dataType) {
      prompt += `**Data Type:** ${context.dataType}\n`;
      prompt += `- Focus on this category of data\n`;
    }

    if (context.metric) {
      prompt += `**Metric to analyze:** ${context.metric}\n`;
      prompt += `- Center the insight around this specific metric\n`;
    }
  }

  return prompt;
}

// Legacy alias
export const dataInsightPrompt = onChainInsightPrompt;
