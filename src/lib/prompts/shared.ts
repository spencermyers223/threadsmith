/**
 * Shared Prompt Components
 * Algorithm optimization rules and CT voice guidelines used across all prompt types
 */

// Types for user profile integration
export interface UserVoiceProfile {
  niche?: string;
  contentGoal?: string;
  voiceStyle?: string;
  admiredAccounts?: string[];
  targetAudience?: string;
  personalBrand?: string;
  // Tone sliders (0-100 scale)
  formalityLevel?: number; // 0 = casual, 100 = formal
  technicalLevel?: number; // 0 = simple, 100 = deep technical
  humorLevel?: number; // 0 = serious, 100 = playful
}

/**
 * Algorithm Optimization Rules
 * Derived from X algorithm research - the core rules every post should follow
 */
export const ALGORITHM_RULES = `
## ALGORITHM OPTIMIZATION RULES

These rules are derived from X's actual algorithm weights and must be followed:

### Engagement Hierarchy (What Actually Matters)
- Replies with author engagement: 75x weight (THE most valuable signal)
- Standard replies: 13.5x weight
- Profile clicks leading to engagement: 12x weight
- Dwell time >2 minutes: 10-11x weight
- Retweets: 1-20x weight (varies)
- Bookmarks: ~5x relative to likes
- Likes: 0.5x weight (nearly worthless)

**IMPLICATION: Optimize for replies over likes. Questions and opinions that invite response are 150x more valuable than content designed for likes.**

### The Critical First Hour
- First 30-60 minutes determine if content lives or dies
- Engagement VELOCITY matters more than total engagement
- 5% engagement rate on 1,000 impressions beats 1% on 10,000
- Target posting when your audience is most active

### What Triggers Algorithm SUPPRESSION (Avoid These)
- External links in main tweet (50% reach penalty - put in first reply)
- More than 2 hashtags (triggers spam detection, ~40% penalty)
- Engagement bait phrases ("like if you agree", "retweet this")
- Misspellings or unknown words (0.01x multiplier = 95% penalty)
- Content that generates reports or blocks (-369 weight per report)

### What Triggers Algorithm BOOST (Lean Into These)
- Author responding to replies (150x value when author engages back)
- Native content (no external links in main tweet)
- Content that sparks conversation threads
- Images and native video (2x boost in ranking)
- Consistent niche content (algorithm learns your patterns)
- X Premium subscribers get 4x in-network boost

### Content Format Rules
- Optimal tweet length: 71-100 characters (17% higher engagement)
- Threads: 5-15 tweets optimal, 7 is the sweet spot
- First line must stop the scroll (97% of decisions in 1.5 seconds)
- End with question or opinion that invites response
- No hashtags in hooks - max 1-2 in final tweet only

### Thread-Specific Rules
- First tweet is MOST important (it's the hook for everything)
- Number each tweet for clarity
- Each tweet must stand alone (readers may see in isolation)
- Suggest image placement every 3-4 tweets
- End with discussion prompt
`;

/**
 * Crypto Twitter Voice Guidelines
 * Cultural norms, vocabulary, and tone that makes content feel native to CT
 */
export const CT_VOICE = `
## CRYPTO TWITTER VOICE GUIDELINES

CT is a distinct subculture with its own language and norms. Content must feel native.

### Tone Principles
- Direct, not diplomatic. No hedging or corporate speak.
- Confident but not arrogant. Strong opinions backed by reasoning.
- Concise over comprehensive. Say more with less.
- Self-aware humor when appropriate. CT can laugh at itself.
- No excessive formality. Write like you're talking to a smart friend.

### Use CT Vocabulary Naturally
These terms should appear where appropriate (not forced):

**Market Terms:** alpha, degen, ape/aping, FOMO, FUD, rekt, bag/bagholder, pump, dump, jeet, diamond hands, paper hands, moon/mooning, rug/rugged

**Culture Terms:** CT, GM/GN, WAGMI, NGMI, ser, fren, anon, OG, maxi, normie, shill, NFA, DYOR, LFG, copium, hopium

**Technical Terms:** gas, TVL, APY/APR, yield farming, liquidity, whale, on-chain, L1/L2, TGE, airdrop

### What to Avoid
- Corporate speak: "leveraging synergies", "ecosystem expansion", "strategic partnerships"
- Over-hedging: "This is not financial advice and you should consult a professional..."
  - A simple "NFA" or "DYOR" suffices when needed
- Excessive formality: "I would like to share my thoughts on the recent market developments"
  - Better: "Here's what I'm seeing in the market"
- Hashtag abuse: Using #crypto #bitcoin #ethereum on every post
- Emojis as substance: rocket rockets without actual content

### Credibility Signals to Include
- Show your reasoning (let readers evaluate your logic)
- Use specific numbers over vague claims
- Admit uncertainty when genuinely uncertain
- Disclose relevant positions when appropriate
- Be timely - stale takes get ignored

### Red Flags to Avoid (Scam Patterns)
- Urgency language: "Last chance", "Don't miss this"
- Guaranteed returns: "100% gains guaranteed"
- Excessive rockets without substance
- Vague mechanics promising returns
- Pressure tactics
`;

