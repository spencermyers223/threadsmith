# xthread Current State - January 25, 2026

## What's Been Built

### 1. Onboarding Flow (8 Steps)
**Status:** ✅ Complete with recent fixes

**Phase 1: About You (Steps 1-3)**
- Step 1: Struggles multi-select ("What's your biggest struggle?")
- Step 2: Growth stage single-select ("How's your growth been?")
- Step 3: Time spent single-select ("How much time do you spend?")

**Phase 2: Profile Setup (Steps 4-7)**
- Step 4: Niche multi-select with "Select all that apply"
- Step 5: Voice - single textarea "Describe your style or the style you want to emulate" + 3 tone sliders
- Step 6: Goals multi-select with "Select all that apply"
- Step 7: Admired accounts input (no suggested accounts)

**Phase 3: First Win (Step 8)**
- Generate first post with placeholder text (not pre-filled)
- Shows generated result with Post/Save/Regenerate options

**Footer:** "You can always update these in Settings later"

**Files:**
- `src/components/onboarding/OnboardingModal.tsx`
- `src/components/onboarding/PainDiscoverySteps.tsx`
- `src/components/onboarding/ProfileSetupSteps.tsx`
- `src/components/onboarding/FirstWinStep.tsx`
- `src/components/onboarding/OnboardingCheck.tsx`

---

### 2. Creator Hub (`/creator-hub`)
**Status:** ✅ Core structure complete, needs fixes

**Layout:**
- Left sidebar: File/folder tree
- Top: Write/Generate toggle
- Main area: Changes based on toggle

**Write Mode:**
- Rich text editor (Tiptap)
- File name input
- Save button

**Generate Mode:**
- Topic textarea with character count
- "Or generate from your files" with Browse button
- Length options: Punchy, Standard, Developed, Thread
- 6 Post Types: Alpha Thread, Market Take, Hot Take, On-Chain Insight, Protocol Breakdown, Build-in-Public
- 3 output cards for single tweets OR carousel for threads
- Action buttons: Copy, Edit in Workspace, Schedule

**Files:**
- `src/app/creator-hub/page.tsx`
- `src/app/creator-hub/layout.tsx`
- `src/components/creator-hub/WriteMode.tsx`
- `src/components/creator-hub/GenerateMode.tsx`

---

### 3. Navigation
**Status:** ✅ Complete

**Header:** xthread logo → Creator Hub → Workspace → Calendar → Settings → Avatar

**Redirects (via middleware):**
- `/` → `/creator-hub` (for logged-in users)
- `/generate` → `/creator-hub`
- Auth callback → `/creator-hub`
- Onboarding complete → `/creator-hub`

---

### 4. Database Schema
**Status:** ✅ Migration created, partially applied

**Tables:**
- `content_profiles` - Extended with onboarding fields (struggles, growth_stage, niches, voice settings, goals, etc.)
- `folders` - For file organization
- `tags` - User-managed tags
- `files` - Extended with folder_id and tags
- `posts` - Extended with post_type, source_file_id, is_thread

**Constraints dropped:**
- `content_profiles_niche_check` - Removed to allow multi-select niches

**Files:**
- `supabase/migrations/003_onboarding_and_creator_hub.sql`

---

### 5. Workspace
**Status:** ✅ Existing, minor updates made

- Receives posts from "Add to Workspace" action
- Tweet/Thread/Article toggle
- Preview panel
- Drafts sidebar

---

### 6. Calendar
**Status:** ✅ Existing, minor updates made

- Receives posts from "Add to Calendar" action
- Monthly view with scheduled posts
- Filter by post type/tag

---

### 7. Settings
**Status:** ✅ Has voice options

- Content Niche section
- Voice & Style section (example tweets, description, tone sliders, admired accounts)
- Goals & Audience section
- Account/billing

---

## Fixes Completed (Jan 26, 2026)

All 6 original Creator Hub bugs have been resolved:

1. ✅ **Pro Status** — Upgrade button now hidden for active/lifetime subscribers (commit 988bc51)
2. ✅ **Sidebar Collapse** — Explicit toggle button, no click-outside collapse (commit 2c418b2)
3. ✅ **File Opening** — Click file in sidebar → opens in Write mode editor (commit 2c418b2)
4. ✅ **Save Functionality** — Save button properly saves to Supabase + refreshes sidebar (commit 3d793b1)
5. ✅ **New File Button** — FilePlus button in WriteMode clears editor for new file (commit 3d793b1)
6. ✅ **Auto-Select Thread Length** — Alpha Thread/Protocol Breakdown auto-select "Thread" length (commit 3d793b1)

---

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Supabase (auth + database + storage)
- **Payments:** Stripe (monthly/lifetime plans)
- **Auth:** Google OAuth
- **AI:** Anthropic Claude API
- **Editor:** Tiptap
- **Deployment:** Vercel

---

## File Structure

```
/src
  /app
    /creator-hub
      page.tsx
      layout.tsx
    /workspace
    /calendar
    /settings
    /api
      /chat
        /writing-assistant
          route.ts
  /components
    /creator-hub
      WriteMode.tsx
      GenerateMode.tsx
    /onboarding
      OnboardingModal.tsx
      PainDiscoverySteps.tsx
      ProfileSetupSteps.tsx
      FirstWinStep.tsx
      OnboardingCheck.tsx
    /editing
      EditingTools.tsx
/docs
  xthread_v1_features.md
  xthread_x_algorithm_research_report.md
  xthread_crypto_twitter_patterns.md
  xthread_algorithm_insights_and_feature_guide.md
  xthread_claude_code_prompt.md
/supabase
  /migrations
    003_onboarding_and_creator_hub.sql
```

---

## Reference Documents

All in `/docs` folder:
- `xthread_v1_features.md` - Full feature spec (north star)
- `xthread_x_algorithm_research_report.md` - X algorithm data
- `xthread_crypto_twitter_patterns.md` - CT culture/vocabulary
- `xthread_algorithm_insights_and_feature_guide.md` - User-facing education
- `xthread_claude_code_prompt.md` - Original implementation prompt

---

## User Account Notes

- Test user has `lifetime` subscription with `active` status
- User ID: `de883456-aa30-4b55-9b6f-1917af0e2a8c`
