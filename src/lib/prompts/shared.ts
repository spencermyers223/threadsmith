/**
 * Shared Prompt Components
 * Algorithm optimization rules and Tech Twitter voice guidelines used across all prompt types
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
  // Extended tone preferences for specialized prompts
  tonePreferences?: TonePreferences;
}

/**
 * Extended tone preferences for specialized content types
 */
export interface TonePreferences {
  confidence?: 'measured' | 'confident' | 'bold';
  technicalDepth?: 'accessible' | 'intermediate' | 'deep' | 'beginner-friendly' | 'advanced';
  personality?: 'serious' | 'witty' | 'irreverent';
  style?: 'teacher' | 'analyst' | 'builder';
  honesty?: 'diplomatic' | 'balanced' | 'brutally-honest';
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
 * Tech Twitter Voice Guidelines
 * Voice and tone guidelines that make content feel native to Tech Twitter
 * Adapts based on user's specific niche (AI, crypto, robotics, etc.)
 */
export const TECH_TWITTER_VOICE = `
## TECH TWITTER VOICE GUIDELINES

Tech Twitter spans many communities (AI, crypto, robotics, biotech, etc.). Content must feel authentic to the user's specific niche while following these universal principles.

### Tone Principles
- Direct, not diplomatic. No hedging or corporate speak.
- Confident but not arrogant. Strong opinions backed by reasoning.
- Concise over comprehensive. Say more with less.
- Self-aware humor when appropriate. Tech communities appreciate wit.
- No excessive formality. Write like you're talking to a smart peer.

### Professional Voice (Default)
- Clear, precise language
- Data-driven claims with evidence
- Technically accurate terminology
- Thoughtful analysis over hype
- Respect for the reader's intelligence

### What to Avoid
- Corporate speak: "leveraging synergies", "ecosystem expansion", "strategic partnerships"
- Excessive hedging: "This is not professional advice and you should consult an expert..."
  - Brief disclaimers when genuinely needed are fine
- Excessive formality: "I would like to share my thoughts on the recent developments"
  - Better: "Here's what I'm seeing"
- Hashtag abuse: Using multiple hashtags on every post
- Emoji spam without substance
- Hype language without backing: "Revolutionary!", "Game-changing!"

### Credibility Signals to Include
- Show your reasoning (let readers evaluate your logic)
- Use specific numbers over vague claims
- Cite sources when referencing data or research
- Admit uncertainty when genuinely uncertain
- Disclose relevant affiliations when appropriate
- Be timely - stale takes get ignored

### Niche-Specific Vocabulary
Different tech communities have their own language. The AI should:
- Use terminology native to the user's niche
- Understand context-specific jargon
- Match the communication style of respected voices in that space
- Avoid forcing vocabulary from other niches

### Red Flags to Avoid
- Urgency language: "Last chance", "Don't miss this"
- Guaranteed outcomes: "100% guaranteed results"
- Vague claims with no specifics
- Pressure tactics
- Misleading technical claims
`;

// Legacy alias for backwards compatibility
export const CT_VOICE = TECH_TWITTER_VOICE;

// ============================================
// Helper functions for building context sections
// ============================================

function buildNicheSection(niche: string): string {
  return `
**Niche/Industry:** ${niche}
- Content should be relevant to this space
- Use terminology and references that resonate with this community
`;
}

function buildContentGoalSection(contentGoal: string): string {
  return `
**Creator's Goal:** ${contentGoal}
- Every post should help achieve this goal
- Content should position them appropriately
`;
}

function buildTargetAudienceSection(targetAudience: string): string {
  return `
**Target Audience:** ${targetAudience}
- Write as if speaking directly to this audience
- Use language, examples, and references they'll connect with
`;
}

function buildAdmiredAccountsSection(admiredAccounts: string[]): string {
  return `
**Style Inspiration - Accounts They Admire:** ${admiredAccounts.join(', ')}
- Mirror their posting style, tone, and energy
- Match their hook patterns and engagement tactics
- Posts should feel like they could appear alongside their content
`;
}

function buildToneSlidersSection(profile: UserVoiceProfile): string {
  const hasToneSliders = profile.formalityLevel !== undefined ||
    profile.technicalLevel !== undefined ||
    profile.humorLevel !== undefined;

  if (!hasToneSliders) return '';

  let section = `
**Tone Calibration:**
`;
  if (profile.formalityLevel !== undefined) {
    const formality = profile.formalityLevel < 33 ? 'casual and conversational' :
      profile.formalityLevel > 66 ? 'professional and polished' : 'balanced';
    section += `- Formality: ${formality}\n`;
  }
  if (profile.technicalLevel !== undefined) {
    const technical = profile.technicalLevel < 33 ? 'simple and accessible' :
      profile.technicalLevel > 66 ? 'deep technical detail' : 'moderate technical depth';
    section += `- Technical Depth: ${technical}\n`;
  }
  if (profile.humorLevel !== undefined) {
    const humor = profile.humorLevel < 33 ? 'serious and focused' :
      profile.humorLevel > 66 ? 'playful with humor' : 'occasional light touches';
    section += `- Humor: ${humor}\n`;
  }
  return section;
}

/**
 * Build tone preferences section for specialized content types
 */
function buildTonePreferencesSection(tonePreferences: TonePreferences): string {
  if (!tonePreferences || Object.keys(tonePreferences).length === 0) return '';

  const { confidence, technicalDepth, personality, style, honesty } = tonePreferences;
  let section = `
**Tone Calibration:**
`;

  if (confidence) {
    const desc = confidence === 'measured' ? '(hedging acceptable)' :
      confidence === 'bold' ? '(strong stances, minimal hedging)' : '(clear but not aggressive)';
    section += `- Confidence Level: ${confidence} ${desc}\n`;
  }

  if (technicalDepth) {
    const desc = technicalDepth === 'accessible' || technicalDepth === 'beginner-friendly'
      ? '(explain jargon)'
      : technicalDepth === 'deep' || technicalDepth === 'advanced'
        ? '(assume familiarity)'
        : '(some jargon OK)';
    section += `- Technical Depth: ${technicalDepth} ${desc}\n`;
  }

  if (personality) {
    const desc = personality === 'irreverent' ? '(tech humor welcome)' :
      personality === 'witty' ? '(clever observations)' : '(straightforward)';
    section += `- Personality: ${personality} ${desc}\n`;
  }

  if (style) {
    const desc = style === 'teacher' ? '(patient, thorough, builds understanding)' :
      style === 'analyst' ? '(data-driven, implications-focused)' :
        '(practical, how things actually work in production)';
    section += `- Style: ${style} ${desc}\n`;
  }

  if (honesty) {
    const desc = honesty === 'brutally-honest' ? '(call out issues directly, no sugarcoating)' :
      honesty === 'diplomatic' ? '(acknowledge issues but frame constructively)' :
        '(straightforward about pros and cons)';
    section += `- Honesty Level: ${honesty} ${desc}\n`;
  }

  return section;
}

// ============================================
// Main context building functions
// ============================================

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
    context += buildNicheSection(profile.niche);
  }
  if (profile.contentGoal) {
    context += buildContentGoalSection(profile.contentGoal);
  }
  if (profile.targetAudience) {
    context += buildTargetAudienceSection(profile.targetAudience);
  }
  if (profile.admiredAccounts?.length) {
    context += buildAdmiredAccountsSection(profile.admiredAccounts);
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

  // Handle tone sliders (numeric 0-100 scale)
  context += buildToneSlidersSection(profile);

  // Handle tone preferences (structured object for specialized prompts)
  if (profile.tonePreferences) {
    context += buildTonePreferencesSection(profile.tonePreferences);
  }

  return context;
}

/**
 * Build user context section for specialized prompts
 */
export function buildUserContextSection(profile: UserVoiceProfile): string {
  if (!profile || Object.keys(profile).length === 0) {
    return '';
  }

  let section = `## USER CONTEXT (Personalize content to this profile)\n`;

  if (profile.niche) {
    section += `
**Niche:** ${profile.niche}
- Use terminology native to this space
- Reference relevant topics, trends, and developments
- Speak to what this community cares about
`;
  }

  if (profile.targetAudience) {
    section += `
**Target Audience:** ${profile.targetAudience}
- Calibrate technical depth appropriately
- Address their specific pain points and interests
`;
  }

  if (profile.tonePreferences) {
    section += buildTonePreferencesSection(profile.tonePreferences);
  }

  return section;
}

/**
 * Common output format instructions for all generation prompts
 */
export const OUTPUT_FORMAT_RULES = `
## OUTPUT REQUIREMENTS

1. Generate 3 distinct options for the user to choose from
2. Each option should take a different angle or approach
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
