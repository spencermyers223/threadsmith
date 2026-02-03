# xthread Feature Build Plan - February 2026

## 🎯 Four Features to Build

| # | Feature | Location | Cost | Complexity |
|---|---------|----------|------|------------|
| 1 | Repurpose Mode | Creator Hub → 5th mode | Free | Medium |
| 2 | Viral Examples | Templates → new category | Free | Low |
| 3 | Account Researcher | Analytics → replaces Marketplace | 5 credits | High |
| 4 | Account Overview | Analytics → new tab | Free | Medium |

---

## 📋 Implementation Order

**Order: 3 → 4 → 2 → 1**

### Why this order:
1. **Account Researcher (3)** - Most complex, creates shared patterns/APIs for others
2. **Account Overview (4)** - Reuses patterns from Account Researcher
3. **Viral Examples (2)** - UI-only changes to existing component
4. **Repurpose Mode (1)** - Cleanest new component, builds on existing infra

---

## Feature 1: Repurpose Mode

### What it does
- Users save tweets they love (via extension or paste URL)
- Generate new content in their voice based on saved inspiration
- Output → Draft or Calendar (maintains existing flow)

### Files to create/modify
```
src/components/creator-hub/RepurposeMode.tsx  (NEW)
src/app/creator-hub/page.tsx                  (ADD 5th tab)
src/app/api/repurpose/route.ts                (NEW - generate from source tweet)
src/app/api/repurpose/save/route.ts           (NEW - save inspiration tweet)
```

### Database
```sql
CREATE TABLE saved_inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  x_account_id UUID REFERENCES x_accounts(id),
  tweet_url TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  author_username TEXT,
  author_name TEXT,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, tweet_url)
);
```

### UI Components
- Paste tweet URL input
- Saved inspirations grid (like templates)
- "Repurpose This" button → calls generate API with source context
- Output preview with Draft/Calendar actions

---

## Feature 2: Viral Examples

### What it does
- New category within Templates: "🔥 Viral Examples"
- Real viral tweets with metrics + attribution
- "Why it worked" AI analysis
- [Use This Format] → extracts structure, opens in Brain Dump
- [Repurpose This] → opens in Repurpose Mode

### Files to modify
```
src/components/creator-hub/TemplatesMode.tsx  (ADD viral tab)
Database: post_templates                       (ADD entries with category='viral')
```

### Database entries (examples)
```sql
INSERT INTO post_templates (title, category, description, prompt_template, why_it_works, content_type, metadata) VALUES
('The Unexpected Truth', 'viral', 'Reveal a counterintuitive insight', 
 'Write a tweet that reveals an unexpected truth about {{topic}}. Use the format: "[Common belief] is wrong. Here''s why: [counterintuitive insight]"',
 'Challenges assumptions, creates curiosity, positions author as contrarian thinker',
 'post',
 '{"example_tweet": "Working harder is wrong. The top 1% work less but think more. Here''s why...", "example_likes": 47000, "example_author": "@naval"}');
```

### UI Changes
- Add "🔥 Viral Examples" tab alongside "Single Posts" and "Threads"
- Show real tweet example with metrics
- Highlight "Why it works" section
- Two CTAs: [Use Format] and [Repurpose]

---

## Feature 3: Account Researcher

### What it does
- Enter @username → Pay 5 credits → Get full AI analysis
- Returns: Top 5 tweets + strategy + voice + engagement patterns
- Saved to "My Analyzed Accounts" library
- [+ Add to Style Profiles] button connects to Customization
- **Replaces** old Marketplace pull tweets feature
- **Merges** style profile analysis (no more separate 5-credit charge)

### Files to create/modify
```
src/components/analytics/AccountResearcher.tsx    (NEW - replaces Marketplace)
src/app/api/account-analysis/route.ts             (NEW - full analysis endpoint)
src/app/api/account-analysis/[id]/route.ts        (NEW - get saved analysis)
src/app/analytics/page.tsx                         (UPDATE tabs)
```

