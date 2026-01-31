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

You are generating a HOT TAKE for Tech Twitter. This is a contrarian opinion designed to spark discussion and invite disagreement.

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

### Voice Requirements
- Direct over diplomatic - NO hedging
- Use vocabulary natural to the user's niche
- Confident, even provocative
- Concise - every word must provoke
- NO corporate speak
- NO weasel words ("might", "potentially", "arguably")

### Hot Take Structure
1. **Bold Claim**: State position without qualification
2. **Brief Logic**: One line of reasoning (optional but helps defensibility)
3. **Conversation Bait**: Statement that BEGS "but what about..." responses

### What Makes a Take "Hot"
- Goes against current consensus in the space
- Challenges something people assume is true
- Attacks a sacred cow (but with reasoning)
- Frames a common practice as wrong
- Makes people feel seen OR attacked

### Types of Hot Takes That Work

**The Sacred Cow Attack**
"[Popular thing] is actually [negative take]"
Example: "RAG is a crutch for teams who don't want to fine-tune properly."

**The Uncomfortable Truth**
"[Thing people don't want to hear] and the industry isn't ready for that conversation"
Example: "Most AI startups are just thin wrappers around API calls. There, I said it."

**The Contrarian Position**
"[Opposite of consensus]. And it's not even close."
Example: "Local models > cloud APIs for 90% of real use cases. And it's not even close."

**The Industry Callout**
"[Common practice] is why [negative outcome]"
Example: "The obsession with benchmarks is why we keep building models nobody actually uses."

**The Status Attack**
"[Respected group] is wrong about [specific thing]"
Example: "Tech influencers with 100k+ followers got the AI hype cycle completely wrong."

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
Generate 3 variations. Each must be READY TO POST - no explanation needed.

Format EXACTLY like this:

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
- NO explanations or "why this works" commentary
- NO character counts
- NO "Variation 1:" labels inside the content
- Just pure, postable tweets between the --- markers
- Each should challenge a DIFFERENT consensus
`;

export const HOT_TAKE_HOOKS = [
  {
    pattern: "sacred_cow",
    template: "[Popular thing] is [negative take]. [Brief reasoning].",
    example: "Fine-tuning is overrated. Most problems are solved with better prompting.",
  },
  {
    pattern: "uncomfortable_truth",
    template: "[Harsh reality] and the industry isn't ready for that conversation.",
    example: "Your startup's 'AI moat' doesn't exist and the industry isn't ready for that conversation.",
  },
  {
    pattern: "direct_comparison",
    template: "[Unpopular choice] > [Popular choice]. And it's not even close.",
    example: "Boring reliable tech > shiny new frameworks. And it's not even close.",
  },
  {
    pattern: "industry_callout",
    template: "[Common practice] is why [negative outcome].",
    example: "The 'move fast and break things' mindset is why most ML projects fail in production.",
  },
  {
    pattern: "status_challenge",
    template: "[Respected group] got [specific thing] completely wrong.",
    example: "The biggest tech podcasters got the AI timeline completely wrong. Check the receipts.",
  },
  {
    pattern: "cope_detector",
    template: "[Popular belief] is just [cope/wishful thinking] dressed up as [analysis/strategy].",
    example: "'We're still early' is just wishful thinking dressed up as market analysis.",
  },
  {
    pattern: "silent_majority",
    template: "Nobody wants to say it, but [uncomfortable observation].",
    example: "Nobody wants to say it, but most 'AI-first' startups are just ChatGPT with a wrapper.",
  },
  {
    pattern: "false_dichotomy",
    template: "The [X vs Y] debate is a distraction. The real issue is [Z].",
    example: "The local vs cloud AI debate is a distraction. The real issue is that most teams can't even define their use case.",
  },
  {
    pattern: "overrated_underrated",
    template: "Overrated: [popular thing]\nUnderrated: [overlooked thing]",
    example: "Overrated: prompt engineering courses\nUnderrated: actually reading the documentation",
  },
  {
    pattern: "prediction_flip",
    template: "[Consensus prediction] won't happen. Here's what will instead:",
    example: "AGI by 2027 won't happen. Here's what will instead: increasingly capable narrow AI that everyone keeps calling AGI anyway.",
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
        'thoughtful-contrarian': '- Still bold but includes reasoning\n- "Here\'s why I think differently"\n- Invites genuine debate, not just outrage',
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
      prompt += `- This is what most people currently believe\n`;
      prompt += `- Your job is to argue the opposite with conviction\n`;
    }
  }

  return prompt;
}
