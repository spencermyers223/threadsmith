# xthread Extension ↔ Website Seamless Integration Plan

## 🎯 Vision
The extension should feel like an **extension of xthread.io**, not a separate tool. Every action in the extension should sync with the website, and website features should be accessible while browsing X.

## 🔗 Core Integration Points

### 1. Style Templates Integration
**Goal:** Users can build Style Templates while browsing X

#### Features:
- **"Add to Style Template"** button on every tweet
  - Shows dropdown of user's existing Style Templates
  - Option to create new Style Template with this account as base
  - Tweet saved with URL and timestamp
  
- **Profile "Voice" Button** Enhancement
  - Dropdown: "Create Style Template" / "Add to Existing"
  - Shows which Style Templates already include this account
  - Quick analysis trigger for Opus AI

#### API Endpoints Needed:
```
GET  /api/extension/style-templates - List user's templates
POST /api/extension/style-templates/:id/tweets - Add tweet to template
POST /api/extension/style-templates - Create new template
```

### 2. Inspiration Library Sync
**Goal:** Save tweets directly to website's Inspiration Library

#### Current State:
- Top Tweets panel saves to `inspiration_tweets` ✅
- Individual tweets while scrolling: saved locally only ❌

#### Enhancement:
- Add "💾 Save" button to each tweet while scrolling
- Saves directly to website's `inspiration_tweets` table
- Shows confirmation with link to view in xthread.io
- Filter by saved source (extension vs website)

### 3. Quick Content Actions
**Goal:** Bridge scrolling X → creating content in xthread

#### New Actions on Tweets:
- **"✨ Create Similar"** → Opens xthread.io/generate with tweet as inspiration
- **"🔄 Repurpose"** → Opens xthread.io/generate?repurpose=...
- **"📋 Use as Template"** → Adds to Style Template tweet examples

### 4. Queue Tab Enhancement
**Goal:** Full control of scheduled posts from extension

#### Features:
- **Post Now** button → Copies content, opens X compose
- **Edit in xthread** → Opens post in website editor
- **Quick Reschedule** → Date picker in extension
- **Preview** → Show formatted content (threads show as thread)
- **Real-time sync** → Updates when posting from website

### 5. Side Panel Redesign

#### New Tab Structure:
```
┌─────────────────────────────────────┐
│  [Coach] [Inspire] [Styles] [Queue] │
│  [Watchlist]                        │
└─────────────────────────────────────┘
```

**Coach Tab** (existing)
- Reply coaching suggestions

**Inspire Tab** (NEW)
- Browse saved inspiration tweets from website
- Quick search/filter
- One-click repurpose

**Styles Tab** (NEW)
- View all Style Templates
- See which accounts are tracked
- Quick add current profile to template
- View AI analysis summaries

**Queue Tab** (enhanced)
- Scheduled posts with actions
- DM templates toggle
- Quick copy/post actions

**Watchlist Tab** (existing)
- Category-based watchlist

### 6. Profile Page Integration

#### Current Buttons:
- 🎤 Voice (Add to Voice)
- 📊 Stats (Top Tweets)
- 👁 Watchlist

#### Enhanced:
- **🎤 Voice** → Dropdown menu:
  - "Create Style Template"
  - "Add to [Template Name]" (for each existing template)
  - "Analyze Writing Style" (Opus AI)
  
- **📊 Stats** → Same (Top Tweets panel)
  - Add "Save All Top 10" bulk action
  
- **👁 Watchlist** → Same
  - Show which templates include this account

### 7. Universal Tweet Actions

#### Small xthread icon on every tweet:
```
┌──────────────────────────────┐
│ Tweet content...             │
│                              │
│ 💬 🔄 ❤️  ⬆️  [x] ← xthread │
└──────────────────────────────┘
```

Clicking [x] shows menu:
- Save to Inspiration
- Add to Style Template →
- Create Similar
- Get Reply Tips (Coach)

### 8. Real-time Sync

#### Chrome Storage → Website API:
- Style Templates: Sync on every add
- Inspiration: Sync immediately
- Watchlist: Sync categories and accounts
- Queue: Poll every 30s for updates

#### Website → Extension:
- New scheduled post → Badge update
- Template update → Side panel refresh

## 🛠 Implementation Phases

### Phase 1: Foundation (Current Sprint)
1. ✅ Add profile_data columns to style_templates
2. [ ] Create extension API endpoints for Style Templates
3. [ ] Add "Add to Style Template" button on tweets
4. [ ] Enhance Voice button with dropdown

### Phase 2: Side Panel Redesign
1. [ ] Add Styles tab
2. [ ] Add Inspire tab
3. [ ] Enhance Queue tab
4. [ ] Update tab navigation

### Phase 3: Universal Actions
1. [ ] Add xthread icon to all tweets
2. [ ] Quick action menu
3. [ ] Keyboard shortcuts

### Phase 4: Sync & Polish
1. [ ] Real-time sync improvements
2. [ ] Offline support
3. [ ] Performance optimization

## 📁 Files to Modify

### Extension:
- `content.js` - Tweet buttons, profile buttons
- `sidepanel.js` - New tabs, enhanced features
- `sidepanel.html` - Tab structure
- `sidepanel.css` - New styles
- `background.js` - Sync logic
- `styles/content.css` - Tweet button styles

### Website API:
- `/api/extension/style-templates/route.ts` (NEW)
- `/api/extension/style-templates/[id]/tweets/route.ts` (NEW)
- `/api/extension/inspiration/route.ts` (enhance)

## 🎨 UI Guidelines

### Button Styling:
- Gold circle buttons on profiles (existing)
- Small, subtle xthread icon on tweets (new)
- Consistent dropdown menus
- xthread brand color: #f59e0b (gold)

### Side Panel:
- Tabs: Icon + short text
- Cards: Consistent styling
- Actions: Primary gold, secondary gray
- Loading states for all async operations

---
*Last Updated: 2026-02-03*
