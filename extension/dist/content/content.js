// xthread Reply Coach - Content Script
// Coaches users on HOW to reply, not what to say

const XTHREAD_API = 'https://xthread.io/api';

// ============================================================
// Watchlist Module (inline to avoid module loading issues)
// ============================================================
const WATCHLIST_MAX = 50;

async function getWatchlist() {
  try {
    const stored = await chrome.storage.local.get(['watchlist']);
    return stored.watchlist || [];
  } catch (err) {
    console.debug('[xthread] Error getting watchlist:', err);
    return [];
  }
}

async function addToWatchlist(account) {
  try {
    const watchlist = await getWatchlist();
    
    if (watchlist.length >= WATCHLIST_MAX) {
      return { 
        success: false, 
        error: `Watchlist is full (max ${WATCHLIST_MAX} accounts). Remove some to add more.` 
      };
    }
    
    const normalizedHandle = account.handle.toLowerCase().replace('@', '');
    const existing = watchlist.find(w => w.handle.toLowerCase() === normalizedHandle);
    if (existing) {
      return { success: false, error: 'Already watching this account' };
    }
    
    const newEntry = {
      handle: normalizedHandle,
      displayName: account.displayName || normalizedHandle,
      avatar: account.avatar || null,
      addedAt: new Date().toISOString(),
      lastChecked: null
    };
    
    watchlist.unshift(newEntry);
    await chrome.storage.local.set({ watchlist });
    
    console.debug('[xthread] Added to watchlist:', normalizedHandle);
    return { success: true };
    
  } catch (err) {
    console.debug('[xthread] Error adding to watchlist:', err);
    return { success: false, error: 'Failed to save to watchlist' };
  }
}

async function removeFromWatchlist(handle) {
  try {
    const watchlist = await getWatchlist();
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    
    const index = watchlist.findIndex(w => w.handle.toLowerCase() === normalizedHandle);
    if (index === -1) {
      return { success: false, error: 'Account not in watchlist' };
    }
    
    watchlist.splice(index, 1);
    await chrome.storage.local.set({ watchlist });
    
    console.debug('[xthread] Removed from watchlist:', normalizedHandle);
    return { success: true };
    
  } catch (err) {
    console.debug('[xthread] Error removing from watchlist:', err);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}

async function isWatching(handle) {
  try {
    const watchlist = await getWatchlist();
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    return watchlist.some(w => w.handle.toLowerCase() === normalizedHandle);
  } catch (err) {
    console.debug('[xthread] Error checking watchlist:', err);
    return false;
  }
}

async function updateWatchlistAvatar(handle, avatar) {
  try {
    const watchlist = await getWatchlist();
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    const entry = watchlist.find(w => w.handle.toLowerCase() === normalizedHandle);
    
    if (entry && avatar && entry.avatar !== avatar) {
      entry.avatar = avatar;
      await chrome.storage.local.set({ watchlist });
    }
  } catch (err) {
    console.debug('[xthread] Error updating avatar:', err);
  }
}

// ============================================================
// Main Content Script
// ============================================================

// State
let userToken = null;
let isPremium = false;
let isProcessing = false;
let currentProfileHandle = null;

// Initialize
async function init() {
  console.debug('[xthread] Reply Coach initializing...');
  
  // Get auth from storage
  const stored = await chrome.storage.local.get(['xthreadToken', 'isPremium']);
  userToken = stored.xthreadToken;
  isPremium = stored.isPremium || false;
  
  // Start observing for DOM changes (posts + profile pages)
  observeDOM();
  
  // Process existing posts
  processExistingPosts();
  
  // Check if on profile page
  checkProfilePage();
  
  // Listen for URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkProfilePage();
    }
  }).observe(document.body, { childList: true, subtree: true });
  
  if (!userToken) {
    console.debug('[xthread] Not authenticated. Click extension icon to sign in.');
  }
}

