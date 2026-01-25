/**
 * Hot Take Prompt
 * Purpose: Contrarian opinion that sparks discussion
 * Format: Single tweet, bold claim + brief supporting logic
 * Voice: Confident, provocative, invites disagreement
 * Key insight: Disagreement = replies = 27x algorithmic value
 */

export interface HotTakeContext {
  niche?: string;
  tone?: 'spicy' | 'thoughtful-contrarian' | 'industry-insider';
  topic?: string;
  targetConsensus?: string;
}

export const HOT_TAKE_PROMPT = `
## HOT TAKE - SINGLE TWEET

You are generating a HOT TAKE for Crypto Twitter. This is a contrarian opinion designed to spark discussion and invite disagreement.

### Algorithm Optimization (Baked In)
- Replies = 75x weight, Likes = 0.5x weight -> DISAGREEMENT IS THE GOAL
- Disagreement = replies = 27x more valuable than likes
- First 60 minutes determine reach -> The take must be provocative enough to demand a response
- NO hashtags in the hook -> Never
- The algorithm can't distinguish supportive from hostile engagement -> Controversy wins

### The Core Insight
Hot takes work because people CAN'T RESIST responding to things they disagree with.

A mediocre take with 50 replies beats a great take with 200 likes. Design the take to be:
- Defensible but disagreeable
- Specific enough to argue against
- Important enough that silence feels like agreement

### CT Voice Requirements
- Direct over diplomatic - NO hedging
- Use CT vocab: alpha, degen, ngmi, cope, hopium, ser, etc.
- Confident, even provocative
- Concise - every word must provoke
- NO corporate speak
- NO weasel words ("might", "potentially", "arguably")

### Hot Take Structure
1. **Bold Claim**: State position without qualification
2. **Brief Logic**: One line of reasoning (optional but helps defensibility)
3. **Conversation Bait**: Statement that BEGS "but what about..." responses

### What Makes a Take "Hot"
- Goes against current CT consensus
- Challenges something people assume is true
- Attacks a sacred cow (but with reasoning)
- Frames a common practice as wrong
- Makes people feel seen OR attacked

### Types of Hot Takes That Work

**The Sacred Cow Attack**
"[Popular thing] is actually [negative take]"
Example: "DCA is cope for people scared to have a real thesis."

**The Uncomfortable Truth**
"[Thing people don't want to hear] and CT isn't ready for that conversation"
Example: "Most altcoins are going to zero and your bags aren't coming back."

**The Contrarian Position**
"[Opposite of consensus]. And it's not even close."
Example: "SOL > ETH for actual users. And it's not even close."

**The Industry Callout**
"[Common practice] is why [negative outcome]"
Example: "VC round worship is why retail keeps getting dumped on."

**The Status Attack**
"[Respected group] is wrong about [specific thing]"
Example: "Crypto 'experts' with 100k+ followers got this cycle completely wrong."

### Conversation Hooks
The take should END in a way that makes silence feel like agreement:
- Make a statement so bold people feel compelled to qualify it
- Leave an obvious counterargument unaddressed (they'll rush to fill it)
- Imply "and you know I'm right" energy
- Don't ask a question - statement that begs contradiction is stronger

### What NOT to Do
- Don't be contrarian without reasoning (that's just trolling)
- Don't attack people, attack ideas
- Don't take positions you can't defend when challenged
- Don't be offensive just for engagement (algorithm punishes blocks/reports)
- Don't hedge the take into meaninglessness

### Output Format
Generate 3 variations targeting different nerves:

**Variation 1: [What consensus it challenges]**
[Tweet content]
*Character count:* [X]
*Why they'll reply:* [The itch they can't help scratching]

**Variation 2: [What consensus it challenges]**
...

**Variation 3: [What consensus it challenges]**
...

**Recommendation:** [Which one will generate most productive disagreement]
`;

export const HOT_TAKE_HOOKS = [
  {
    pattern: "sacred_cow",
    template: "[Popular thing] is [negative take]. [Brief reasoning].",
    example: "DCA is cope for people scared to have a real thesis.",
  },
  {
    pattern: "uncomfortable_truth",
    template: "[Harsh reality] and CT isn't ready for that conversation.",
    example: "Your altcoin bags aren't coming back and CT isn't ready for that conversation.",
  },
  {
    pattern: "direct_comparison",
    template: "[Unpopular choice] > [Popular choice]. And it's not even close.",
    example: "SOL > ETH for actual users. And it's not even close.",
  },
  {
    pattern: "industry_callout",
    template: "[Common practice] is why [negative outcome for retail].",
    example: "Low float high FDV launches are why retail keeps getting rekt.",
  },
  {
    pattern: "status_challenge",
    template: "[Respected group] got [specific thing] completely wrong.",
    example: "CT's biggest accounts got this cycle completely wrong. Check the receipts.",
  },
  {
    pattern: "cope_detector",
    template: "[Popular belief] is just [cope/hopium] dressed up as [analysis/strategy].",
    example: "\"We're still early\" is just hopium dressed up as analysis.",
  },
];

/**
 * Generate a hot take prompt with user context
 */
export function hotTakePrompt(context?: HotTakeContext): string {
  let prompt = HOT_TAKE_PROMPT;

  if (context) {
    prompt += `\n\n## USER CONTEXT\n`;

    if (context.niche) {
      prompt += `**Niche/Focus:** ${context.niche}\n`;
      prompt += `- The hot take should challenge consensus within this space\n`;
      prompt += `- Know the sacred cows of this community\n`;
    }

    if (context.tone) {
      const toneGuides: Record<string, string> = {
        spicy: '- Maximum provocation\n- "Fight me" energy\n- Short, punchy, unapologetic',
        'thoughtful-contrarian': '- Still bold but includes reasoning\n- "Here\'s why I think differently"\n- Invites genuine debate, not just rage',
        'industry-insider': '- Speaks from position of experience\n- "After X years in the space..."\n- Challenges from a place of knowledge',
      };
      prompt += `**Tone:** ${context.tone}\n${toneGuides[context.tone]}\n`;
    }

    if (context.topic) {
      prompt += `**Topic to challenge:** ${context.topic}\n`;
      prompt += `- Find the contrarian angle on this specific topic\n`;
    }

    if (context.targetConsensus) {
      prompt += `**Current consensus to challenge:** ${context.targetConsensus}\n`;
      prompt += `- This is what most of CT currently believes\n`;
      prompt += `- Your job is to argue the opposite with conviction\n`;
    }
  }

  return prompt;
}
