# xthread v1 Implementation - Creator Hub & Onboarding

## Project Context

xthread is an AI-powered content generation platform for Crypto Twitter. The app helps crypto researchers, analysts, and builders create algorithm-optimized posts that sound authentic, not generic AI.

**Current stack:** Next.js, Supabase (auth + database), Stripe payments, Google OAuth, Vercel deployment

**What exists:**
- Basic generate page (outdated - needs full rebuild)
- Basic workspace page (keep mostly as-is)
- Basic calendar page (keep, minor updates)
- Google OAuth + Stripe integration working
- 5-step customization flow (needs revamp)

## Reference Documents

Before implementing, read these files in the repo's `/docs` folder (create this folder and add the files from the project):
- `xthread_v1_features.md` - Full feature spec (NORTH STAR)
- `xthread_x_algorithm_research_report.md` - Algorithm weights and optimization data
- `xthread_crypto_twitter_patterns.md` - CT culture, vocabulary, content patterns
- `xthread_algorithm_insights_and_feature_guide.md` - User-facing education content

These documents should inform the AI prompts for content generation.

---

## Implementation Scope

### 1. Creator Hub (NEW PAGE - replaces Generate)

**Navigation update:**
```
xthread    [Creator Hub] [Workspace] [Calendar] [Settings]    [Avatar]
```

Remove "Customize" from nav - it now lives in Settings and onboarding only.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  xthread    [Creator Hub] [Workspace] [Calendar] [Settings]        [S] │
├─────────────┬───────────────────────────────────────────────────────────┤
│             │  [Write] [Generate]                 [Generate from file]  │
│  FILES      ├───────────────────────────────────────────────────────────┤
│             │                                                           │
│  > Drafts   │                                                           │
│  > Research │              MAIN AREA                                    │
│  > Published│         (changes based on toggle)                         │
│             │                                                           │
│  ─────────  │                                                           │
│  + New File │                                                           │
│  ↑ Upload   │                                                           │
│             │                                                           │
├─────────────┴───────────────────────────────────────────────────────────┤
│  Tags: [+ Add tag]                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Left Sidebar (always visible in both modes):**
- Collapsible folder tree (default folders: Drafts, Research, Published)
- User can create new folders
- File type indicators (note, uploaded doc, etc.)
- "+ New File" button
- "↑ Upload" button (supports PDF, DOCX, TXT, MD, images, CSV)
- Drag-and-drop organization
- Search files

**Write Mode:**
- Rich text editor (full width of main area)
- Editable file name at top
- Formatting toolbar (bold, italic, headers, bullets, links, code blocks)
- Auto-save
- "Generate from file" button (top right) - switches to Generate mode with file attached
- Research templates available when creating new file:
  - Protocol Analysis Template
  - Tokenomics Breakdown Template
  - Market Thesis Template
  - Project Due Diligence Template
  - Weekly Market Review Template

**Generate Mode:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Write] [Generate]                     [Generate from file]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ What do you want to post about?                           │ │
│  │ [                                                       ] │ │
│  │ [Attached: research-file.md ✕]        [+ Add File] [Gen] │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Post Type: [Alpha Thread] [Market Take] [Hot Take]            │
│             [On-Chain Insight] [Protocol Breakdown]            │
│             [Build-in-Public]                                  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  (After generation - SINGLE TWEETS show 3 side-by-side)        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ Tweet Option 1  │ │ Tweet Option 2  │ │ Tweet Option 3  │   │
│  │                 │ │                 │ │                 │   │
│  ├─────────────────┤ ├─────────────────┤ ├─────────────────┤   │
│  │[📤][📅][📝][✏️]│ │[📤][📅][📝][✏️]│ │[📤][📅][📝][✏️]│   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  (THREADS show 1 at a time with navigation)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Option 1 of 3    [←] [→]             │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Tweet 1/7 - Hook                                │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ Tweet 2/7                                       │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │  ... (all tweets in thread shown)                      │   │
│  │                                                         │   │
│  │  [📤 Post Now] [📅 Add to Calendar] [📝 Add to Workspace] │
│  │  [✏️ Edit ▼]                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Action buttons under each output:**
- 📤 Post Now - publishes directly (requires X API connection, or copy to clipboard if not connected)
- 📅 Add to Calendar - opens date/time picker, saves to calendar
- 📝 Add to Workspace - saves as draft in Workspace
- ✏️ Edit - expands panel below with editing tools

