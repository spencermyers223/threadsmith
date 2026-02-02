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

### Humanness Markers (Sound Like a Real Person)
Add these natural phrases when appropriate:
- "here's the thing" / "the truth is"
- "this blew my mind" / "this changed everything"
- "I was wrong about this" / "I used to think..."
- "nobody tells you this, but" / "the quiet part out loud"
- "let me be real" / "unpopular opinion"
- Brief personal asides in parentheses (shows personality)

### AI SLOP PATTERNS — ABSOLUTE PROHIBITION

These patterns are BANNED. Using any of them makes the content immediately detectable as AI-generated. Real humans don't write this way.

**BANNED OPENERS (automatic failure if used):**
❌ "In the world of..." / "In today's fast-paced..."
❌ "As we navigate..." / "In this thread, I'll..."  
❌ "Let me share..." / "I'm excited to announce..."
❌ "Breaking down..." / "Here's my take on..."
❌ "I wanted to share..." / "Allow me to explain..."

**BANNED TRANSITIONS (delete these entirely):**
❌ "Furthermore" / "Moreover" / "Additionally"
❌ "It's worth noting that..." / "Interestingly enough..."
❌ "That being said..." / "With that in mind..."
❌ "Moving forward..." / "Needless to say..."

**BANNED HEDGING (makes content weak):**
❌ "It's important to remember that..."
❌ "It should be noted that..."
❌ "One might argue that..."
❌ "It could be said that..."

**BANNED CONCLUSIONS (never end this way):**
❌ "In conclusion..." / "To sum up..."
❌ "All in all..." / "At the end of the day..."
❌ "The bottom line is..." / "To wrap up..."

**BANNED CORPORATE SPEAK:**
❌ "game-changer" / "groundbreaking" / "revolutionary"
❌ "deep dive" / "synergy" / "ecosystem" / "paradigm shift"
❌ "unlock" / "leverage" / "utilize"
❌ "robust" / "seamless" / "cutting-edge" / "holistic"
❌ "actionable insights" / "value proposition" / "empower"

**OTHER AI TELLS TO AVOID:**
❌ Perfect grammar when casual would be more authentic
❌ Semicolons (humans rarely use them on Twitter)
❌ Starting multiple sentences with "This"
❌ Numbered lists in single tweets (feels robotic)
❌ Ending with "Thoughts?" or "What do you think?"

**WHAT TO USE INSTEAD:**
✅ Start mid-thought: "The thing nobody tells you about X..."
✅ Start with a statement: "X is overrated."
✅ Start with a number: "3 years ago I..."
✅ Start with an observation: "Everyone's talking about X. They're missing the point."
✅ Use "Also" instead of "Additionally"
✅ Use "But" instead of "However"
✅ Use "Look," or "Here's the thing:" for transitions
✅ Just end. Don't announce the ending.

### Psychological Triggers (What Makes Content Spread)
High-arousal emotions spread faster. Aim for:
- **Awe**: "This changed everything I thought I knew"
- **Surprise**: Contradict common wisdom with evidence
- **Humor**: Unexpected, relatable observations
- **Validation**: Make readers feel seen or smart

Specificity beats vagueness:
- ❌ "I made good money" → ✅ "I made $2,347"
- ❌ "I grew fast" → ✅ "I grew from 0 to 10K in 57 days"
- ❌ "Many people" → ✅ "83% of accounts I analyzed"
`;

// Legacy alias for backwards compatibility
export const CT_VOICE = TECH_TWITTER_VOICE;

/**
 * Smart Emoji Insertion Guidelines
 * Research-backed rules for effective emoji usage on X/Twitter
 */
export const EMOJI_GUIDELINES = `
## SMART EMOJI USAGE

Emojis increase engagement when used strategically. Misused, they signal AI slop.

### When Emojis WORK (Use These Patterns)

**1. Hook Amplifiers** — Single emoji at start to catch attention
✅ "🔥 Just hit $10K MRR"
✅ "💀 The thing nobody tells you about..."
✅ "🚀 Shipped the feature that changed everything"

**2. Visual Bullet Points** — Replace dashes in lists
✅ "My morning routine:
📧 Inbox zero
🏋️ 30 min workout
💻 Deep work block"

**3. Emotional Punctuation** — End of tweet to add tone
✅ "Took 3 years but finally made it 🎉"
✅ "Lost the deal. Back to the drawing board 😅"

