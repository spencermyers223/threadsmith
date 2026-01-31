/**
 * Build Generation Prompt
 * Combines user profile, topic, tone, length, and archetype into complete prompts
 */

import { ALGORITHM_KNOWLEDGE, ALGORITHM_WARNINGS, HOOK_PATTERNS } from './algorithm-knowledge';
import { SCROLL_STOPPER_PROMPT, SCROLL_STOPPER_HOOKS } from './scroll-stopper';
import { DEBATE_STARTER_PROMPT, DEBATE_STARTER_HOOKS } from './debate-starter';
import { VIRAL_CATALYST_PROMPT, VIRAL_CATALYST_HOOKS } from './viral-catalyst';
import { buildUserContext, EMOJI_GUIDELINES, type UserVoiceProfile } from './shared';

// Types
export type Archetype = 'scroll-stopper' | 'debate-starter' | 'viral-catalyst' | 'balanced';
export type ContentLength = 'short' | 'medium' | 'long';
export type ContentType = 'tweet' | 'thread' | 'article';
export type Tone = 'professional' | 'casual' | 'bold' | 'educational' | 'inspirational';

export interface UserProfile {
  niche?: string;
  contentGoal?: string;
  voiceStyle?: string;
  admiredAccounts?: string[];
  targetAudience?: string;
  personalBrand?: string;
}

export interface GenerationOptions {
  topic: string;
  contentType: ContentType;
  archetype: Archetype;
  tone: Tone;
  length: ContentLength;
  userProfile?: UserProfile;
  additionalContext?: string;
  includeHookSuggestions?: boolean;
}

export interface GeneratedPrompts {
  systemPrompt: string;
  userPrompt: string;
}

// Archetype prompt mapping
const ARCHETYPE_PROMPTS: Record<Archetype, string> = {
  'scroll-stopper': SCROLL_STOPPER_PROMPT,
  'debate-starter': DEBATE_STARTER_PROMPT,
  'viral-catalyst': VIRAL_CATALYST_PROMPT,
  'balanced': `
## BALANCED APPROACH

Create content that balances all three viral mechanics:
1. Scroll-stopping hooks
2. Reply-generating questions
3. Share-worthy value

Don't optimize for just one metric—create well-rounded content that performs across all engagement types.
`,
};

// Archetype hooks mapping
const ARCHETYPE_HOOKS: Record<Archetype, typeof SCROLL_STOPPER_HOOKS> = {
  'scroll-stopper': SCROLL_STOPPER_HOOKS,
  'debate-starter': DEBATE_STARTER_HOOKS,
  'viral-catalyst': VIRAL_CATALYST_HOOKS,
  'balanced': [...SCROLL_STOPPER_HOOKS.slice(0, 2), ...DEBATE_STARTER_HOOKS.slice(0, 2), ...VIRAL_CATALYST_HOOKS.slice(0, 2)],
};

// Tone instructions
const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: `
TONE: Professional
- Use clear, confident language
- Avoid slang and excessive casualness
- Maintain authority while being approachable
- Back claims with specifics when possible
`,
  casual: `
TONE: Casual
- Write like you're texting a smart friend
- Use contractions and conversational language
- It's okay to be playful and use humor
- Keep it relatable and human
`,
  bold: `
TONE: Bold
- Be direct and unapologetic
- Take strong stances
- Use punchy, impactful language
- Don't hedge or qualify unnecessarily
`,
  educational: `
TONE: Educational
- Focus on teaching and explaining
- Break down complex ideas simply
- Use examples and analogies
- Be patient and thorough
`,
  inspirational: `
TONE: Inspirational
- Motivate and encourage
- Share transformation stories
- Focus on possibility and growth
- Use emotionally resonant language
`,
};

// Content length guidelines
const LENGTH_GUIDELINES: Record<ContentLength, Record<ContentType, string>> = {
  short: {
    tweet: 'Keep under 200 characters. Punchy and impactful.',
    thread: '3-5 tweets maximum. Each tweet under 250 characters.',
    article: '500-800 words. Quick read, one main point.',
  },
  medium: {
    tweet: 'Use the full 280 characters if needed. Can go up to 500.',
    thread: '5-10 tweets. Each tweet can be substantial.',
    article: '1000-1500 words. Comprehensive but focused.',
  },
  long: {
    tweet: 'Use extended tweets (up to 4000 characters for X Premium).',
    thread: '10-15 tweets. Deep dive on the topic.',
    article: '2000-3000 words. Thorough exploration.',
  },
};

// Content type specific instructions
const CONTENT_TYPE_INSTRUCTIONS: Record<ContentType, string> = {
  tweet: `
CONTENT TYPE: Single Tweet
- One core idea, one insight
- Hook in the first line
- Can end with a question for replies
- Character limit: 280 (or 4000 for long-form)
- No external links in main tweet (put in reply)
`,
  thread: `
CONTENT TYPE: Thread
- First tweet is the MOST important (it's the hook for everything)
- Number each tweet (1/, 2/, etc.)
- Each tweet should stand alone (people may see it in isolation)
- Suggest image placement every 3-4 tweets
- End with a discussion prompt or summary
- Optimal length: 5-15 tweets
`,
  article: `
CONTENT TYPE: Long-form Article
- Strong headline that promises value
- Use subheadings to break up sections
- Include data, examples, or stories
- End with actionable takeaways
- Can include links since it's long-form
`,
};

/**
 * Build the base system prompt with algorithm knowledge, archetype, tone, and content type
 */
