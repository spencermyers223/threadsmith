# Extension Overhaul Plan - February 2026

## Overview
Major restructure of xthread Chrome extension to simplify profile buttons and reorganize sidepanel tabs.

## Current State
- **Profile buttons:** Messy pill-shaped buttons with text (Add to Voice, Message, Top Tweets, Analyze, Watch)
- **Sidepanel tabs:** Coach, Feed, Stats, Watch, Saved, Queue (6 tabs)

## Target State
- **Profile buttons:** 3 clean icon-only gold circles (Mic, Stats, Watchlist)
- **Sidepanel tabs:** Coach, Stats, Watchlist, Saved, Queue (5 tabs)

---

## Task Breakdown

### Task 1: Profile Buttons Restyle
**Files:** 
- `extension/src/content/content.js` (profile button injection section)
- `extension/src/styles/content.css`

**Changes:**
- Remove Message button (X has native DM button)
- Remove Analyze button (replaced by Stats)
- Keep: Mic (Add to Voice), rename Watch → Watchlist
- Add: Stats icon button
- Restyle ALL to icon-only 32x32px gold circles (like Coach/Save on tweets)
- Icons: 🎤 Mic, 📊 Stats (bar chart), 👁️ Watchlist (eye)

**No conflicts with other tasks**

---

### Task 2: Stats Tab & API
**Files:**
- `extension/src/sidepanel/sidepanel.js` (Stats tab render function)
- `extension/src/sidepanel/sidepanel.html` (Stats tab container)
- `src/app/api/extension/user-top-tweets/route.ts` (enhance with style analysis)

**Changes:**
- Stats tab shows list of scanned profiles
- Each profile entry shows: avatar, handle, "View Top Tweets" 
- Clicking expands to show top 10 tweets by engagement
- API returns: tweets with metrics + style description
- Profile Stats button triggers scan → stores in Stats tab

**Touches:** Stats-specific functions only in sidepanel.js

---

### Task 3: Watchlist Overhaul
**Files:**
- `extension/src/sidepanel/sidepanel.js` (Watchlist tab render function)
- `extension/src/sidepanel/sidepanel.html` (Watchlist tab container)
- `extension/src/content/watchlist.js` (category picker dropdown)

**Changes:**
- Replace Feed tab with enhanced Watchlist
- Add category management (create/rename/delete lists)
- Dropdown selector to switch between watchlists
- Show recent posts from accounts in selected watchlist
- Profile Watchlist button shows dropdown to pick/create category

**Touches:** Watchlist-specific functions, watchlist.js

---

### Task 4: Queue Tab Enhancement
**Files:**
- `extension/src/sidepanel/sidepanel.js` (Queue tab render function)
- `extension/src/sidepanel/sidepanel.html` (Queue tab container)

**Changes:**
- Add dropdown toggle: "Posts" | "DMs"
- Posts view: existing scheduled posts functionality
- DMs view: cold outreach templates (from dm-templates API)
- Copy button on each template

**Touches:** Queue-specific functions only

---

### Task 5: Tab Structure & Cleanup
**Files:**
- `extension/src/sidepanel/sidepanel.html` (tab bar HTML)
- `extension/src/sidepanel/sidepanel.css` (tab styling)
- `extension/src/manifest.json` (version bump)

**Changes:**
- Remove Feed tab from tab bar
- Ensure 5 tabs: Coach, Stats, Watchlist, Saved, Queue
- Update tab icons to match new structure
- Clean up any Feed-related CSS
- Bump version to v6.0.0

**Touches:** HTML structure, CSS only

---

## Parallel Execution Safety

| Task | Primary Files | Conflict Risk |
|------|---------------|---------------|
| 1 - Profile Buttons | content.js, content.css | None |
| 2 - Stats Tab | sidepanel.js (stats functions), API | Low |
| 3 - Watchlist | sidepanel.js (watchlist functions), watchlist.js | Low |
| 4 - Queue | sidepanel.js (queue functions) | Low |
| 5 - Tab Structure | sidepanel.html, sidepanel.css | Low |

Tasks 2, 3, 4 all touch sidepanel.js but different functions. 
Task 5 touches HTML/CSS structure which others depend on - **run Task 5 first or last**.

## Recommended Order
1. **Task 5** (Tab Structure) - Sets up the foundation
2. **Tasks 1, 2, 3, 4** in parallel - Independent work areas
3. **Review & Integration** - Ensure everything works together

---

## API Endpoints

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/extension/user-top-tweets` | Get top 10 tweets + style | EXISTS - enhance |
| `/api/extension/dm-templates` | Get DM templates | EXISTS |
| `/api/extension/analyze-account` | Account analysis | DELETE or repurpose |

---

## Version
- Current: v5.0.5
- Target: v6.0.0 (major overhaul)