// Observe DOM for new posts and profile page changes
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for new posts
            const posts = node.querySelectorAll ? 
              node.querySelectorAll('article[data-testid="tweet"]') : [];
            posts.forEach(injectButtons);
            
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              injectButtons(node);
            }
            
            // Check for profile action buttons (Follow button area)
            if (node.querySelector && node.querySelector('[data-testid="placementTracking"]')) {
              checkProfilePage();
            }
          }
        });
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ============================================================
// Profile Page Watch Button
// ============================================================

// Check if we're on a profile page and inject watch button
function checkProfilePage() {
  const profileMatch = location.pathname.match(/^\/([^\/]+)\/?$/);
  
  // Skip non-profile pages
  const nonProfilePaths = ['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i', 'compose'];
  if (!profileMatch || nonProfilePaths.includes(profileMatch[1].toLowerCase())) {
    currentProfileHandle = null;
    return;
  }
  
  const handle = profileMatch[1];
  currentProfileHandle = handle;
  
  // Delay slightly to let DOM settle
  setTimeout(() => injectWatchButton(handle), 500);
}

// Inject the watch button on profile page
async function injectWatchButton(handle) {
  // Don't re-inject if already present
  if (document.querySelector('.xthread-watch-btn')) {
    // But do update state if handle changed
    updateWatchButtonState(handle);
    return;
  }
  
  // Find the Follow button's container
  // X uses [data-testid="placementTracking"] for the follow button area
  const followContainer = document.querySelector('[data-testid="placementTracking"]');
  if (!followContainer) {
    console.debug('[xthread] Follow button container not found');
    return;
  }
  
  // Find parent to insert our button alongside
  const buttonContainer = followContainer.parentElement;
  if (!buttonContainer) return;
  
  // Check if user is watching this account
  const watching = await isWatching(handle);
  
  // Create watch button
  const watchBtn = document.createElement('button');
  watchBtn.className = 'xthread-watch-btn' + (watching ? ' xthread-watching' : '');
  watchBtn.setAttribute('data-handle', handle);
  watchBtn.innerHTML = watching 
    ? `<span class="xthread-watch-icon">✓</span><span class="xthread-watch-text">Watching</span>`
    : `<span class="xthread-watch-icon">👁</span><span class="xthread-watch-text">Watch</span>`;
  watchBtn.title = watching ? 'Remove from watchlist' : 'Add to watchlist';
  
  // Insert before follow button
  buttonContainer.insertBefore(watchBtn, followContainer);
  
  // Click handler
  watchBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleWatchClick(watchBtn, handle);
  });
}

// Update watch button state (when navigating between profiles)
async function updateWatchButtonState(handle) {
  const watchBtn = document.querySelector('.xthread-watch-btn');
  if (!watchBtn) return;
  
  // Update handle reference
  watchBtn.setAttribute('data-handle', handle);
  
  const watching = await isWatching(handle);
  watchBtn.className = 'xthread-watch-btn' + (watching ? ' xthread-watching' : '');
  watchBtn.innerHTML = watching 
    ? `<span class="xthread-watch-icon">✓</span><span class="xthread-watch-text">Watching</span>`
    : `<span class="xthread-watch-icon">👁</span><span class="xthread-watch-text">Watch</span>`;
  watchBtn.title = watching ? 'Remove from watchlist' : 'Add to watchlist';
}

