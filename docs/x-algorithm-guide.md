# X (Twitter) Algorithm Reference Guide

> **Purpose**: Reference document for building an X content optimization app. Use this to understand how to structure tweets, threads, and articles for maximum algorithmic reach.

---

## Table of Contents
1. [Algorithm Overview](#algorithm-overview)
2. [Engagement Weightings](#engagement-weightings-critical)
3. [Content Boosters](#content-boosters)
4. [Content Penalties](#content-penalties)
5. [Optimal Content Structures](#optimal-content-structures)
6. [Implementation Guidelines](#implementation-guidelines-for-the-app)

---

## Algorithm Overview

### The Three-Stage Pipeline

The X algorithm processes content through three stages:

1. **Candidate Sourcing**: Pulls ~1,500 potential posts per user
   - 50% from accounts the user follows (In-Network)
   - 50% from accounts they don't follow (Out-of-Network)

2. **Ranking**: A ~48M parameter neural network scores each candidate based on predicted engagement likelihood

3. **Filtering**: Removes spam, applies user preferences (mutes, blocks), ensures author diversity

### Key Models

| Model | Purpose |
|-------|---------|
| **RealGraph** | Predicts engagement likelihood between two users based on interaction history |
| **SimClusters** | Groups users into interest communities for out-of-network recommendations |
| **TweepCred** | PageRank-like credibility score for users |

### Critical Timing

**The first 30 minutes after posting are crucial.** Early engagement velocity heavily influences whether content gets broader distribution.

---

## Engagement Weightings (CRITICAL)

These are the official weighting factors from X's documentation. **This is the most important section for content optimization.**

| Signal | Weight | Description |
|--------|--------|-------------|
| Reply that gets author engagement | **+75** | User replies AND the author responds to that reply |
| Reply | **+13.5** | User replies to the tweet |
| Profile visit + engagement | **+12.0** | User visits author profile and likes/replies to a tweet |
| Conversation click + engagement | **+11.0** | User clicks into conversation and replies or likes |
| Conversation dwell time (2+ min) | **+10.0** | User clicks into conversation and stays 2+ minutes |
| Retweet | **+1.0** | User retweets the post |
| Like | **+0.5** | User likes the post |
| Video watch (50%+) | **+0.005** | User watches at least half of a video |

### Key Insight

**Replies are worth 150x more than likes when the author engages back.**

The hierarchy:
1. Conversation (replies with author engagement) = GOLD
2. Replies alone = HIGH VALUE
3. Retweets = MODERATE VALUE
4. Likes = LOW VALUE (baseline)

---

## Content Boosters

### Confirmed Algorithmic Boosts

| Factor | Impact | Notes |
|--------|--------|-------|
| **Video content** | HIGH | Especially if users watch >10 seconds |
| **Images/GIFs** | MODERATE | Visual content outperforms text-only |
| **Verified/Premium account** | MODERATE | Blue checkmark provides reach boost |
| **Author replies to comments** | VERY HIGH | Replying to your own post's comments = +75 weight signal |
| **Native media** | HIGH | Upload directly vs. linking to external platforms |
| **Trending topic participation** | HIGH | Timely relevance to current conversations |
| **Hashtags (strategic)** | LOW-MODERATE | 1-2 relevant hashtags; more can hurt |
| **Questions that prompt replies** | HIGH | Triggers the high-value reply signals |
| **Threads** | MODERATE | Multi-tweet threads that spark conversation |
| **Quote tweets** | HIGHER THAN RT | Adds commentary, signals thoughtful engagement |

### Content Formats Ranked

1. **Native video** (highest boost)
2. **Image carousels** (multiple images)
3. **Single image + text**
4. **Text-only (engaging/question-based)**
5. **Text with external link** (penalized)

---

## Content Penalties

### Confirmed Algorithmic Penalties

| Factor | Penalty | Notes |
|--------|---------|-------|
| **External links** | SIGNIFICANT | X wants users to stay on platform |
| **"Offensive" text** | ~80% reach reduction | Unclear exact definition |
| **Reports from users** | SEVERE | Catastrophic to reach |
| **Blocks/mutes from users** | SEVERE | Signals negative experience |
| **"Show less often" clicks** | HIGH | User explicitly downranking |
| **Spam patterns** | SEVERE | Repetitive posts, mass following/unfollowing |
| **All caps text** | MODERATE | Perceived as spam-like |
| **Excessive hashtags** | MODERATE | More than 2-3 looks spammy |
| **Repetitive content** | HIGH | Posting same/similar content repeatedly |

### Shadowban Triggers

Patterns that may trigger algorithmic filtering:
- Spam URLs
- Excessive hashtags
- Potentially offensive language
- High volume of follows/likes in short time
- Being blocked/reported frequently

---

## Optimal Content Structures

### Single Tweet Best Practices

```
Structure:
1. Hook (first line) - attention-grabbing, creates curiosity
2. Value/insight - the main point
3. Call-to-action - question or prompt for engagement

Optimal length: Long enough to provide value, short enough to be scannable
Character limit: 280 (standard) / 4,000 (Premium long-form)

Include:
- Native image or video when relevant
- 1-2 relevant hashtags (optional)
- Question to prompt replies

Avoid:
- External links in main tweet (put in reply if needed)
- All caps
- Excessive hashtags
- Generic/repetitive phrasing
```

### Thread Best Practices

```
Structure:
1. Tweet 1 (Hook): Promise value, create curiosity, use "🧵" or "Thread:" signal
2. Tweet 2-N (Body): Deliver value, one idea per tweet, use numbering
3. Final Tweet: Summary + CTA for engagement

Optimal length: 5-15 tweets (enough value, not exhausting)

Best practices:
- Number tweets (1/, 2/, etc.) for readability
- Each tweet should stand alone if shared individually
- Include visuals every 3-4 tweets to break up text
- End with a question or discussion prompt
- Reply to your own thread to boost engagement
```

### Long-Form Article Best Practices (X Premium)

```
Structure:
- Headline: Clear, benefit-driven
- Opening hook: First 2-3 sentences must grab attention
- Subheadings: Break up content for scannability
- Visuals: Include images throughout
- Conclusion: Strong CTA

Best practices:
- Front-load value (algorithm measures early engagement)
- Use data/statistics for credibility
- Include original insights, not just summaries
- End with engagement prompt
```

---

## Implementation Guidelines for the App

### Core Features to Build

1. **Tweet Optimizer**
   - Input: User's raw text/idea
   - Output: Optimized tweet with hook, value, CTA structure
   - Check: Link placement warning, hashtag count, length

2. **Thread Generator**
   - Input: Long-form content or topic
   - Output: Structured thread with numbered tweets
   - Include: Hook tweet, value tweets, closer with engagement prompt
   - Suggest: Image placement points

3. **Content Scorer**
   - Analyze draft content against algorithm factors
   - Score: Engagement potential (based on structure, not content quality)
   - Warnings: Penalty triggers (links, caps, hashtags)
   - Suggestions: Ways to improve algorithmic performance

4. **Timing Optimizer**
   - Suggest posting times based on audience activity
   - Remind: First 30 minutes are critical

### Scoring Model Suggestions

```
Base score: 50

Add points:
+15: Contains native image/video
+10: Ends with question or CTA
+10: Hook in first line (pattern: curiosity gap, bold claim, or "Here's...")
+5: 1-2 hashtags
+5: Mentions/tags relevant accounts (not spam)
+10: Thread format (for longer content)

Subtract points:
-20: Contains external link in main tweet
-10: More than 3 hashtags
-15: All caps anywhere
-10: Repetitive phrasing from recent posts
-5: No visual content (for promotional posts)
```

### Content Templates

**Data/Insight Tweet:**
```
[Bold claim or surprising stat]

[Context/explanation in 1-2 sentences]

[Why this matters]

[Question to prompt discussion]

[Optional: 1-2 hashtags]
```

**Thread Opener:**
```
[Topic] is [counterintuitive claim or big promise]

Here's what [data source/experience] reveals:

🧵
```

**Engagement Tweet:**
```
[Statement that invites opinion]

[Your take in 1-2 sentences]

What do you think? [Specific question]
```

### API Considerations

If integrating with X API:
- Post timing: Schedule for user's audience active hours
- Analytics: Track early engagement velocity
- A/B testing: Test different hooks/structures

---

## Source Documentation

- **Official**: [X Open Source Algorithm (GitHub)](https://github.com/twitter/the-algorithm)
- **X Engineering Blog**: blog.x.com/engineering (Twitter Recommendation Algorithm post)
- **Social Media Today Analysis**: socialmediatoday.com (weighting factors breakdown, Sept 2025)

---

## Quick Reference Card

### Do This:
- ✅ Include images/video (native upload)
- ✅ End with questions
- ✅ Reply to comments on your posts
- ✅ Post during audience active hours
- ✅ Use threads for longer content
- ✅ Front-load hooks and value

### Don't Do This:
- ❌ External links in main tweet
- ❌ All caps
- ❌ 3+ hashtags
- ❌ Repetitive content
- ❌ Ignore comments (reply = +75 signal)
- ❌ Post and disappear (stay engaged first 30 min)

### The Golden Rule

**Optimize for conversation, not just impressions.** 

A tweet with 5 replies you respond to is worth more algorithmically than a tweet with 500 likes and no replies.