**Edit panel (expands below tweet when Edit clicked):**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Add Hook] [Humanize] [Shorten] [Add Question] [Make Spicier]  │
│ [Expand to Thread]                                              │
├─────────────────────────────────────────────────────────────────┤
│ [Editable text area with the tweet content]                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                        [Cancel] [Save Changes]  │
└─────────────────────────────────────────────────────────────────┘
```

Editing tools apply AI transformations:
- **Add Hook** - rewrites opening line to stop the scroll
- **Humanize** - adjusts language to sound less AI, more like user's voice
- **Shorten** - cuts to <100 characters while preserving message
- **Add Question** - appends engagement-driving question
- **Make Spicier** - sharpens opinion, removes hedging
- **Expand to Thread** - transforms single tweet into 5-7 tweet thread

**File click behavior:**
- In Write mode: opens file in editor
- In Generate mode: switches to Write mode and opens file
- "Add File" button in Generate mode: attaches file as context without switching modes

---

### 2. Onboarding Flow (REVAMP)

Triggered on first login after signup. Not a standalone page - modal/fullscreen overlay flow.

**Phase 1: Pain Discovery**

```
Step 1: "What's your biggest struggle with X/Twitter?"
  □ I don't know what to post
  □ I post but get no engagement  
  □ I'm inconsistent / can't stay motivated
  □ I have ideas but they come out wrong
  □ I don't understand how the algorithm works
  (Multi-select allowed)

Step 2: "How's your growth been?"
  ○ Stuck under 1K followers
  ○ Growing slowly (1K-10K)
  ○ Good following but engagement is dropping
  ○ Starting fresh / new account

Step 3: "How much time do you spend on content?"
  ○ Too much - hours for one post
  ○ Not enough - I keep putting it off
  ○ Inconsistent - feast or famine
```

**Phase 2: Profile Setup**

```
Step 4: "What's your niche?"
  Primary focus (select one):
  - Bitcoin / Digital Gold
  - Ethereum / L1s / L2s
  - DeFi / Yield
  - NFTs / Digital Art
  - Trading / Technical Analysis
  - Protocol Research / Due Diligence
  - Macro / Institutional
  - Memecoins / Degen
  - Building / Development

  Secondary interests (multi-select)
  
  Specific protocols/chains you cover: [text input]

Step 5: "Teach us your voice"
  Option A: Paste 5-10 of your best tweets [text area]
  Option B: Describe your style in words [text area]
  
  Tone: [Formal ←slider→ Casual]
  Opinion strength: [Hedged ←slider→ Direct]  
  Humor: [Serious ←slider→ Playful]

Step 6: "What's your goal?"
  ○ Build authority/credibility
  ○ Grow follower count
  ○ Drive traffic (newsletter, Discord, etc.)
  ○ Network with others in space
  ○ Document my journey
  
  Content frequency target: [X posts per day/week dropdown]

Step 7: "Accounts you admire"
  Who on CT do you want to sound like? (helps us learn patterns)
  [@handle input, can add multiple]
```

**Phase 3: First Win**

```
Step 8: "Let's create your first post"
  
  "Based on your profile, try generating a [suggested post type based on niche]"
  
  [Pre-filled topic suggestion based on their niche]
  
  [Generate button]
  
  → Shows generation happening
  → Displays result
  → "🎉 Your first algorithm-optimized post!"
  
  [Post it now] [Save for later] [Try another]
  
  "You have 4 free generations remaining. Upgrade to Pro for unlimited."
  [Upgrade to Pro] [Continue to app]
```

**After onboarding:**
- User lands on Creator Hub
- Onboarding data saved to user profile in Supabase
- Settings page allows editing all onboarding responses

---

### 3. Post Type System

Six crypto-native post types, each with specialized prompts:

**Alpha Thread**
- Purpose: Share non-obvious insights, research findings, analysis
- Structure: Hook → Context → Evidence → Insight → Action → CTA
- Length: 5-10 tweets
- Output: Thread format (1 at a time display)

**Market Take**  
- Purpose: Quick opinions on price action, macro events, sentiment
- Structure: Clear position + specific reasoning
- Length: Single tweet or 2-3 tweets
- Output: Single tweet format (3 options display)

**Hot Take**
- Purpose: Contrarian or spicy opinions to spark discussion
- Structure: Bold claim + supporting logic
- Length: Single tweet
- Output: Single tweet format (3 options display)

**On-Chain Insight**
- Purpose: Data-driven observations from blockchain analytics
- Structure: Insight first → Data/evidence → Implications
- Length: Single tweet or short thread
- Output: Single tweet format (3 options display)

**Protocol Breakdown**
- Purpose: Educational deep dives explaining how something works
- Structure: Why care → How it works → Risks → Implications
- Length: 5-10 tweets
- Output: Thread format (1 at a time display)

**Build-in-Public**
- Purpose: Updates on projects, learnings, journey
- Structure: Update + metrics + honest reflection + ask
- Length: Single tweet or short thread
- Output: Single tweet format (3 options display)

**Prompt engineering requirements:**
- Each post type needs a system prompt incorporating:
  - Algorithm optimization rules from `xthread_x_algorithm_research_report.md`
  - CT culture/vocabulary from `xthread_crypto_twitter_patterns.md`
  - User's voice profile from onboarding
  - Post type specific structure
- Generate 3 variations per request
- Detect thread vs single tweet for display logic

---

### 4. Workspace Updates (MINOR)

Keep existing functionality. Ensure it can:
- Receive posts from "Add to Workspace" action in Creator Hub
- Posts arrive as drafts in the left sidebar
- Tweet/Thread/Article toggle stays
- Preview panel stays

---

### 5. Calendar Updates (MINOR)

Keep existing functionality. Ensure it can:
- Receive posts from "Add to Calendar" action in Creator Hub
- Date/time picker when adding from Creator Hub
- Posts appear on calendar at scheduled time

---

### 6. Settings Page Updates

Add sections for editing onboarding data:
- Profile (niche, goals, frequency)
- Voice (example tweets, tone sliders)
- Admired accounts
- Account/billing (existing)

---

### 7. Database Schema Updates (Supabase)

**New/updated tables needed:**

```sql
-- User profile (extend existing)
user_profiles:
  - struggles (text array)
  - growth_stage (text)
  - time_spent (text)
  - primary_niche (text)
  - secondary_interests (text array)
  - specific_protocols (text)
  - voice_examples (text)
  - voice_description (text)
  - tone_formal_casual (integer 1-5)
  - tone_hedged_direct (integer 1-5)
  - tone_serious_playful (integer 1-5)
  - primary_goal (text)
  - content_frequency (text)
  - admired_accounts (text array)
  - onboarding_completed (boolean)
  - generations_remaining (integer, default 5)

