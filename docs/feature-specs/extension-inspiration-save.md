# Feature Spec: Extension - Save Inspiration
*No X API required - Extension enhancement*

## Overview
Add ability to save any tweet from the feed to xthread for later repurposing. One-click "Save to xthread" that stores the post for the Repurpose feature.

## Current Extension State
The extension already has:
- Watchlist functionality (track accounts)
- Side panel with tabs
- Storage using chrome.storage.local
- API integration with xthread.io

## New Feature: Save Inspiration

### User Flow
1. User browses X feed
2. Sees interesting tweet they want to repurpose
3. Clicks "Save to xthread" button (appears on hover)
4. Toast confirmation: "Saved for repurposing"
5. Later: Opens xthread → Repurpose → sees saved inspirations

### UI - Save Button
Add button to tweet action bar (alongside like, reply, retweet):

```
[💬 Reply] [🔁 Retweet] [❤️ Like] [📥 Save to xthread]
```

Or as a floating button on hover:
```
┌─────────────────────────────────┐
│ Tweet content here...           │
│                                 │
│ @author · 2h                    │
│                    [📥 xthread] │ ← floating button
└─────────────────────────────────┘
```

### Storage Structure
```javascript
// In chrome.storage.local
{
  savedInspirations: [
    {
      id: "uuid",
      text: "The tweet content...",
      author: "@handle",
      authorName: "Display Name",
      url: "https://x.com/handle/status/123",
      savedAt: "2026-01-28T12:00:00Z",
      metrics: {
        likes: 1200,
        replies: 89,
        retweets: 234
      }
    }
  ]
}
```

### Sync with xthread.io
Two options:

**Option A: Local Only (MVP)**
- Store in chrome.storage.local
- Sync to xthread when user opens repurpose page
- Simpler, no backend changes

**Option B: Server Sync (Better)**
- POST to `/api/inspirations` when saving
- Stored in Supabase `inspirations` table
- Available across devices

## Implementation

### Content Script Changes
```javascript
// Add to content.js

const INSPIRATIONS_MAX = 100;

// Inject save button on tweets
function injectSaveButton(tweetElement) {
  const actionBar = tweetElement.querySelector('[role="group"]');
  if (!actionBar || actionBar.querySelector('.xthread-save-btn')) return;
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'xthread-save-btn';
  saveBtn.innerHTML = '📥';
  saveBtn.title = 'Save to xthread';
  saveBtn.onclick = () => saveTweetAsInspiration(tweetElement);
  
  actionBar.appendChild(saveBtn);
}

async function saveTweetAsInspiration(tweetElement) {
  const text = extractTweetText(tweetElement);
  const author = extractAuthor(tweetElement);
  const url = extractTweetUrl(tweetElement);
  const metrics = extractMetrics(tweetElement);
  
  const inspiration = {
    id: crypto.randomUUID(),
    text,
    author: author.handle,
    authorName: author.name,
    url,
    savedAt: new Date().toISOString(),
    metrics
  };
  
  // Save locally
  const stored = await chrome.storage.local.get(['savedInspirations']);
  const inspirations = stored.savedInspirations || [];
  
  if (inspirations.length >= INSPIRATIONS_MAX) {
    inspirations.pop(); // Remove oldest
  }
  
  inspirations.unshift(inspiration);
  await chrome.storage.local.set({ savedInspirations: inspirations });
  
  // Sync to server if authenticated
  const auth = await chrome.storage.local.get(['xthreadToken']);
  if (auth.xthreadToken) {
    await fetch(`${XTHREAD_API}/inspirations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.xthreadToken}`
      },
      body: JSON.stringify(inspiration)
    });
  }
  
  showToast('Saved to xthread! 📥');
}

// MutationObserver to inject buttons on new tweets
const observer = new MutationObserver((mutations) => {
  document.querySelectorAll('[data-testid="tweet"]').forEach(injectSaveButton);
});

observer.observe(document.body, { childList: true, subtree: true });
```

### Side Panel - Saved Tab
Add "Saved" tab to extension side panel:

```javascript
// In sidepanel.js

async function loadSavedInspirations() {
  const stored = await chrome.storage.local.get(['savedInspirations']);
  const inspirations = stored.savedInspirations || [];
  
  const list = document.getElementById('saved-list');
  list.innerHTML = inspirations.map(insp => `
    <div class="saved-item" data-id="${insp.id}">
      <div class="saved-text">${truncate(insp.text, 100)}</div>
      <div class="saved-meta">@${insp.author} · ${formatDate(insp.savedAt)}</div>
      <div class="saved-actions">
        <button onclick="openRepurpose('${insp.id}')">Repurpose</button>
        <button onclick="deleteSaved('${insp.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
```

### Backend Changes
```typescript
// New API route: src/app/api/inspirations/route.ts

export async function POST(request: NextRequest) {
  // Verify auth
  const user = await verifyToken(request);
  if (!user) return unauthorized();
  
  const inspiration = await request.json();
  
  await supabase.from('inspirations').insert({
    user_id: user.id,
    original_text: inspiration.text,
    source_author: inspiration.author,
    source_url: inspiration.url,
    metrics: inspiration.metrics,
    created_at: new Date().toISOString()
  });
  
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const user = await verifyToken(request);
  if (!user) return unauthorized();
  
  const { data } = await supabase
    .from('inspirations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  
  return NextResponse.json(data);
}
```

### Database Migration
```sql
create table inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  original_text text not null,
  source_author text,
  source_url text,
  metrics jsonb,
  tags text[],
  used_at timestamptz, -- when repurposed
  created_at timestamptz default now()
);

alter table inspirations enable row level security;
create policy "Users can CRUD own inspirations" 
  on inspirations for all using (auth.uid() = user_id);

create index on inspirations (user_id, created_at desc);
```

## Integration with Repurpose Feature
In Repurpose Mode, add "From Saved" source option:

```
Source:
○ Paste content
● From Saved Inspirations
○ From my posts

[Select from 12 saved inspirations ▼]
```

## Success Metrics
- Inspirations saved per user
- Repurpose rate (saved → used)
- Extension engagement increase

## Estimated Effort
- Extension changes: 4-6 hours
- Backend API: 2-3 hours
- Frontend integration: 2-3 hours
- Testing: 2 hours
- **Total: ~2 days**
