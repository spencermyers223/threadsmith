# Feature Spec: Enhanced Algorithm Scoring
*No X API required - Improvement to existing feature*

## Overview
Expand our current 6-metric scoring to 9 metrics to match/exceed CreatorBuddy's algorithm analyzer. All client-side, instant feedback.

## Current Scoring (6 metrics)
From `/lib/engagement-scorer.ts`:
1. Hook Strength
2. Reply Potential
3. Length
4. Readability
5. Hashtag Usage
6. Emoji Usage

## New Metrics (3 additions)

### 7. Thread Structure Score
For multi-tweet content:
- First tweet quality (is it a strong hook?)
- Tweet-to-tweet flow (are transitions smooth?)
- Standalone value (can each tweet work alone?)
- Numbering/formatting (1/7, 2/7, etc.)
- CTA placement (is there a clear ending?)

```javascript
function scoreThreadStructure(tweets: string[]): ScoreDetail {
  let score = 50;
  
  // First tweet must be strong hook
  const firstTweetHook = scoreHookStrength(tweets[0]);
  score += (firstTweetHook.score - 50) * 0.3; // 30% weight
  
  // Each tweet should be <280 chars
  const allFitLimit = tweets.every(t => t.length <= 280);
  if (allFitLimit) score += 15;
  
  // Has numbering (1/, 2/ or 1/7, 2/7)
  const hasNumbering = tweets.some(t => /^\d+[\/\.]/.test(t.trim()));
  if (hasNumbering) score += 10;
  
  // Last tweet has CTA/question
  const lastTweet = tweets[tweets.length - 1];
  const hasCTA = /\?|share|follow|comment|reply|thoughts/i.test(lastTweet);
  if (hasCTA) score += 15;
  
  // Varied sentence starters (not all starting same way)
  const starters = tweets.map(t => t.trim().split(' ')[0]);
  const uniqueStarters = new Set(starters).size;
  if (uniqueStarters >= tweets.length * 0.7) score += 10;
  
  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    label: getLabel(score),
    suggestion: score < 70 
      ? 'Number your tweets (1/, 2/) and end with a question'
      : null
  };
}
```

### 8. Media Suggestion Score
Whether the content would benefit from images/media:

```javascript
function scoreMediaSuggestion(text: string): ScoreDetail {
  let score = 60; // Neutral default
  let suggestion = null;
  
  // Content about data/numbers benefits from charts
  const hasNumbers = /\d+%|\d+x|\$\d+|\d+k|\d+m/i.test(text);
  if (hasNumbers) {
    score = 40;
    suggestion = 'Consider adding a chart or screenshot with this data';
  }
  
  // Comparisons benefit from visuals
  const hasComparison = /vs\.|versus|compared to|better than|worse than/i.test(text);
  if (hasComparison) {
    score = 45;
    suggestion = 'A side-by-side comparison image would boost engagement';
  }
  
  // Step-by-step content benefits from screenshots
  const hasSteps = /step \d|first,|second,|then,|finally,/i.test(text);
  if (hasSteps) {
    score = 35;
    suggestion = 'Screenshots of each step would make this more engaging';
  }
  
  // Lists benefit from visual formatting
  const hasList = (text.match(/^[-•*]/gm) || []).length >= 3;
  if (hasList) {
    score = 50;
    suggestion = 'Consider a formatted image for better visual hierarchy';
  }
  
  // Already mentions image/screenshot
  const mentionsMedia = /screenshot|image|pic|photo|video|chart|graph/i.test(text);
  if (mentionsMedia) {
    score = 85;
    suggestion = null;
  }
  
  return {
    score,
    label: getLabel(score),
    suggestion
  };
}
```

### 9. CTA Quality Score
How strong is the call-to-action?

