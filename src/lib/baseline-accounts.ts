/**
 * Curated list of high-engagement X accounts for baseline scoring.
 * 
 * These accounts are selected for consistently high engagement rates
 * across relevant niches: AI, build-in-public, tech, solopreneurs, crypto.
 * 
 * We fetch their top tweets to train our scoring baseline.
 */

export interface BaselineAccount {
  username: string;
  niche: 'ai' | 'build-in-public' | 'tech' | 'crypto' | 'solopreneur';
  priority: 'high' | 'medium'; // High priority accounts fetched first
}

export const BASELINE_ACCOUNTS: BaselineAccount[] = [
  // AI & Tech
  { username: 'levelsio', niche: 'build-in-public', priority: 'high' },
  { username: 'marc_louvion', niche: 'build-in-public', priority: 'high' },
  { username: 'tdinh_me', niche: 'build-in-public', priority: 'high' },
  { username: 'dannypostmaa', niche: 'build-in-public', priority: 'high' },
  { username: 'adamwathan', niche: 'tech', priority: 'high' },
  
  // Build in Public
  { username: 'jmwind', niche: 'build-in-public', priority: 'medium' },
  { username: 'benln', niche: 'build-in-public', priority: 'medium' },
  { username: 'maboroshi', niche: 'build-in-public', priority: 'medium' },
  
  // AI/Tech Influencers
  { username: 'swyx', niche: 'ai', priority: 'high' },
  { username: 'karpathy', niche: 'ai', priority: 'high' },
  { username: 'sama', niche: 'ai', priority: 'medium' },
  { username: 'emollick', niche: 'ai', priority: 'high' },
  
  // Solopreneurs
  { username: 'thejustinwelsh', niche: 'solopreneur', priority: 'high' },
  { username: 'dickiebush', niche: 'solopreneur', priority: 'high' },
  { username: 'nocodedevs', niche: 'solopreneur', priority: 'medium' },
  
  // Crypto (secondary niche)
  { username: 'cobie', niche: 'crypto', priority: 'medium' },
  { username: 'CryptoHayes', niche: 'crypto', priority: 'medium' },
];

/**
 * Pattern types we extract from high-performing tweets
 */
export interface TweetPattern {
  hookType: 'number' | 'question' | 'bold-claim' | 'story' | 'other';
  hasQuestion: boolean;
  hasCTA: boolean;
  ctaType?: 'question' | 'instruction' | 'engagement-phrase';
  length: number;
  lineBreaks: number;
  emojiCount: number;
  hashtagCount: number;
  hasLink: boolean;
}

/**
 * Extract patterns from a tweet for baseline analysis
 */