**4. Section Breaks in Threads** — Visual separation
✅ Thread structure: 🧵 → 📊 → 💡 → 🎯

**5. Brand/Niche Signatures** — Consistent emojis that become part of your voice
- Builders: 🛠️ ⚡ 🚀
- Finance: 📈 💰 📊
- AI/Tech: 🤖 🧠 ⚡
- Content: ✍️ 📝 🎯

### When Emojis FAIL (Avoid These)

❌ **Emoji Spam** — More than 3 per tweet looks desperate
❌ "🔥🔥🔥 OMG this is SO good 🙌🙌🙌 you NEED to see this 👀👀"

❌ **Random Decoration** — Emojis that don't add meaning
❌ "Just had a meeting 📞 about our product 💻 with the team 👥"

❌ **Mismatched Tone** — Playful emojis on serious content
❌ "Lost my biggest client today 🎉" (obviously wrong)

❌ **Replacing Words** — Makes content hard to read
❌ "I ❤️ when we 🚀 new 💡s to our 👥"

❌ **End-of-Every-Tweet Pattern** — Dead giveaway of AI
❌ Every tweet ending with 🚀 or 💪 or ✨

### Emoji Frequency by Content Type

| Content Type | Emoji Level | Example |
|--------------|-------------|---------|
| Hot take | 0-1 | Hook emoji only, let words hit hard |
| Build in public | 1-2 | Milestone markers |
| Thread | 2-4 total | Section headers only |
| List post | Match list items | One per bullet |
| Celebration | 1-2 | 🎉 or 🚀 to punctuate |
| Educational | 0-1 | Keep it clean, content is king |

### The 3 Rules

1. **One purpose per emoji** — Each emoji should ADD something
2. **Match the user's voice** — If they don't use emojis, neither should you
3. **When in doubt, leave it out** — No emoji > wrong emoji

### Adapt to User's Style
If the voice profile shows:
- "frequent" emoji usage → Use 1-2 per tweet
- "occasional" emoji usage → Use 0-1 per tweet  
- "rare/minimal" emoji usage → Avoid emojis entirely
- Specific favorites → Use THOSE emojis naturally
`;

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
 * Build few-shot voice examples from user's actual tweets
 * This is the highest-impact technique for humanizing AI output
 * 
 * @param samples - Array of user's actual tweets (ideally 3-5 best ones)
 * @returns Formatted section for system prompt injection
 */
export function buildVoiceSamplesSection(samples: string[]): string {
  if (!samples || samples.length === 0) {
    return '';
  }

  // Limit to 5 samples max - quality over quantity
  const topSamples = samples.slice(0, 5);
  
  const examplesList = topSamples
    .map((tweet, i) => `${i + 1}. "${tweet}"`)
    .join('\n');

  return `
## FEW-SHOT VOICE EXAMPLES (HIGHEST PRIORITY)

These are ACTUAL tweets written by this user. Your output MUST match their voice.

${examplesList}

**CRITICAL VOICE MATCHING RULES:**
1. Study the sentence structure in these examples - match it exactly
2. Note their punctuation patterns (periods, dashes, ellipsis) - replicate them
3. Observe emoji usage (frequency, position, type) - match their pattern
4. Match their vocabulary level and word choices
5. Copy their energy level (calm, excited, provocative)
6. If they use fragments, use fragments. If they use long sentences, use long sentences.

The generated content should feel like tweet #6 in this list - written by the same person.
`;
}

/**
 * Common output format instructions for all generation prompts
 * Optimized for clean, postable output with no AI meta-discussion
 */
export const OUTPUT_FORMAT_RULES = `
## OUTPUT FORMAT

Generate exactly 3 variations. Each must be READY TO POST - no edits needed.

Format EXACTLY like this:

---
1
[Your content here - ready to copy/paste to X]
---

---
2
[Your content here - ready to copy/paste to X]
---

---
3
[Your content here - ready to copy/paste to X]
---

CRITICAL RULES:
- NO explanations, analysis, or "why this works" commentary
- NO character counts or metadata
- NO asking "what do you think?" or similar weak endings
- Just pure, postable content between the --- markers
- Each variation should take a DIFFERENT angle/approach
- Content must be complete and ready to post AS-IS
- NEVER include external links in main content (suggest in first reply instead)
`;
