/**
 * X/Twitter Algorithm Knowledge Base
 * Core understanding of how the algorithm ranks and distributes content
 */

export const ALGORITHM_KNOWLEDGE = `
## X ALGORITHM FUNDAMENTALS

### Engagement Weighting (What Actually Matters)
The algorithm weights engagement types very differently:

| Action | Weight | Strategic Implication |
|--------|--------|----------------------|
| Reply w/ author engagement | 75x | THE most valuable - spark conversations and reply back |
| Standard replies | 13.5x | Second most valuable - create reply bait |
| Profile clicks + engagement | 12x | Build curiosity and authority |
| Dwell time >2 min | 10-11x | Longer reads = strong quality signal |
| Bookmarks | ~5x | Signals save-worthy, high-value content |
| Retweets | 1-20x | Valuable but varies - make content shareable |
| Likes | 0.5x | Nearly worthless - don't optimize for these |

### The Two-Hour Window
- First 2 hours after posting are CRITICAL
- Algorithm tests your content on ~500 followers initially
- Strong early engagement = exponential distribution
- Weak early engagement = content dies

### What Triggers Algorithm Suppression
AVOID these patterns that kill reach:
- External links in the main post (put in reply instead)
- Engagement bait phrases ("like if you agree", "retweet this")
- Hashtag spam (max 1-2 relevant hashtags)
- Posting more than 3-4 times per hour
- Identical/similar content to recent posts
- Low follower-to-following ratio content promotion

### What Triggers Algorithm Boost
LEAN INTO these patterns:
- Native content (no external links in main post)
- Replies from the author to commenters (150x value when author engages back)
- Content that sparks conversation threads
- Images and native video
- Content in your established niche
- Consistent posting schedule (algorithm learns your patterns)

### Hook Importance
- 97% of scroll decisions happen in first 1.5 seconds
- First line must pattern-interrupt
- The "curiosity gap" keeps people reading
- Hooks that work: numbers, contrarian takes, specific outcomes, "I" statements with stakes

### Optimal Content Structure
1. **Hook** (first line): Stop the scroll, create curiosity
2. **Value** (middle): Deliver the insight/story/lesson
3. **CTA** (end): Question or prompt that drives replies

### Posting Frequency Guidelines
- Sweet spot: 2-4 quality posts per day
- Minimum for growth: 1 post per day
- Maximum before quality drops: 6-8 posts per day
- Best times: 8-10am, 12-1pm, 5-7pm (audience timezone)

### Thread-Specific Rules
- Optimal length: 5-15 tweets
- Each tweet must stand alone (some readers see individual tweets)
- Number your tweets for clarity
- Include image every 3-4 tweets
- End with discussion prompt or question
- First tweet of thread is MOST important (it's the hook for the whole thread)

### Reply Strategy (The 150x Multiplier)
When the author replies to comments:
- Algorithm treats this as 150x more valuable than a like
- Creates a "conversation" signal
- Boosts visibility of original post
- Reply within first 30 minutes for maximum impact
`;

export const ALGORITHM_WARNINGS = {
  externalLink: "External links in the main post reduce reach by 50-80%. Move to first reply.",
  tooManyHashtags: "More than 2 hashtags signals spam. Remove extras.",
  engagementBait: "Phrases like 'like if you agree' trigger algorithm suppression.",
  tooLong: "Tweets over 280 characters get less engagement on average.",
  noHook: "First line doesn't pattern-interrupt. Strengthen the hook.",
  noQuestion: "Posts ending with questions get 2x more replies.",
};

export const HOOK_PATTERNS = [
  "Number + Outcome: '7 ways I grew to 100K followers'",
  "Contrarian: 'Most advice about X is wrong'",
  "Story: 'I lost everything in 2019. Here's what happened next.'",
  "Curiosity gap: 'The one thing successful people never talk about'",
  "Specific result: 'This email template got me 47 responses'",
  "Challenge assumption: 'You don't need 10K followers to make money'",
  "Transformation: '[Time] ago I was [bad state]. Today I'm [good state]. Here's what changed:'",
  "Bold claim: 'Everything you've been told about X is wrong. Here's why.'",
  "Insider knowledge: 'I found a weird [topic] hack that no one talks about...'",
];

export const ENDING_CTA_PATTERNS = [
  // Questions that invite specific responses
  "Which of these surprised you most?",
  "What would you add to this list?",
  "Have you experienced this?",
  "What's your take?",
  
  // Statements that beg contradiction (stronger than questions)
  "And it's not even close.",
  "Fight me on this.",
  "Change my mind.",
  "The data doesn't lie.",
  
  // Soft CTAs that don't feel desperate
  "More threads like this → follow",
  "Save this for later.",
  "Bookmark if you found this useful.",
  
  // AVOID these weak endings
  // "Thoughts?" (too generic)
  // "Like and retweet!" (engagement bait)
  // "Follow for more!" (desperate)
  // "Let me know in the comments" (no urgency)
];
