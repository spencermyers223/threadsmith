# Feature Spec: Repurpose Mode
*No X API required*

## Overview
Take any existing content and generate multiple variations, angles, and formats. Turn one good post into 5-10 pieces of content.

## User Flow

### Entry Points
1. Creator Hub → "Repurpose" tab (new)
2. Workspace → "Repurpose this" button on any saved post
3. Extension → "Save & Repurpose" on any tweet in feed

### Input
- Text area to paste content
- OR select from saved posts
- OR extension-saved inspirations

### Output Types
User selects which outputs they want:

- [ ] **Thread Expansion** - Turn tweet into 5-7 tweet thread
- [ ] **Quote Tweet Angle** - Response/reaction to original
- [ ] **Contrarian Take** - Opposite perspective
- [ ] **Data Version** - Add stats/specifics
- [ ] **Story Version** - Personal anecdote angle
- [ ] **Question Version** - End with engagement hook
- [ ] **Hot Take Version** - More provocative spin
- [ ] **ELI5 Version** - Simplified explanation

### Generation Flow
1. User pastes/selects content
2. Checks desired output types
3. Clicks "Generate Variations"
4. AI generates all selected types
5. User reviews, edits, saves favorites

## Technical Implementation

### New Components
```
src/components/creator-hub/RepurposeMode.tsx
src/app/api/repurpose/route.ts
```

### Database
```sql
-- New table for saved inspirations
create table inspirations (
  id uuid primary key,
  user_id uuid references profiles,
  original_text text not null,
  source_url text,
  source_author text,
  tags text[],
  created_at timestamptz default now()
);
```

### Prompt Engineering
```
You are repurposing content for X/Twitter. Given the original post, create variations.

Original: "${input}"

Generate the following variations:
1. Thread Expansion (5-7 tweets)
2. Quote Tweet Angle
3. Contrarian Take
...

For each, maintain the core insight but change:
- Format/structure
- Angle/perspective  
- Hook/opening
- Voice (per user profile)
```

## UI Mockup

```
┌─────────────────────────────────────┐
│ Repurpose Content                   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Paste content to repurpose...   │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Output Types:                       │
│ ☑ Thread Expansion                  │
│ ☑ Quote Tweet Angle                 │
│ ☐ Contrarian Take                   │
│ ☑ Question Version                  │
│ ☐ Hot Take Version                  │
│                                     │
│ [Generate Variations]               │
└─────────────────────────────────────┘
```

## Success Metrics
- Variations generated per user/week
- Save rate (variations saved to workspace)
- Post rate (variations actually posted)

## Estimated Effort
- Frontend: 4-6 hours
- Backend/API: 2-3 hours
- Prompts: 2-3 hours
- Testing: 2 hours
- **Total: ~2 days**
