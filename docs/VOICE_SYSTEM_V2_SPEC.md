# Voice System V2 — Specification

**Date:** 2026-02-02  
**Status:** Ready to Build  
**Authors:** Spencer + Jarvis

---

## Overview

A redesigned voice system that gives users explicit control over their writing style through:
1. **Saved Posts** — 5 hand-picked tweets that define their voice (few-shot examples)
2. **Style Profiles** — Up to 3 admired accounts analyzed for style patterns (optional per-generation)

---

## Core Concepts

### Saved Posts (Voice Tweets)
- User manually adds up to **5 tweets** to their voice library
- Can be their own tweets OR tweets from others they admire
- Added via **extension** (one-click while browsing) or **paste URL** in settings
- These are injected **directly into the prompt** as few-shot examples
- User has full control — what they add is exactly what gets used

### Style Profiles (Admired Accounts)
- User can add up to **3 admired accounts**
- We pull **100 tweets** from each account
- Filter to **top 10 by engagement**
- Extract **style patterns** (not raw tweets): length, emoji, hooks, tone, etc.
- Patterns are stored as structured data
- User selects **one (or none)** per generation to incorporate

---

## Data Model

### voice_library (new table)
```sql
CREATE TABLE voice_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  tweet_text text NOT NULL,
  tweet_url text,
  author_username text, -- whose tweet this is
  is_own_tweet boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- Max 5 per user enforced at application level
```

### style_profiles (new table)
```sql
CREATE TABLE style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  account_username text NOT NULL,
  account_display_name text,
  profile_data jsonb NOT NULL, -- extracted patterns
  tweets_analyzed int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, account_username)
);
-- Max 3 per user enforced at application level
```

### profile_data JSON structure
```json
{
  "summary": "Punchy, contrarian takes with zero fluff",
  "patterns": {
    "avgLength": 92,
    "lengthRange": [60, 140],
    "emojiUsage": "never",
    "emojiPosition": null,
    "hookStyles": ["bold claim", "contrarian opener", "number lead"],
    "toneMarkers": ["direct", "confident", "provocative"],
    "sentenceStyle": "short, punchy, fragments OK",
    "questionUsage": "rare, rhetorical only",
    "hashtagUsage": "never",
    "ctaStyle": "implicit"
  },
  "topTweets": [
    {"text": "...", "likes": 12453},
    {"text": "...", "likes": 8291}
  ]
}
```

---

## User Interface

### Settings Page — Voice Section

```
┌─────────────────────────────────────────────────────────────┐
│ VOICE SETTINGS                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SAVED POSTS (3/5)                                           │
│ These tweets are injected directly into every generation.   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ "Example tweet text here..."                            │ │
│ │ @yourusername · [Remove]                                │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ "Another saved tweet..."                                │ │
│ │ @someone_else · [Remove]                                │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ "Third tweet..."                                        │ │
│ │ @yourusername · [Remove]                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Tweet]  ← opens modal to paste URL                   │
│                                                             │
│ 💡 Tip: Use the xthread extension to save tweets while      │
│    browsing Twitter with one click.                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ STYLE PROFILES (2/3)                                        │
│ We analyze top tweets from these accounts and build style   │
│ profiles. Select a profile on the Generate page to          │
│ incorporate their style.                                    │
│                                                             │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│ │ @balaboris    │ │ @cobie        │ │               │      │
│ │               │ │               │ │    + Add      │      │
│ │ Punchy,       │ │ Storytelling, │ │    Account    │      │
│ │ contrarian,   │ │ casual,       │ │               │      │
│ │ no emoji      │ │ occasional 😂 │ │   3 credits   │      │
│ │               │ │               │ │               │      │
│ │ [View] [×]    │ │ [View] [×]    │ │               │      │
│ └───────────────┘ └───────────────┘ └───────────────┘      │
│                                                             │
│ TONE SLIDERS                                                │
│                                                             │
│ Casual ●────────────○ Formal                                │
│ Hedged ○────────────● Direct                                │
│ Serious ────●──────── Playful                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Generate Page — Style Selection

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ Topic                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ What's your tweet about?                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Incorporate style (select one):                             │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                  │
│ │@balaboris │ │  @cobie   │ │  @shaq    │                  │
│ │     ○     │ │     ○     │ │     ○     │                  │
│ └───────────┘ └───────────┘ └───────────┘                  │
│ None selected = saved posts only                           │
│                                                             │
│ Post type        Length                                     │
│ [Market Take ▾]  [Standard ▾]                              │
│                                                             │
│              [✨ Generate]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Prompt Structure

### When NO style profile selected:
```
YOUR VOICE (match these exactly):
1. "User's saved tweet 1..."
2. "User's saved tweet 2..."
3. "User's saved tweet 3..."
4. "User's saved tweet 4..."
5. "User's saved tweet 5..."