-- Files/folders for Creator Hub
files:
  - id (uuid)
  - user_id (uuid, FK)
  - folder_id (uuid, FK nullable)
  - name (text)
  - content (text)
  - file_type (text: 'note', 'upload')
  - original_filename (text, nullable)
  - tags (text array)
  - created_at (timestamp)
  - updated_at (timestamp)

folders:
  - id (uuid)
  - user_id (uuid, FK)
  - name (text)
  - parent_id (uuid, FK nullable for nesting)
  - created_at (timestamp)

-- Generated posts
generated_posts:
  - id (uuid)
  - user_id (uuid, FK)
  - source_file_id (uuid, FK nullable)
  - topic (text)
  - post_type (text)
  - content (text or jsonb for threads)
  - is_thread (boolean)
  - status (text: 'generated', 'draft', 'scheduled', 'posted')
  - scheduled_for (timestamp nullable)
  - posted_at (timestamp nullable)
  - created_at (timestamp)
```

---

### 8. File Structure Suggestion

```
/app
  /creator-hub
    page.tsx (main Creator Hub)
    /components
      FileSidebar.tsx
      WriteMode.tsx
      GenerateMode.tsx
      PostOutput.tsx
      EditPanel.tsx
      FileUpload.tsx
  /workspace
    (existing, minor updates)
  /calendar
    (existing, minor updates)
  /settings
    page.tsx (add profile editing sections)
  /onboarding
    /components
      OnboardingModal.tsx
      PainSteps.tsx
      ProfileSteps.tsx
      FirstWinStep.tsx
/components
  /ui (shared components)
/lib
  /prompts
    alphaThread.ts
    marketTake.ts
    hotTake.ts
    onChainInsight.ts
    protocolBreakdown.ts
    buildInPublic.ts
    editingTools.ts (add hook, humanize, etc.)
  /api
    generate.ts
    files.ts
/docs
  xthread_v1_features.md
  xthread_x_algorithm_research_report.md
  xthread_crypto_twitter_patterns.md
  xthread_algorithm_insights_and_feature_guide.md
```

---

## Implementation Order

1. **Setup:** Create `/docs` folder, add reference documents
2. **Database:** Add new Supabase tables/columns
3. **Onboarding:** Build the 8-step flow (this blocks everything else)
4. **Creator Hub - Write Mode:** File sidebar + editor
5. **Creator Hub - Generate Mode:** Post types + 3-output display
6. **Editing Tools:** Add Hook, Humanize, etc.
7. **Integration:** Wire up Workspace and Calendar to receive posts
8. **Settings:** Add profile editing sections
9. **Polish:** Test flows, fix edge cases

---

## Design Notes

- Keep existing dark theme and gold accent color scheme
- Maintain current typography and spacing patterns
- Pills/buttons style should match existing UI
- File sidebar similar to VS Code or Notion aesthetic
- Cards for tweet outputs with subtle borders
- Smooth transitions between Write/Generate modes

---

## Questions to Resolve During Implementation

1. What rich text editor library to use? (Tiptap, Slate, etc.)
2. File upload - store in Supabase storage or just extract text?
3. X API integration status - is posting live or copy-to-clipboard only for now?
4. Generation counter - where does it decrement? On generate click or per output used?

---

Start with the `/docs` folder setup and database schema, then move to onboarding flow.
