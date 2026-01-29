/**
 * Humanness Phrases Library
 * Natural language patterns that make AI-generated content sound more human
 * Use these to inject authenticity into generated tweets
 */

export const HUMANNESS_PHRASES = {
  /**
   * Casual openers that signal "real person talking"
   */
  openers: [
    "here's the thing",
    "okay so",
    "wild thought:",
    "not gonna lie",
    "hot take:",
    "the truth is",
    "real talk:",
    "honest question:",
    "hear me out",
    "look,",
  ],

  /**
   * Vulnerability markers - admitting mistakes/uncertainty
   */
  admissions: [
    "I was wrong about this",
    "this blew my mind",
    "I used to think...",
    "nobody tells you this but",
    "the quiet part out loud:",
    "I'll admit it",
    "took me way too long to figure this out",
    "I almost didn't share this",
    "confession:",
    "unpopular opinion but",
  ],

  /**
   * Parenthetical asides - show personality
   */
  asides: [
    "(yes, seriously)",
    "(trust me on this)",
    "(I know, I know)",
    "(bear with me here)",
    "(this is the important part)",
    "(stay with me)",
    "(spoiler: it worked)",
    "(not clickbait)",
    "(I wish I was joking)",
    "(it gets better)",
  ],

  /**
   * Emphasis phrases - make points land
   */
  emphasis: [
    "Read that again.",
    "Let that sink in.",
    "Think about that.",
    "^ this is the key",
    "This is the part everyone misses.",
    "Seriously.",
    "No, really.",
    "I mean it.",
    "This changed everything.",
  ],

  /**
   * Conversational connectors - flow between ideas
   */
  connectors: [
    "and here's the kicker:",
    "but wait, there's more",
    "plot twist:",
    "the funny thing is",
    "turns out",
    "so anyway",
    "long story short",
    "bottom line:",
    "the point is",
  ],

  /**
   * Relatable reactions - emotional resonance
   */
  reactions: [
    "honestly same",
    "felt this in my soul",
    "this hits different",
    "needed to hear this today",
    "saving this",
    "underrated take",
    "more people need to see this",
  ],
};

/**
 * Phrases that make content feel robotic (AVOID)
 */
export const ROBOTIC_PHRASES = [
  // Openers
  "In this thread",
  "Let me explain",
  "I wanted to share",
  "I'm going to break down",
  "Allow me to elaborate",
  "In the world of",
  "In today's fast-paced",
  "As we navigate",
  "I'm excited to",
  "Here's my take on",
  "Breaking down",
  
  // Transitions
  "Furthermore",
  "Moreover",
  "Additionally",
  "In addition to this",
  "It's worth noting",
  "Interestingly enough",
  "That being said",
  "With that in mind",
  "Moving forward",
  "Needless to say",
  
  // Conclusions
  "In conclusion",
  "To summarize",
  "In summary",
  "To wrap things up",
  "All in all",
  "At the end of the day",
  "The bottom line is",
  "To wrap up",
  
  // Hedging
  "It's important to note",
  "One could argue",
  "It should be mentioned",
  "It goes without saying",
  "It could be said that",
  "It's important to remember",
  
  // Generic hype words (often overused by AI)
  "game-changing",
  "groundbreaking",
  "revolutionary",
  "paradigm shift",
  "cutting-edge",
  "unlock the power",
  "leverage",
  "utilize",
  "robust",
  "seamless",
  "synergy",
];

/**
 * Severe patterns that almost always indicate AI slop
 */
export const SEVERE_AI_PATTERNS = [
  "In this thread, I'll",
  "Let me break down",
  "Here's a thread on",
  "🧵 Thread:",
  "I'm excited to share",
  "Allow me to explain",
  "In the ever-evolving",
  "As we stand at the",
];

/**
 * Get random humanness phrase from a category
 */
export function getRandomPhrase(category: keyof typeof HUMANNESS_PHRASES): string {
  const phrases = HUMANNESS_PHRASES[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Check if text contains robotic patterns
 */
export function containsRoboticPatterns(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const phrase of ROBOTIC_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }
  
  return found;
}

/**
 * Check for severe AI patterns (almost always slop)
 */
export function containsSevereAIPatterns(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const phrase of SEVERE_AI_PATTERNS) {
    if (lowerText.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }
  
  return found;
}

/**
 * Score content for AI slop (0-100, lower is better)
 * Returns { score, issues } where issues are the detected problems
 */
export function scoreContentQuality(text: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;
  
  // Check severe patterns (high penalty)
  const severePatterns = containsSevereAIPatterns(text);
  if (severePatterns.length > 0) {
    score += severePatterns.length * 25;
    issues.push(...severePatterns.map(p => `Severe AI pattern: "${p}"`));
  }
  
  // Check regular robotic patterns (medium penalty)
  const roboticPatterns = containsRoboticPatterns(text);
  if (roboticPatterns.length > 0) {
    score += roboticPatterns.length * 10;
    issues.push(...roboticPatterns.map(p => `Robotic phrase: "${p}"`));
  }
  
  // Check for excessive emoji (more than 5 in a single tweet)
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 5) {
    score += 15;
    issues.push(`Excessive emoji (${emojiCount} found)`);
  }
  
  // Check for ALL CAPS words (more than 3)
  const capsWords = text.match(/\b[A-Z]{4,}\b/g) || [];
  if (capsWords.length > 3) {
    score += 10;
    issues.push(`Too many ALL CAPS words (${capsWords.length})`);
  }
  
  // Cap at 100
  return { score: Math.min(100, score), issues };
}
