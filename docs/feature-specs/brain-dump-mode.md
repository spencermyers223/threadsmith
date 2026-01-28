# Feature Spec: Brain Dump Mode
*No X API required*

## Overview
Freeform writing mode where users dump thoughts, ideas, observations without structure. AI then extracts and organizes into multiple post ideas.

## User Flow

### Entry Point
Creator Hub → "Brain Dump" tab (alongside Generate, Repurpose)

### Experience
1. **Timer Option** - Set 5/10/15 min timer (optional)
2. **Minimal UI** - Just a big text area, no distractions
3. **Dump Everything** - Thoughts, observations, ideas, rants
4. **AI Processing** - Extract structured content

### Output
AI generates:
- 5-10 discrete post ideas extracted from the dump
- Each idea ranked by potential engagement
- Suggested post type for each (hot take, insight thread, etc.)
- One-click "expand" to full generation

## Technical Implementation

### New Components
```
src/components/creator-hub/BrainDumpMode.tsx
src/app/api/brain-dump/route.ts
```

### Prompt Engineering
```
You are a content strategist analyzing a brain dump from a creator.

Their brain dump:
"""
${dumpText}
"""

Their niche: ${userNiche}
Their voice: ${voiceProfile}

Extract 5-10 distinct post ideas from this content. For each:

1. Core Insight: The key point worth sharing
2. Suggested Hook: Opening line that stops the scroll
3. Post Type: (hot_take | insight_thread | industry_take | build_in_public)
4. Engagement Potential: (high | medium | low) with reasoning
5. Expansion Notes: What else to include if turning into full post

Rank by engagement potential (highest first).

Output as JSON array.
```

### UI Design

```
┌─────────────────────────────────────────┐
│ Brain Dump                    ⏱️ 10:00  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │                                     │ │
│ │   Just write. Don't think.         │ │
│ │   The AI will organize later.      │ │
│ │                                     │ │
│ │                                     │ │
│ │                                     │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Extract Ideas]                         │
└─────────────────────────────────────────┘
```

### Results View

```
┌─────────────────────────────────────────┐
│ 7 Post Ideas Found                      │
├─────────────────────────────────────────┤
│ 1. ⭐ High Potential                    │
│    "Most AI startups are solving..."    │
│    → Hot Take                           │
│    [Expand to Full Post]                │
├─────────────────────────────────────────┤
│ 2. ⭐ High Potential                    │
│    "The thing nobody tells you..."      │
│    → Insight Thread                     │
│    [Expand to Full Post]                │
├─────────────────────────────────────────┤
│ 3. Medium Potential                     │
│    "Shipped the new feature..."         │
│    → Build in Public                    │
│    [Expand to Full Post]                │
└─────────────────────────────────────────┘
```

## Integration with Existing System

- "Expand to Full Post" → Uses existing generation API with extracted idea as input
- Save ideas → Store in posts table as drafts
- Schedule → Direct path to calendar

## Success Metrics
- Brain dumps per user/week
- Ideas extracted per dump
- Expansion rate (ideas turned into posts)
- Time in brain dump mode

## Estimated Effort
- Frontend: 3-4 hours
- Backend/API: 2-3 hours
- Prompts: 2 hours
- Testing: 1-2 hours
- **Total: ~1.5 days**