### Database
```sql
CREATE TABLE account_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  x_account_id UUID REFERENCES x_accounts(id),
  analyzed_username TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- The full analysis
  top_tweets JSONB,          -- Array of top 5 tweets with metrics
  strategy_analysis JSONB,   -- Content strategy breakdown
  voice_analysis JSONB,      -- Voice & style patterns
  engagement_patterns JSONB, -- What works, best times, etc.
  tactics_to_steal JSONB,    -- Actionable recommendations
  
  -- Metadata
  tweets_fetched INTEGER,
  credits_used INTEGER DEFAULT 5,
  
  -- Style profile link
  style_template_id UUID REFERENCES style_templates(id),
  
  UNIQUE(user_id, analyzed_username)
);
```

### Analysis Output Structure
```typescript
interface AccountAnalysis {
  username: string;
  analyzedAt: string;
  
  topTweets: Array<{
    text: string;
    likes: number;
    retweets: number;
    url: string;
    whyItWorks: string;
  }>;
  
  strategy: {
    postingFrequency: string;
    contentMix: string;       // "60% insights, 30% threads, 10% engagement"
    bestPerformingTypes: string[];
    threadFrequency: string;
  };
  
  voice: {
    summary: string;
    toneMarkers: string[];
    sentenceStyle: string;
    hookTechniques: string[];
    signatureMoves: string[];
  };
  
  engagement: {
    bestDays: string[];
    avgLikes: number;
    avgRetweets: number;
    threadVsTweetRatio: number;
    topTopics: string[];
  };
  
  tacticsToSteal: string[];  // 5-7 actionable recommendations
}
```

### Credit Model
- Cost: 5 credits ($1.00)
- Actual cost: ~$0.56 (100 tweets + Claude analysis)
- Margin: 44%
- Cached: Analyses saved permanently, no re-charge to view

---

## Feature 4: Account Overview

### What it does
- AI analysis of YOUR OWN account
- Pattern recognition: "Your threads get 3x engagement"
- Best posting times for YOUR audience
- Content recommendations based on YOUR history
- Comparison to baseline (optional)

### Files to create/modify
```
src/components/analytics/AccountOverview.tsx  (NEW)
src/app/api/account-overview/route.ts         (NEW)
src/app/analytics/page.tsx                     (UPDATE - add tab)
```

### Analysis Output
```typescript
interface PersonalOverview {
  insights: Array<{
    type: 'pattern' | 'recommendation' | 'comparison';
    title: string;
    description: string;
    metric?: string;
  }>;
  
  bestPerforming: {
    contentType: string;     // "Threads" or "Single tweets"
    topic: string;           // "AI tools"
    postingTime: string;     // "Tuesday 10am"
  };
  
  recommendations: string[]; // 3-5 specific suggestions
  
  weeklyTrends: {
    avgLikes: number;
    avgRetweets: number;
    topPost: { text: string; likes: number };
  };
}
```

### Cost: FREE
- Uses tweets already fetched in "Your Analytics" tab
- No additional X API calls needed
- Just Claude analysis of existing data

---

## 🏗️ Build Sequence

### Phase 1: Account Researcher (Est: 2-3 hours)
1. Create `account_analyses` table migration
2. Build `/api/account-analysis/route.ts` 
3. Build `AccountResearcher.tsx` component
4. Update `analytics/page.tsx` to replace Marketplace tab
5. Add "My Analyzed Accounts" library view
6. Connect [Add to Style Profiles] button

### Phase 2: Account Overview (Est: 1-2 hours)
1. Build `/api/account-overview/route.ts`
2. Build `AccountOverview.tsx` component
3. Add as middle tab in Analytics

### Phase 3: Viral Examples (Est: 1 hour)
1. Add viral example entries to `post_templates`
2. Update `TemplatesMode.tsx` to add Viral tab
3. Style the example cards with metrics

### Phase 4: Repurpose Mode (Est: 2 hours)
1. Create `saved_inspirations` table
2. Build `/api/repurpose/` endpoints
3. Build `RepurposeMode.tsx` component
4. Add as 5th tab in Creator Hub
5. Connect extension (later)

---

## 🚦 Ready to Build

Starting with **Account Researcher** - the foundation piece.
