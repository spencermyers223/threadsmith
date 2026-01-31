/**
 * Content Cleaner
 * Post-generation cleanup to remove AI patterns and polish output
 * 
 * Run this AFTER generation to catch any AI tells that slipped through
 */

/**
 * Patterns that should be removed or replaced
 */
const REMOVAL_PATTERNS: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
  // Opening killers
  { pattern: /^In this thread,?\s*/i, replacement: '', reason: 'AI thread opener' },
  { pattern: /^Let me (explain|share|break down)/i, replacement: '', reason: 'AI opener' },
  { pattern: /^I wanted to share/i, replacement: '', reason: 'Weak opener' },
  { pattern: /^Here's my take on/i, replacement: '', reason: 'Generic opener' },
  { pattern: /^In today's fast-paced/i, replacement: '', reason: 'Corporate opener' },
  { pattern: /^In the world of/i, replacement: '', reason: 'Corporate opener' },
  { pattern: /^As we navigate/i, replacement: '', reason: 'Corporate opener' },
  { pattern: /^I'm excited to/i, replacement: '', reason: 'Corporate opener' },
  { pattern: /^Breaking down/i, replacement: '', reason: 'AI opener' },
  
  // Transition words (replace with nothing or simpler alternatives)
  { pattern: /\bFurthermore,?\s*/gi, replacement: '', reason: 'Robotic transition' },
  { pattern: /\bMoreover,?\s*/gi, replacement: '', reason: 'Robotic transition' },
  { pattern: /\bAdditionally,?\s*/gi, replacement: 'Also, ', reason: 'Robotic transition' },
  { pattern: /\bIt's worth noting that\s*/gi, replacement: '', reason: 'Filler phrase' },
  { pattern: /\bInterestingly enough,?\s*/gi, replacement: '', reason: 'AI padding' },
  { pattern: /\bThat being said,?\s*/gi, replacement: '', reason: 'Robotic transition' },
  { pattern: /\bWith that in mind,?\s*/gi, replacement: '', reason: 'Robotic transition' },
  { pattern: /\bMoving forward,?\s*/gi, replacement: '', reason: 'Corporate speak' },
  { pattern: /\bNeedless to say,?\s*/gi, replacement: '', reason: 'Filler phrase' },
  
  // Weak hedging
  { pattern: /\bIt's important to (note|remember) that\s*/gi, replacement: '', reason: 'Weak hedging' },
  { pattern: /\bIt should be (noted|mentioned) that\s*/gi, replacement: '', reason: 'Weak hedging' },
  { pattern: /\bOne (could|might) argue that\s*/gi, replacement: '', reason: 'Weak hedging' },
  
  // Conclusion starters (remove entirely - content should end naturally)
  { pattern: /\bIn conclusion,?\s*/gi, replacement: '', reason: 'AI conclusion marker' },
  { pattern: /\bTo sum(marize)? up,?\s*/gi, replacement: '', reason: 'AI conclusion marker' },
  { pattern: /\bAll in all,?\s*/gi, replacement: '', reason: 'AI conclusion marker' },
  { pattern: /\bAt the end of the day,?\s*/gi, replacement: '', reason: 'Cliché' },
  { pattern: /\bThe bottom line is,?\s*/gi, replacement: '', reason: 'AI conclusion marker' },
  { pattern: /\bTo wrap (things )?up,?\s*/gi, replacement: '', reason: 'AI conclusion marker' },
  
  // Generic hype words (replace with nothing or remove)
  { pattern: /\bgame-?chang(er|ing)\b/gi, replacement: 'major', reason: 'Overused hype' },
  { pattern: /\bgroundbreaking\b/gi, replacement: 'new', reason: 'Overused hype' },
  { pattern: /\brevolutionary\b/gi, replacement: 'new', reason: 'Overused hype' },
  { pattern: /\bparadigm shift\b/gi, replacement: 'change', reason: 'Corporate speak' },
  { pattern: /\bcutting-?edge\b/gi, replacement: 'new', reason: 'Overused hype' },
  { pattern: /\bunlock the power\b/gi, replacement: 'use', reason: 'Marketing speak' },
  { pattern: /\bleverage\b/gi, replacement: 'use', reason: 'Corporate speak' },
  { pattern: /\butilize\b/gi, replacement: 'use', reason: 'Unnecessarily formal' },
  { pattern: /\bsynergy\b/gi, replacement: '', reason: 'Corporate speak' },
  { pattern: /\bseamless(ly)?\b/gi, replacement: 'smooth', reason: 'Marketing speak' },
  
  // Weak endings
  { pattern: /\bThoughts\?\s*$/gi, replacement: '', reason: 'Weak CTA' },
  { pattern: /\bWhat do you think\?\s*$/gi, replacement: '', reason: 'Generic CTA' },
  { pattern: /\bLet me know[!.]?\s*$/gi, replacement: '', reason: 'Weak CTA' },
  { pattern: /\bAny feedback welcome[!.]?\s*$/gi, replacement: '', reason: 'Weak CTA' },
  
  // Character count metadata (should never be in final output)
  { pattern: /\[\d+\s*chars?\]/gi, replacement: '', reason: 'Metadata leak' },
  { pattern: /\(\d+\s*characters?\)/gi, replacement: '', reason: 'Metadata leak' },
  { pattern: /\s*[—-]\s*\d+\s*characters?\s*$/gm, replacement: '', reason: 'Metadata leak' },
  { pattern: /\s*\|\s*\d+\s*chars?\s*$/gm, replacement: '', reason: 'Metadata leak' },
  
  // Analysis markers that shouldn't be in output
  { pattern: /^\*Hook Analysis:.*$/gm, replacement: '', reason: 'Analysis leak' },
  { pattern: /^\*Why this works:.*$/gm, replacement: '', reason: 'Analysis leak' },
  { pattern: /^\*Algorithm Score:.*$/gm, replacement: '', reason: 'Analysis leak' },
  { pattern: /^\*Character count:.*$/gm, replacement: '', reason: 'Analysis leak' },
];

/**
 * Phrases that indicate AI slop - flag for review but don't auto-replace
 */
const WARNING_PATTERNS = [
  /\bdeep dive\b/i,
  /\brobust\b/i,
  /\becosystem\b/i,
  /\bholistic\b/i,
  /\bimpactful\b/i,
  /\bactionable insights?\b/i,
  /\bvalue proposition\b/i,
  /\bsolution\b/i, // Often corporate speak
  /\bempower(s|ed|ing)?\b/i,
  /\btransformative\b/i,
];

/**
 * Clean a single piece of content by removing AI patterns
 */
export function cleanContent(content: string): { cleaned: string; changes: string[] } {
  let cleaned = content;
  const changes: string[] = [];
  
  // Apply all removal patterns
  for (const { pattern, replacement, reason } of REMOVAL_PATTERNS) {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (before !== cleaned) {
      changes.push(reason);
    }
  }
  
  // Clean up resulting whitespace issues
  cleaned = cleaned
    // Multiple spaces to single
    .replace(/  +/g, ' ')
    // Multiple newlines to double
    .replace(/\n{3,}/g, '\n\n')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim overall
    .trim();
  
  // Fix sentences that now start lowercase after removal
  cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (_, punct, char) => punct + char.toUpperCase());
  
  // Fix start of content if it now starts lowercase
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return { cleaned, changes };
}

/**
 * Check content for warning patterns (things to review, not auto-fix)
 */
export function getContentWarnings(content: string): string[] {
  const warnings: string[] = [];
  
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(content)) {
      const match = content.match(pattern);
      if (match) {
        warnings.push(`Contains "${match[0]}" - consider if this sounds corporate`);
      }
    }
  }
  
  // Check for weak opening
  const firstLine = content.split('\n')[0].toLowerCase();
  const weakOpeners = ['i think', 'in my opinion', 'i believe', 'just wanted to'];
  if (weakOpeners.some(phrase => firstLine.startsWith(phrase))) {
    warnings.push('Weak opener - consider a bolder first line');
  }
  
  // Check for excessive emoji (using surrogate pair detection for compatibility)
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const emojiMatches = content.match(emojiRegex) || [];
  const emojiCount = emojiMatches.join('').length / 2; // Approximate count
  if (emojiCount > 5) {
    warnings.push(`${Math.floor(emojiCount)} emojis - might be excessive`);
  }
  
  // Check for hashtag spam
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount > 2) {
    warnings.push(`${hashtagCount} hashtags - algorithm penalizes more than 2`);
  }
  
  // Check for external links in main content
  if (/https?:\/\/[^\s]+/.test(content)) {
    warnings.push('Contains external link - consider moving to reply for better reach');
  }
  
  return warnings;
}