// Handle watch button click
async function handleWatchClick(btn, handle) {
  const watching = await isWatching(handle);
  
  if (watching) {
    // Remove from watchlist
    const result = await removeFromWatchlist(handle);
    if (result.success) {
      btn.className = 'xthread-watch-btn';
      btn.innerHTML = `<span class="xthread-watch-icon">👁</span><span class="xthread-watch-text">Watch</span>`;
      btn.title = 'Add to watchlist';
      showToast('Removed from watchlist');
    } else {
      showToast(result.error || 'Failed to remove');
    }
  } else {
    // Add to watchlist - get profile info
    const profileInfo = extractProfileInfo();
    const result = await addToWatchlist({
      handle: handle,
      displayName: profileInfo.displayName,
      avatar: profileInfo.avatar
    });
    
    if (result.success) {
      btn.className = 'xthread-watch-btn xthread-watching';
      btn.innerHTML = `<span class="xthread-watch-icon">✓</span><span class="xthread-watch-text">Watching</span>`;
      btn.title = 'Remove from watchlist';
      showToast('Added to watchlist! 👁');
      
      // Update badge
      updateWatchlistBadge();
    } else {
      showToast(result.error || 'Failed to add');
    }
  }
}

// Extract profile information from the page
function extractProfileInfo() {
  const info = {
    displayName: currentProfileHandle,
    avatar: null
  };
  
  // Try to get display name from the profile header
  // The display name is usually in a span inside the first h2 on profile pages
  const nameEl = document.querySelector('[data-testid="UserName"] span');
  if (nameEl) {
    info.displayName = nameEl.textContent.trim();
  }
  
  // Try to get avatar
  // Profile avatar has a specific structure
  const avatarEl = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img, a[href$="/photo"] img');
  if (avatarEl && avatarEl.src) {
    info.avatar = avatarEl.src;
  }
  
  return info;
}

// Update watchlist badge count
async function updateWatchlistBadge() {
  const watchlist = await getWatchlist();
  chrome.runtime.sendMessage({
    type: 'UPDATE_WATCHLIST_BADGE',
    count: watchlist.length
  });
}

// Process posts already on page
function processExistingPosts() {
  const posts = document.querySelectorAll('article[data-testid="tweet"]');
  posts.forEach(injectButtons);
}

// Inject buttons into a post
function injectButtons(post) {
  if (post.dataset.xthreadProcessed) return;
  post.dataset.xthreadProcessed = 'true';
  
  const actionBar = post.querySelector('[role="group"]');
  if (!actionBar) return;
  
  // Create button container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'xthread-btn-container';
  btnContainer.innerHTML = `
    <button class="xthread-coach-btn" title="Get reply coaching">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
      <span class="xthread-btn-text">Coach</span>
    </button>
    <button class="xthread-save-btn" title="Save for later">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
  `;
  
  // Coach button handler
  const coachBtn = btnContainer.querySelector('.xthread-coach-btn');
  coachBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleGetCoaching(post, coachBtn);
  });
  
  // Save button handler
  const saveBtn = btnContainer.querySelector('.xthread-save-btn');
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSavePost(post, saveBtn);
  });
  
  // Check if already saved
  checkIfSaved(post, saveBtn);
  
  const lastAction = actionBar.lastElementChild;
  actionBar.insertBefore(btnContainer, lastAction);
}

// Get coaching for a post
async function handleGetCoaching(post, btn) {
  if (isProcessing) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  if (!isPremium) {
    showToast('Reply Coach is a premium feature. Upgrade at xthread.io');
    return;
  }
  
  isProcessing = true;
  btn.classList.add('xthread-loading');
  
  try {
    const postData = extractPostData(post);
    const coaching = await generateCoaching(postData);
    showCoachingPanel(post, coaching, postData);
  } catch (err) {
    console.error('[xthread] Error getting coaching:', err);
    showToast('Failed to get coaching. Please try again.');
  } finally {
    isProcessing = false;
    btn.classList.remove('xthread-loading');
  }
}

