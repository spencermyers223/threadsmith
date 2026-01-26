# xthread Creator Hub Fixes - Master Prompt

Read all files in /docs folder first, especially:
- `xthread_current_state.md` (CURRENT STATE - read this first)
- `xthread_v1_features.md` (full feature spec)

## Overview

There are 8 fixes needed for the Creator Hub. These can be worked on in parallel as they touch different parts of the codebase.

**After ALL changes, run `npm run build` to verify no errors.**

---

## Fix 1: Pro Status - Hide Upgrade Button
**File:** `src/app/creator-hub/page.tsx` or wherever the upgrade button is rendered

**Issue:** "Upgrade to Pro" button shows even for users with active subscription

**Fix:** 
- Check subscription status from Supabase
- If `subscriptions.status = 'active'`, hide the "Upgrade to Pro" button entirely
- Could show "Pro — Unlimited generations" text instead (already exists, just need to hide the button)

---

## Fix 2: Sidebar Collapse Behavior
**File:** `src/components/creator-hub/` (FileSidebar or similar)

**Issue:** Clicking anywhere on main area collapses the sidebar unexpectedly

**Fix:**
- Remove any "click outside to close" behavior on the sidebar
- Sidebar should stay open by default
- Add an explicit collapse/expand toggle button at the top of the sidebar (hamburger icon or chevron)
- Only collapse when user clicks that button
- Remember collapse state (localStorage or state)

---

## Fix 3: File Opening in Write Mode
**File:** `src/components/creator-hub/WriteMode.tsx` and file sidebar component

**Issue:** Clicking a file in sidebar doesn't open it in the editor

**Fix:**
- Add onClick handler to file items in sidebar
- When clicked, fetch file content from Supabase
- Load content into the Tiptap editor
- Update the file name input with the file's name
- Track "current file ID" in state for save functionality

---

## Fix 4: Save Functionality
**File:** `src/components/creator-hub/WriteMode.tsx`

**Issue:** Save button adds file to generate prompt instead of saving to sidebar

**Fix:**
- Implement proper save logic:
  - If editing existing file (has currentFileId): UPDATE the file in Supabase
  - If new file: INSERT new file in Supabase
- Add two save options:
  - "Save" button - saves to root level (no folder) or current folder
  - "Save to Folder..." button or dropdown - opens folder picker modal, then saves to selected folder
- After save, refresh the file sidebar to show the new/updated file
- Show success toast/notification

---

## Fix 5: New File Button
**File:** `src/components/creator-hub/WriteMode.tsx`

**Issue:** No way to start a new file after opening/saving one

**Fix:**
- Add "New" or "+ New File" button above the text editor (near the file name input)
- When clicked:
  - Clear the editor content
  - Reset file name to "Untitled" or empty
  - Clear currentFileId (so next save creates new file)
  - Focus the editor

---

## Fix 6: Auto-Select Thread Length
**File:** `src/components/creator-hub/GenerateMode.tsx`

**Issue:** Selecting "Alpha Thread" or "Protocol Breakdown" doesn't auto-select "Thread" length

**Fix:**
- Add useEffect that watches the selected post type
- When post type changes to `alpha_thread` or `protocol_breakdown`:
  - Automatically set length to `thread`
- When post type changes to other types:
  - Could optionally reset to `standard` or leave as-is (leave as-is is probably better)

```typescript
useEffect(() => {
  if (selectedPostType === 'alpha_thread' || selectedPostType === 'protocol_breakdown') {
    setLength('thread');
  }
}, [selectedPostType]);
```

---

## Fix 7: Thread Tweet Formatting
**File:** `src/components/creator-hub/GenerateMode.tsx` (thread display section)

**Issue:** Thread shows 21 numbered lines but they're actually 7 tweets with 3 lines each. Bullet points appear on same line instead of stacked.

**Current display:**
```
1  First line of tweet 1
2  Second line of tweet 1
3  Third line of tweet 1
4  First line of tweet 2
...
```

**Expected display:**
Each tweet should be in its own card/box OR separated by horizontal lines:
```
┌─────────────────────────────┐
│ 1/7                         │
│ First line of tweet 1       │
│ Second line of tweet 1      │
│ Third line of tweet 1       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 2/7                         │
│ First line of tweet 2       │
│ • Bullet point 1            │
│ • Bullet point 2            │
│ • Bullet point 3            │
└─────────────────────────────┘
```

**Fix:**
- Parse the generated thread content to identify individual tweets
  - Tweets are likely separated by double newlines OR numbered like "1/", "2/", etc.
- Render each tweet in its own card/container with:
  - Tweet number badge (1/7, 2/7, etc.)
  - Proper line breaks preserved
  - Bullet points on separate lines (not inline)
- Add subtle border or background to distinguish tweets
- Show character count per tweet (280 limit)

**Parsing logic hint:**
```typescript
// Split by tweet markers like "1/", "2/", etc. or by double newlines
const tweets = content.split(/\n\n|\d+\/\s/).filter(Boolean);
```

---

## Fix 8: Editing Tools Layout
**File:** `src/components/creator-hub/GenerateMode.tsx` (editing tools section)

**Issue:** 
- Editing tools dropdown goes off bottom of page, can't scroll to see them
- Dropdown feels clunky

**Fix:**
- Replace dropdown with always-visible button row
- Display editing tools as horizontal buttons:
  ```
  [Add Hook] [Humanize] [Shorten] [Add Question] [Make Spicier] [Expand to Thread]
  ```
- If too many for one row, wrap to second row or use smaller buttons
- Ensure the entire thread card + buttons are scrollable (container should scroll, not overflow hidden)
- Add proper padding/margin at bottom so buttons aren't cut off

**Button styling:**
- Smaller, compact buttons
- Icons + short labels
- Match existing button style (dark bg, gold accent on hover)

---

## Summary of Files to Edit

| Fix | Primary File(s) |
|-----|-----------------|
| 1. Pro Status | `creator-hub/page.tsx` or layout |
| 2. Sidebar Collapse | FileSidebar component |
| 3. File Opening | WriteMode.tsx + FileSidebar |
| 4. Save Functionality | WriteMode.tsx |
| 5. New File Button | WriteMode.tsx |
| 6. Auto Thread Length | GenerateMode.tsx |
| 7. Thread Formatting | GenerateMode.tsx |
| 8. Editing Tools | GenerateMode.tsx |

---

## Parallel Work Suggestion

**Agent 1:** Fixes 1, 2 (Pro status + Sidebar) - independent UI changes
**Agent 2:** Fixes 3, 4, 5 (File operations) - related Write mode functionality  
**Agent 3:** Fixes 6, 7, 8 (Generate mode) - all in GenerateMode.tsx

---

## Testing Checklist

After fixes, verify:
- [ ] Upgrade button hidden for Pro users
- [ ] Sidebar stays open, has collapse button
- [ ] Clicking file opens it in editor
- [ ] Save creates/updates file in sidebar
- [ ] New button clears editor for fresh file
- [ ] Alpha Thread auto-selects Thread length
- [ ] Thread displays each tweet in separate box with proper formatting
- [ ] Editing tools visible as buttons, no overflow issues
- [ ] `npm run build` passes with no errors