/**
 * Build user context from voice profile settings
 * Injects personalization based on user's profile data
 */
export function buildUserContext(profile: UserVoiceProfile): string {
  if (!profile || Object.keys(profile).length === 0) {
    return '';
  }

  let context = `
## USER VOICE PROFILE

Content should be personalized to this specific creator:
`;

  if (profile.niche) {
    context += `
**Niche/Industry:** ${profile.niche}
- Content should be relevant to this space
- Use terminology and references that resonate with this community
`;
  }

  if (profile.contentGoal) {
    context += `
**Creator's Goal:** ${profile.contentGoal}
- Every post should help achieve this goal
- Content should position them appropriately
`;
  }

  if (profile.targetAudience) {
    context += `
**Target Audience:** ${profile.targetAudience}
- Write as if speaking directly to this audience
- Use language, examples, and references they'll connect with
`;
  }

  if (profile.admiredAccounts?.length) {
    context += `
**Style Inspiration - Accounts They Admire:** ${profile.admiredAccounts.join(', ')}
- Mirror their posting style, tone, and energy
- Match their hook patterns and engagement tactics
- Posts should feel like they could appear alongside their content
`;
  }

  if (profile.voiceStyle) {
    context += `
**Voice Style:** ${profile.voiceStyle}
`;
  }

  if (profile.personalBrand) {
    context += `
**Personal Brand:** ${profile.personalBrand}
`;
  }

  // Handle tone sliders if provided
  if (profile.formalityLevel !== undefined || profile.technicalLevel !== undefined || profile.humorLevel !== undefined) {
    context += `
**Tone Calibration:**
`;
    if (profile.formalityLevel !== undefined) {
      const formality = profile.formalityLevel < 33 ? 'casual and conversational' :
        profile.formalityLevel > 66 ? 'professional and polished' : 'balanced';
      context += `- Formality: ${formality}\n`;
    }
    if (profile.technicalLevel !== undefined) {
      const technical = profile.technicalLevel < 33 ? 'simple and accessible' :
        profile.technicalLevel > 66 ? 'deep technical detail' : 'moderate technical depth';
      context += `- Technical Depth: ${technical}\n`;
    }
    if (profile.humorLevel !== undefined) {
      const humor = profile.humorLevel < 33 ? 'serious and focused' :
        profile.humorLevel > 66 ? 'playful with humor' : 'occasional light touches';
      context += `- Humor: ${humor}\n`;
    }
  }

  return context;
}

/**
 * Common output format instructions for all generation prompts
 */
export const OUTPUT_FORMAT_RULES = `
## OUTPUT REQUIREMENTS

1. Generate 3 distinct options for the user to choose from
2. Each option should take a different angle or approach
3. Include character count for each option
4. NEVER include external links in the main content (suggest for first reply)
5. Content must follow algorithm rules for maximum reach

Format your response EXACTLY as:

**Option 1**
[Content here - the actual tweet/thread text]

---

**Option 2**
[Content here - the actual tweet/thread text]

---

**Option 3**
[Content here - the actual tweet/thread text]

IMPORTANT: Each option should contain ONLY the actual content to post. Do not include explanations, character counts, or analysis within the options themselves.
`;