// Extract data from a post
function extractPostData(post) {
  const authorEl = post.querySelector('[data-testid="User-Name"]');
  const author = authorEl?.textContent || '';
  
  const textEl = post.querySelector('[data-testid="tweetText"]');
  const text = textEl?.textContent || '';
  
  const metrics = {};
  const replyCount = post.querySelector('[data-testid="reply"]')?.textContent;
  const retweetCount = post.querySelector('[data-testid="retweet"]')?.textContent;
  const likeCount = post.querySelector('[data-testid="like"]')?.textContent;
  
  if (replyCount) metrics.replies = replyCount;
  if (retweetCount) metrics.retweets = retweetCount;
  if (likeCount) metrics.likes = likeCount;
  
  // Get post age
  const timeEl = post.querySelector('time');
  const postAge = timeEl?.textContent || '';
  
  const postLink = timeEl?.closest('a')?.href || window.location.href;
  
  // Try to extract follower count from author info (if visible)
  let authorFollowers = '';
  const followerEl = post.querySelector('[data-testid="UserFollowers"]');
  if (followerEl) {
    authorFollowers = followerEl.textContent;
  }
  
  return {
    author,
    text,
    metrics,
    url: postLink,
    postAge,
    authorFollowers
  };
}

// Call API for coaching
async function generateCoaching(postData) {
  const response = await fetch(`${XTHREAD_API}/extension/generate-replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ post: postData })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }
  
  const data = await response.json();
  return data.coaching;
}

// Show coaching panel UI
function showCoachingPanel(post, coaching, postData) {
  // Remove existing panel
  const existing = post.querySelector('.xthread-coach-panel');
  if (existing) existing.remove();
  
  const panel = document.createElement('div');
  panel.className = 'xthread-coach-panel';
  
  // Header with post score
  const scoreClass = coaching.postScore.score >= 7 ? 'high' : 
                     coaching.postScore.score >= 4 ? 'medium' : 'low';
  const urgencyEmoji = coaching.postScore.timeUrgency === 'high' ? '🔥' :
                       coaching.postScore.timeUrgency === 'medium' ? '⏰' : '📋';
  
  panel.innerHTML = `
    <div class="xthread-panel-header">
      <div class="xthread-header-left">
        <span class="xthread-logo">✨ Reply Coach</span>
        <span class="xthread-tip">Replies are weighted 75x in the algorithm!</span>
      </div>
      <button class="xthread-close-btn">×</button>
    </div>
    
    <!-- Post Score -->
    <div class="xthread-score-section">
      <div class="xthread-score-badge ${scoreClass}">
        <span class="xthread-score-number">${coaching.postScore.score}</span>
        <span class="xthread-score-label">/10</span>
      </div>
      <div class="xthread-score-info">
        <div class="xthread-score-title">
          ${coaching.postScore.worthReplying ? 'Worth Replying' : 'Consider Skipping'}
          <span class="xthread-urgency">${urgencyEmoji} ${coaching.postScore.timeUrgency} urgency</span>
        </div>
        <div class="xthread-score-reasoning">${escapeHtml(coaching.postScore.reasoning)}</div>
      </div>
    </div>
    
    <!-- Recommended Tone -->
    <div class="xthread-tone-section">
      <div class="xthread-section-title">🎯 Recommended Tone</div>
      <div class="xthread-tone-badge">${coaching.toneRecommendation.primary}</div>
      <div class="xthread-tone-why">${escapeHtml(coaching.toneRecommendation.why)}</div>
    </div>
    
    <!-- Strategic Angles -->
    <div class="xthread-angles-section">
      <div class="xthread-section-title">💡 Strategic Angles</div>
      <div class="xthread-angles">
        ${coaching.angles.map((angle, i) => `
          <div class="xthread-angle-card" data-index="${i}">
            <div class="xthread-angle-header">
              <span class="xthread-angle-title">${escapeHtml(angle.title)}</span>
              <span class="xthread-angle-tone">${angle.tone}</span>
            </div>
            <div class="xthread-angle-desc">${escapeHtml(angle.description)}</div>
            ${angle.example ? `<div class="xthread-angle-example">"${escapeHtml(angle.example)}"</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Hook Starters -->
    <div class="xthread-hooks-section">
      <div class="xthread-section-title">🪝 Hook Starters <span class="xthread-hint">(click to copy)</span></div>
      <div class="xthread-hooks">
        ${coaching.hookStarters.map(hook => `
          <div class="xthread-hook" data-text="${escapeHtml(hook.text)}">
            <span class="xthread-hook-text">"${escapeHtml(hook.text)}"</span>
            <span class="xthread-hook-angle">${escapeHtml(hook.angle)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Pitfalls -->
    <div class="xthread-pitfalls-section">
      <div class="xthread-section-title">⚠️ What to Avoid</div>
      <ul class="xthread-pitfalls">
        ${coaching.pitfalls.map(pitfall => `
          <li>${escapeHtml(pitfall)}</li>
        `).join('')}
      </ul>
    </div>
    
    <!-- Action Bar -->
    <div class="xthread-action-bar">
      <button class="xthread-start-reply-btn">Start Writing Reply →</button>
    </div>
  `;
  
  // Insert after action bar
  const actionBar = post.querySelector('[role="group"]');
  actionBar.parentNode.insertBefore(panel, actionBar.nextSibling);
  
  // Event handlers
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  // Hook click to copy
  panel.querySelectorAll('.xthread-hook').forEach(hook => {
    hook.addEventListener('click', () => {
      const text = hook.dataset.text;
      navigator.clipboard.writeText(text);
      hook.classList.add('xthread-copied');
      setTimeout(() => hook.classList.remove('xthread-copied'), 1500);
      showToast('Hook copied to clipboard!');
    });
  });
  
  // Start reply button
  panel.querySelector('.xthread-start-reply-btn').addEventListener('click', () => {
    openReplyComposer(post);
  });
  
  // Angle card expansion
  panel.querySelectorAll('.xthread-angle-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('xthread-expanded');
    });
  });
}

// Open X's reply composer
function openReplyComposer(post) {
  const replyBtn = post.querySelector('[data-testid="reply"]');
  if (replyBtn) {
    replyBtn.click();
  }
}

// Save post for later
async function handleSavePost(post, btn) {
  const postData = extractPostData(post);
  
  // Get current saved posts
  const stored = await chrome.storage.local.get(['savedPosts']);
  const savedPosts = stored.savedPosts || [];
  
  // Check if already saved
  const existingIndex = savedPosts.findIndex(p => p.url === postData.url);
  
  if (existingIndex >= 0) {
    // Remove from saved
    savedPosts.splice(existingIndex, 1);
    btn.classList.remove('xthread-saved');
    showToast('Removed from saved posts');
  } else {
    // Add to saved
    savedPosts.unshift({
      ...postData,
      savedAt: new Date().toISOString()
    });
    btn.classList.add('xthread-saved');
    showToast('Saved for later! 📌');
  }
  
  // Keep only last 100 posts
  if (savedPosts.length > 100) {
    savedPosts.splice(100);
  }
  
  await chrome.storage.local.set({ savedPosts });
  
  // Update popup badge
  updateSavedCount(savedPosts.length);
}

// Check if post is already saved
async function checkIfSaved(post, btn) {
  const postData = extractPostData(post);
  const stored = await chrome.storage.local.get(['savedPosts']);
  const savedPosts = stored.savedPosts || [];
  
  if (savedPosts.some(p => p.url === postData.url)) {
    btn.classList.add('xthread-saved');
  }
}

// Update saved count in extension badge
function updateSavedCount(count) {
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    count: count
  });
}

// Show toast notification
function showToast(message) {
  const existing = document.querySelector('.xthread-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'xthread-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('xthread-toast-visible'), 10);
  setTimeout(() => {
    toast.classList.remove('xthread-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for auth updates and watchlist updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_UPDATE') {
    userToken = message.token;
    isPremium = message.isPremium;
    console.debug('[xthread] Auth updated:', { isPremium });
  }
  
  // Refresh watch button state when watchlist changes from popup
  if (message.type === 'WATCHLIST_UPDATED') {
    if (currentProfileHandle) {
      updateWatchButtonState(currentProfileHandle);
    }
  }
});

// Start
init();