export function extractTweetPatterns(text: string): TweetPattern {
  const firstLine = text.split('\n')[0]?.trim() || '';
  
  // Determine hook type
  let hookType: TweetPattern['hookType'] = 'other';
  if (/^\d/.test(firstLine)) {
    hookType = 'number';
  } else if (/^(what|why|how|when|who|which|do you|have you|is |are |did |will |can )/i.test(firstLine)) {
    hookType = 'question';
  } else if (/^(unpopular opinion|hot take|controversial|nobody talks about|the truth about|stop |don't |never |i |my )/i.test(firstLine)) {
    hookType = 'bold-claim';
  } else if (/^(last |yesterday|today|this morning|just |so |when i)/i.test(firstLine)) {
    hookType = 'story';
  }
  
  const lower = text.toLowerCase();
  const hasQuestion = text.includes('?');
  
  // CTA detection
  const engagementPhrases = ['what do you think', 'agree?', 'disagree?', 'thoughts?', 'am i wrong', 'change my mind', 'prove me wrong', 'who else', 'reply with', 'drop your'];
  const instructionPhrases = ['follow me', 'retweet', 'like this', 'bookmark this', 'save this'];
  
  let hasCTA = false;
  let ctaType: TweetPattern['ctaType'] | undefined;
  
  if (text.trim().endsWith('?')) {
    hasCTA = true;
    ctaType = 'question';
  } else if (engagementPhrases.some(p => lower.includes(p))) {
    hasCTA = true;
    ctaType = 'engagement-phrase';
  } else if (instructionPhrases.some(p => lower.includes(p))) {
    hasCTA = true;
    ctaType = 'instruction';
  }
  
  const emojiRegex = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/g;
  const emojis = text.match(emojiRegex) || [];
  const hashtags = text.match(/#\w+/g) || [];
  const lineBreaks = (text.match(/\n/g) || []).length;
  const hasLink = /https?:\/\/\S+/.test(text);
  
  return {
    hookType,
    hasQuestion,
    hasCTA,
    ctaType,
    length: text.length,
    lineBreaks,
    emojiCount: emojis.length,
    hashtagCount: hashtags.length,
    hasLink,
  };
}

/**
 * Baseline statistics derived from analyzing top tweets
 */
export interface BaselineStats {
  // Length distribution
  avgLength: number;
  medianLength: number;
  
  // Hook distribution (percentage of top tweets using each hook type)
  hookDistribution: Record<TweetPattern['hookType'], number>;
  
  // CTA usage
  ctaUsageRate: number; // % of top tweets with CTA
  questionEndingRate: number; // % ending with question
  
  // Format stats
  avgLineBreaks: number;
  avgEmojiCount: number;
  avgHashtagCount: number;
  linkUsageRate: number;
  
  // Sample count
  totalTweets: number;
  fetchedAt: string;
}

/**
 * Calculate baseline stats from a set of tweets
 */
export function calculateBaselineStats(tweets: { text: string; reply_count: number }[]): BaselineStats {
  if (tweets.length === 0) {
    return getDefaultBaseline();
  }
  
  const patterns = tweets.map(t => extractTweetPatterns(t.text));
  const lengths = patterns.map(p => p.length).sort((a, b) => a - b);
  
  // Calculate hook distribution
  const hookCounts: Record<TweetPattern['hookType'], number> = {
    'number': 0,
    'question': 0,
    'bold-claim': 0,
    'story': 0,
    'other': 0,
  };
  patterns.forEach(p => hookCounts[p.hookType]++);
  
  const hookDistribution: Record<TweetPattern['hookType'], number> = {
    'number': hookCounts['number'] / patterns.length,
    'question': hookCounts['question'] / patterns.length,
    'bold-claim': hookCounts['bold-claim'] / patterns.length,
    'story': hookCounts['story'] / patterns.length,
    'other': hookCounts['other'] / patterns.length,
  };
  
  return {
    avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    medianLength: lengths[Math.floor(lengths.length / 2)],
    hookDistribution,
    ctaUsageRate: patterns.filter(p => p.hasCTA).length / patterns.length,
    questionEndingRate: patterns.filter(p => p.hasQuestion).length / patterns.length,
    avgLineBreaks: patterns.reduce((sum, p) => sum + p.lineBreaks, 0) / patterns.length,
    avgEmojiCount: patterns.reduce((sum, p) => sum + p.emojiCount, 0) / patterns.length,
    avgHashtagCount: patterns.reduce((sum, p) => sum + p.hashtagCount, 0) / patterns.length,
    linkUsageRate: patterns.filter(p => p.hasLink).length / patterns.length,
    totalTweets: patterns.length,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Default baseline stats (used before we've fetched real data)
 */
export function getDefaultBaseline(): BaselineStats {
  return {
    avgLength: 200,
    medianLength: 180,
    hookDistribution: {
      'number': 0.15,
      'question': 0.20,
      'bold-claim': 0.30,
      'story': 0.20,
      'other': 0.15,
    },
    ctaUsageRate: 0.65,
    questionEndingRate: 0.45,
    avgLineBreaks: 2,
    avgEmojiCount: 1.5,
    avgHashtagCount: 0.5,
    linkUsageRate: 0.1,
    totalTweets: 0,
    fetchedAt: new Date().toISOString(),
  };
}
