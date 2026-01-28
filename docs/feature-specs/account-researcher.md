# Feature Spec: Account Researcher
*Partial functionality without X API, full with API*

## Overview
Analyze any X account to understand their content strategy, what works, and why. Competitive intelligence for content creators.

## Capabilities by API Access

### Without X API (MVP)
- User manually pastes 10-20 tweets from target account
- AI analyzes patterns, hooks, topics
- Limited but still valuable

### With X API Basic ($100/mo)
- Auto-fetch last 200 tweets from any public account
- Engagement metrics included
- Full pattern analysis

### With X API Pro ($5k/mo)
- Historical data beyond 200 tweets
- Follower/following analysis
- Engagement graph

## User Flow

### Entry Point
New page: `/research` or sidebar item "Account Research"

### Without API Flow
1. Enter target @handle
2. Prompt: "Paste 10-20 of their best tweets"
3. AI analyzes the pasted content
4. Results displayed

### With API Flow
1. Enter target @handle
2. Click "Analyze"
3. System fetches tweets automatically
4. Results displayed (richer data)

## Analysis Output

### Profile Overview
```
@elonmusk
━━━━━━━━━━━━━━━━━━━━━━━━━━
Followers: 180M | Following: 500
Posts analyzed: 200
Avg engagement: 50K likes, 5K replies
Posting frequency: 15x/day
```

### Content Patterns
```
Top Topics (by engagement)
1. AI/Technology - 35% of posts, 2x avg engagement
2. SpaceX updates - 20% of posts, 1.5x avg engagement  
3. Memes/humor - 25% of posts, 3x avg engagement
4. Tesla news - 15% of posts, 1.2x avg engagement
```

### Hook Analysis
```
Most Effective Hooks:
• Questions: "What if..." "Why don't..."
• Contrarian: "Unpopular opinion:"
• Numbers: "3 things..." "In 2024..."
• Direct statements: Short, punchy assertions

Avg hook length: 42 characters
First word patterns: "The", "I", "What", "Just"
```

### Posting Patterns
```
Best Days: Tuesday, Thursday, Saturday
Best Times: 9-11am, 7-9pm EST
Avg posts per day: 8-15
Thread frequency: 2x/week
```

### Voice Profile
```
Tone: Casual, direct, occasionally provocative
Emoji usage: Moderate (🔥 🚀 most common)
Humor: Frequent memes and jokes
Technical depth: Varies by topic
Sentence length: Short (avg 12 words)
```

### Engagement Insights
```
What drives replies:
- Questions at end of posts
- Controversial statements
- Asking for opinions

What drives retweets:
- Useful information
- Funny content
- Breaking news

What drives likes:
- Inspirational content
- Relatable observations
```

### Actionable Recommendations
```
To create content like @handle:

1. Post more frequently (they do 15x/day)
2. Use shorter hooks (avg 42 chars)
3. Include more humor/memes
4. Ask questions to drive replies
5. Post between 9-11am for best reach
```

## Technical Implementation

### New Components
```
src/app/research/page.tsx
src/app/api/research/analyze/route.ts
src/lib/account-analyzer.ts
```

### Database (for caching)
```sql
create table account_analyses (
  id uuid primary key,
  handle text not null,
  analysis jsonb not null,
  tweets_analyzed int,
  analyzed_at timestamptz default now(),
  user_id uuid references profiles
);

-- Cache for 24 hours
create index on account_analyses (handle, analyzed_at);
```

### Without API - Prompt
```
Analyze these tweets from @${handle}:

"""
${pastedTweets}
"""

Provide analysis of:
1. Top topics and themes
2. Hook patterns (how they start posts)
3. Voice characteristics
4. What seems to drive engagement
5. Actionable recommendations for someone wanting to create similar content

Output as structured JSON.
```

### With API - Process
1. Fetch tweets via X API v2
2. Include engagement metrics (likes, replies, retweets)
3. Filter to last 30 days or 200 tweets
4. Calculate averages and patterns
5. Feed to Claude for qualitative analysis

## MVP (No API) Limitations
- Manual paste required
- No engagement metrics (unless user includes them)
- Limited sample size
- No automated updates

## Success Metrics
- Accounts analyzed per user
- Recommendations acted on
- Return visits to analysis
- Upgrade conversion (if gated to premium)

## Estimated Effort

### MVP (No API)
- Frontend: 4-5 hours
- Backend/API: 3-4 hours
- Prompts: 3-4 hours
- Testing: 2 hours
- **Total: ~2 days**

### Full (With API)
- X API integration: 4-6 hours
- Data processing: 4-6 hours
- Enhanced UI: 3-4 hours
- **Total: +2 days on top of MVP**

## Monetization Potential
- Free: 3 analyses/month
- Premium: Unlimited analyses
- Feature is sticky - users come back to check competitors