/**
 * Parse Claude's response to extract clean content variations
 */
export function parseAndCleanVariations(response: string): Array<{
  content: string;
  originalContent: string;
  changes: string[];
  warnings: string[];
}> {
  const results: Array<{
    content: string;
    originalContent: string;
    changes: string[];
    warnings: string[];
  }> = [];
  
  // Try to parse the --- delimited format first
  const delimiterRegex = /---\s*\n?(VARIATION\s*\d+|THREAD\s*\d+|\d+)?\s*\n([\s\S]*?)(?=\n---|\n*$)/gi;
  let match;
  
  while ((match = delimiterRegex.exec(response)) !== null) {
    const originalContent = match[2].trim();
    if (originalContent && originalContent.length > 10) {
      const { cleaned, changes } = cleanContent(originalContent);
      const warnings = getContentWarnings(cleaned);
      results.push({ content: cleaned, originalContent, changes, warnings });
    }
  }
  
  // If that didn't work, try the **Variation N** format
  if (results.length === 0) {
    const variationRegex = /\*\*(?:Variation|Option)\s+(\d+)[^*]*\*\*\s*([\s\S]*?)(?=\*\*(?:Variation|Option)\s+\d+|\*\*Recommendation|$)/gi;
    
    while ((match = variationRegex.exec(response)) !== null) {
      const originalContent = match[2].trim();
      if (originalContent && originalContent.length > 10) {
        const { cleaned, changes } = cleanContent(originalContent);
        const warnings = getContentWarnings(cleaned);
        results.push({ content: cleaned, originalContent, changes, warnings });
      }
    }
  }
  
  // Last resort - if nothing matched, clean the whole response
  if (results.length === 0 && response.trim().length > 10) {
    const { cleaned, changes } = cleanContent(response);
    const warnings = getContentWarnings(cleaned);
    results.push({ content: cleaned, originalContent: response, changes, warnings });
  }
  
  return results;
}