```javascript
function scoreCTAQuality(text: string): ScoreDetail {
  let score = 30; // Low if no CTA
  let suggestion = 'Add a question or call-to-action at the end';
  
  const lastSentence = text.split(/[.!?]/).filter(s => s.trim()).pop() || '';
  
  // Direct question (best for replies)
  if (/\?$/.test(text.trim())) {
    score = 85;
    
    // Open-ended questions are better than yes/no
    const isOpenEnded = /^(what|why|how|where|when|who|which)/i.test(lastSentence.trim());
    if (isOpenEnded) {
      score = 95;
      suggestion = null;
    } else {
      suggestion = 'Open-ended questions (what, why, how) get more replies';
    }
  }
  
  // Engagement prompts
  const hasEngagementPrompt = /reply|comment|share|drop|tell me|let me know|thoughts\??/i.test(lastSentence);
  if (hasEngagementPrompt && score < 80) {
    score = 75;
    suggestion = 'Good prompt, but a question would be stronger';
  }
  
  // Soft CTAs
  const hasSoftCTA = /agree|disagree|debate|discuss|change my mind/i.test(lastSentence);
  if (hasSoftCTA && score < 70) {
    score = 70;
    suggestion = null;
  }
  
  // Follow/subscribe asks (lower quality)
  const hasFollowAsk = /follow|subscribe|like this/i.test(lastSentence);
  if (hasFollowAsk) {
    score = 40;
    suggestion = 'Follow asks feel spammy. Ask a question instead.';
  }
  
  return {
    score,
    label: getLabel(score),
    suggestion
  };
}
```

## Updated Overall Score Calculation

```javascript
// Current weights
const weights = { 
  hook: 25, 
  reply: 30, 
  length: 15, 
  readability: 10, 
  hashtag: 10, 
  emoji: 10 
};

// New weights (9 metrics)
const newWeights = {
  hook: 20,           // Still important
  reply: 15,          // Reduced (CTA quality overlaps)
  length: 10,         // Slightly reduced
  readability: 10,    // Same
  hashtag: 5,         // Reduced
  emoji: 5,           // Reduced
  threadStructure: 10, // NEW - only for threads
  mediaSuggestion: 10, // NEW
  ctaQuality: 15       // NEW
};

// Thread structure only applies to multi-tweet content
// For single tweets, redistribute its weight to others
```

## UI Updates

### Engagement Panel Enhancement
```
┌─────────────────────────────────────┐
│ Engagement Score: 78/100           │
├─────────────────────────────────────┤
│ ▰▰▰▰▰▰▰▱▱▱ Hook Strength     70    │
│ ▰▰▰▰▰▰▰▰▰▱ Reply Potential   90    │
│ ▰▰▰▰▰▰▰▰▱▱ Length            80    │
│ ▰▰▰▰▰▰▱▱▱▱ Readability       65    │
│ ▰▰▰▰▰▰▰▰▰▰ Hashtags          100   │
│ ▰▰▰▰▰▰▰▱▱▱ Emoji             70    │
│ ▰▰▰▰▰▱▱▱▱▱ Media Suggestion  50    │ NEW
│ ▰▰▰▰▰▰▰▰▱▱ CTA Quality       80    │ NEW
├─────────────────────────────────────┤
│ 💡 Add a chart for your data points│
│ 💡 Open-ended questions get 3x more │
│    replies than yes/no questions    │
└─────────────────────────────────────┘
```

## Implementation

### Files to Modify
```
src/lib/engagement-scorer.ts        # Add 3 new scoring functions
src/components/workspace/EngagementPanel.tsx  # Update UI
src/app/api/engagement/score/route.ts  # Update AI analysis prompt
```

### Backwards Compatibility
- Existing scores still work
- New metrics are additive
- UI gracefully handles missing metrics

## Success Metrics
- User engagement with scoring feature
- Score improvements over time
- Posts with higher scores getting better engagement (if we track)

## Estimated Effort
- New scoring functions: 3-4 hours
- UI updates: 2-3 hours
- Testing/tuning: 2 hours
- **Total: ~1 day**