Generate content that sounds like the person who wrote these tweets.
```

### When style profile IS selected:
```
STYLE PATTERNS (from @balaboris):
- Length: typically 60-140 chars
- Emoji: never uses emoji
- Hooks: bold claims, contrarian openers, number leads
- Tone: direct, confident, provocative
- Sentences: short, punchy, fragments OK
- Questions: rare, rhetorical only

YOUR VOICE (match these exactly):
1. "User's saved tweet 1..."
2. "User's saved tweet 2..."
3. "User's saved tweet 3..."
4. "User's saved tweet 4..."
5. "User's saved tweet 5..."

Generate content that follows the STYLE PATTERNS above
while sounding like the person who wrote the VOICE examples.
```

---

## API Endpoints

### Voice Library

**GET /api/voice/library**
- Returns user's saved tweets (max 5)

**POST /api/voice/library**
- Body: `{ tweet_url: string }` or `{ tweet_text: string, author_username: string }`
- Fetches tweet if URL provided
- Validates max 5 limit
- Returns created entry

**DELETE /api/voice/library/:id**
- Removes tweet from library

### Style Profiles

**GET /api/voice/profiles**
- Returns user's style profiles (max 3)

**POST /api/voice/profiles**
- Body: `{ username: string }`
- Costs 3 credits
- Fetches 100 tweets from account
- Filters to top 10 by engagement
- Extracts patterns via AI
- Stores profile
- Returns created profile

**DELETE /api/voice/profiles/:id**
- Removes style profile

**GET /api/voice/profiles/:id**
- Returns full profile details including top tweets

---

## Extension Integration

### Save Tweet Button
When user is viewing a tweet on X:
1. Extension shows "Save to Voice" button
2. Click → calls POST /api/voice/library with tweet URL
3. Toast: "Saved to voice library (3/5)"

### Implementation
- Add button next to existing extension buttons on tweet
- Check current count before showing (hide if 5/5)
- Use same auth flow as other extension features

---

## Cost Analysis

### Style Profile Creation
- Fetch 100 tweets: 100 × $0.005 = $0.50
- AI pattern extraction: ~$0.05
- **Total: ~$0.55 per profile**
- **Charge: 3 credits ($0.60) = ~8% margin**

### Per Generation
- No additional X API cost (reading from DB)
- Minimal extra tokens for patterns + examples
- **No extra charge**

---

## Migration Plan

### Phase 1: Database
1. Create `voice_library` table
2. Create `style_profiles` table
3. Migrate existing `voice_samples` to `voice_library` (mark as is_own_tweet: true)

### Phase 2: Settings UI
1. Build new Voice Settings section
2. Add tweet modal
3. Style profile cards with View/Remove

### Phase 3: Generate Integration
1. Add style selector to generate page
2. Update prompt building to use new structure
3. Wire up API calls

### Phase 4: Extension
1. Add "Save to Voice" button on tweets
2. Connect to voice library API

---

## Open Questions

1. **What if user has < 5 saved tweets?** 
   - Generate with whatever they have
   - Show gentle prompt: "Add more tweets to improve voice matching"

2. **Can user re-analyze a style profile?**
   - Yes, costs another 3 credits
   - "Refresh" button on profile card

3. **What happens to existing voice_samples data?**
   - Migrate to voice_library
   - Keep voice_profile JSON for backward compatibility during transition

---

## Success Metrics

- Voice library fill rate (% of users with 3+ saved tweets)
- Style profile adoption (% of users with 1+ profiles)
- Style selection usage (% of generations using a style profile)
- Qualitative: User feedback on output quality

---

## Build Order (Tonight)

1. ☐ Database tables + migrations
2. ☐ API endpoints (voice library CRUD)
3. ☐ API endpoints (style profiles CRUD)  
4. ☐ Settings UI — saved posts section
5. ☐ Settings UI — style profiles section
6. ☐ Generate page — style selector
7. ☐ Prompt building updates
8. ☐ Extension — save tweet button

---

*Let's build it.* 🚀