/**
 * Calculate a "humanness score" for content (0-100, higher is better)
 */
export function calculateHumannessScore(content: string): {
  score: number;
  breakdown: { category: string; score: number; feedback: string }[];
} {
  const breakdown: { category: string; score: number; feedback: string }[] = [];
  
  // Start at 100, deduct for issues
  let score = 100;
  
  // Check for AI patterns (severe deduction)
  const { changes } = cleanContent(content);
  const aiPatternDeduction = Math.min(changes.length * 10, 40);
  if (aiPatternDeduction > 0) {
    score -= aiPatternDeduction;
    breakdown.push({
      category: 'AI Patterns',
      score: 100 - aiPatternDeduction,
      feedback: `Found ${changes.length} AI pattern(s): ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? '...' : ''}`
    });
  } else {
    breakdown.push({ category: 'AI Patterns', score: 100, feedback: 'No obvious AI patterns detected' });
  }
  
  // Check for natural language markers (bonus)
  const humanMarkers = [
    /\bhere's the thing\b/i,
    /\bhonestly\b/i,
    /\bthe truth is\b/i,
    /\blook,\b/i,
    /\bokay so\b/i,
    /\bI was wrong\b/i,
    /\bnot gonna lie\b/i,
    /\breal talk\b/i,
  ];
  const humanMarkersFound = humanMarkers.filter(m => m.test(content)).length;
  const humanBonus = Math.min(humanMarkersFound * 5, 15);
  if (humanBonus > 0) {
    score += humanBonus;
    breakdown.push({
      category: 'Human Markers',
      score: 100 + humanBonus,
      feedback: `Found ${humanMarkersFound} natural language marker(s) - sounds authentic`
    });
  }
  
  // Check hook strength
  const firstLine = content.split('\n')[0];
  const strongHookPatterns = [
    /^\d+/, // Starts with number
    /^[A-Z][^.!?]{0,50}[.!?]$/, // Short punchy first line
    /^(Hot take|Unpopular opinion|Here's what|Nobody talks|The truth)/i,
  ];
  const hasStrongHook = strongHookPatterns.some(p => p.test(firstLine));
  if (hasStrongHook) {
    breakdown.push({ category: 'Hook Strength', score: 100, feedback: 'Strong opening hook' });
  } else {
    score -= 10;
    breakdown.push({ category: 'Hook Strength', score: 70, feedback: 'Opening could be more attention-grabbing' });
  }
  
  // Check for engagement drivers
  const hasQuestion = /\?/.test(content);
  const hasSpecificNumber = /\b\d{2,}\b/.test(content);
  const engagementScore = (hasQuestion ? 50 : 0) + (hasSpecificNumber ? 50 : 0);
  breakdown.push({
    category: 'Engagement Drivers',
    score: engagementScore,
    feedback: `${hasQuestion ? '✓ Has question' : '✗ No question'}${hasSpecificNumber ? ', ✓ Has specific numbers' : ', ✗ No specific numbers'}`
  });
  if (engagementScore < 100) {
    score -= (100 - engagementScore) / 5;
  }
  
  // Cap score at 100
  score = Math.min(100, Math.max(0, Math.round(score)));
  
  return { score, breakdown };
}