function buildBaseSystemPrompt(
  archetype: Archetype,
  tone: Tone,
  contentType: ContentType,
  length: ContentLength
): string {
  return `You are an expert X/Twitter content strategist. Your job is to help users create high-performing content optimized for the X algorithm.

${ALGORITHM_KNOWLEDGE}

${ARCHETYPE_PROMPTS[archetype]}

${TONE_INSTRUCTIONS[tone]}

${CONTENT_TYPE_INSTRUCTIONS[contentType]}

${EMOJI_GUIDELINES}

LENGTH: ${length.toUpperCase()}
${LENGTH_GUIDELINES[length][contentType]}
`;
}

/**
 * Build the output requirements section
 */
function buildOutputRequirements(): string {
  return `
## OUTPUT REQUIREMENTS

1. Generate 3 distinct options for the user to choose from
2. For each option, explain WHY it should perform well (algorithm reasoning)
4. Warn about any algorithm red flags (external links, engagement bait, etc.)
5. CRITICAL: Every post must be personalized to the user's profile:
   - Content must align with their niche and speak to their target audience
   - Posts should help achieve their stated content goal
   - Mirror the style and tone of their admired accounts

Format your response as:

**Option 1: [Brief description]**
[Content here]

*Why this works:* [Algorithm reasoning]
*Character count:* [X characters]

**Option 2: [Brief description]**
...

**Option 3: [Brief description]**
...

**Recommendation:** [Which option and why]
`;
}

/**
 * Convert UserProfile to UserVoiceProfile for shared function compatibility
 */
function toUserVoiceProfile(userProfile: UserProfile): UserVoiceProfile {
  return {
    niche: userProfile.niche,
    contentGoal: userProfile.contentGoal,
    voiceStyle: userProfile.voiceStyle,
    admiredAccounts: userProfile.admiredAccounts,
    targetAudience: userProfile.targetAudience,
    personalBrand: userProfile.personalBrand,
  };
}

/**
 * Build the system prompt based on archetype and profile
 */
function buildSystemPrompt(options: GenerationOptions): string {
  const { archetype, tone, contentType, length, userProfile } = options;

  let systemPrompt = buildBaseSystemPrompt(archetype, tone, contentType, length);

  if (userProfile) {
    systemPrompt += buildUserContext(toUserVoiceProfile(userProfile));
  }

  systemPrompt += buildOutputRequirements();

  return systemPrompt;
}

/**
 * Build the user prompt with topic and additional context
 */
function buildUserPrompt(options: GenerationOptions): string {
  const { topic, contentType, archetype, additionalContext, includeHookSuggestions } = options;

  let userPrompt = `Create ${contentType} content about: ${topic}

Archetype focus: ${archetype}
`;

  if (additionalContext) {
    userPrompt += `\nAdditional context:\n${additionalContext}\n`;
  }

  if (includeHookSuggestions) {
    const hooks = ARCHETYPE_HOOKS[archetype];
    userPrompt += `\nHere are some hook patterns you can adapt:\n`;
    hooks.slice(0, 3).forEach((hook, i) => {
      userPrompt += `${i + 1}. ${hook.pattern}: "${hook.example}"\n`;
    });
  }

  userPrompt += `\nGenerate 3 options optimized for maximum engagement.`;

  return userPrompt;
}

/**
 * Main function to build complete prompts for Claude API
 */
export function buildGenerationPrompt(options: GenerationOptions): GeneratedPrompts {
  return {
    systemPrompt: buildSystemPrompt(options),
    userPrompt: buildUserPrompt(options),
  };
}

/**
 * Get hook examples for a specific archetype
 */
export function getHookExamples(archetype: Archetype): typeof SCROLL_STOPPER_HOOKS {
  return ARCHETYPE_HOOKS[archetype];
}

/**
 * Get algorithm warnings for content analysis
 */
export function getAlgorithmWarnings() {
  return ALGORITHM_WARNINGS;
}

/**
 * Get general hook patterns
 */
export function getHookPatterns() {
  return HOOK_PATTERNS;
}

/**
 * Analyze content for algorithm red flags
 */
export function analyzeContent(content: string): string[] {
  const warnings: string[] = [];

  // Check for external links
  const urlRegex = /https?:\/\/[^\s]+/g;
  if (urlRegex.test(content)) {
    warnings.push(ALGORITHM_WARNINGS.externalLink);
  }

  // Check for hashtag spam
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount > 2) {
    warnings.push(ALGORITHM_WARNINGS.tooManyHashtags);
  }

  // Check for engagement bait phrases
  const engagementBaitPhrases = [
    'like if you agree',
    'retweet if',
    'share if you',
    'like and retweet',
    'rt if',
    'like this if',
  ];
  const lowerContent = content.toLowerCase();
  if (engagementBaitPhrases.some(phrase => lowerContent.includes(phrase))) {
    warnings.push(ALGORITHM_WARNINGS.engagementBait);
  }

  // Check tweet length
  if (content.length > 280 && content.length < 500) {
    // Awkward length - too long for regular tweet, too short for long-form
    warnings.push("Content is between 280-500 characters - either shorten to fit a regular tweet or expand for long-form.");
  }

  // Check for weak opening
  const weakOpenings = ['i think', 'in my opinion', 'i believe', 'just wanted to'];
  const firstLine = content.split('\n')[0].toLowerCase();
  if (weakOpenings.some(phrase => firstLine.startsWith(phrase))) {
    warnings.push(ALGORITHM_WARNINGS.noHook);
  }

  return warnings;
}
