// xthread Reply Coach - Content Script
// Coaches users on HOW to reply, not what to say

const XTHREAD_API = 'https://xthread.io/api';
const POST_HISTORY_MAX = 20;

// Side panel is now handled by Chrome's sidePanel API
// Content script sends messages to the side panel via chrome.runtime

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
// Watchlist Notifications Module
// ============================================================
const WATCHLIST_NOTIFICATIONS_MAX = 50;

async function getWatchlistNotifications() {
  try {
    const stored = await chrome.storage.local.get(['watchlistNotifications']);
    return stored.watchlistNotifications || [];
  } catch (err) {
    console.debug('[xthread] Error getting watchlist notifications:', err);
    return [];
  }
}

async function addWatchlistNotification(post) {
  try {
    const notifications = await getWatchlistNotifications();
    
    // Check for duplicate (same URL)
    const exists = notifications.some(n => n.url === post.url);
    if (exists) return false;
    
    const newNotification = {
      handle: post.handle,
      displayName: post.displayName,
      avatar: post.avatar,
      text: post.text,
      url: post.url,
      postAge: post.postAge,
      metrics: post.metrics,
      detectedAt: new Date().toISOString(),
      read: false
    };
    
    notifications.unshift(newNotification);
    
    // Keep only last WATCHLIST_NOTIFICATIONS_MAX
    if (notifications.length > WATCHLIST_NOTIFICATIONS_MAX) {
      notifications.splice(WATCHLIST_NOTIFICATIONS_MAX);
    }
    
    await chrome.storage.local.set({ watchlistNotifications: notifications });
    
    // Update badge
    chrome.runtime.sendMessage({ type: 'WATCHLIST_NOTIFICATION_NEW' });
    
    console.debug('[xthread] Added watchlist notification from:', post.handle);
    return true;
  } catch (err) {
    console.debug('[xthread] Error adding watchlist notification:', err);
    return false;
  }
}

async function markNotificationsRead() {
  try {
    const notifications = await getWatchlistNotifications();
    notifications.forEach(n => n.read = true);
    await chrome.storage.local.set({ watchlistNotifications: notifications });
    chrome.runtime.sendMessage({ type: 'WATCHLIST_NOTIFICATIONS_READ' });
  } catch (err) {
    console.debug('[xthread] Error marking notifications read:', err);
  }
}

async function getUnreadNotificationCount() {
  const notifications = await getWatchlistNotifications();
  return notifications.filter(n => !n.read).length;
}

// ============================================================
// Performance Tracking Module - Track Replies
// ============================================================
const REPLY_HISTORY_MAX = 100;

async function getReplyHistory() {
  try {
    const stored = await chrome.storage.local.get(['replyHistory']);
    return stored.replyHistory || [];
  } catch (err) {
    console.debug('[xthread] Error getting reply history:', err);
    return [];
  }
}

async function trackReply(replyData) {
  try {
    const history = await getReplyHistory();
    
    // Check for duplicate (same original post URL)
    const exists = history.some(r => r.originalPostUrl === replyData.originalPostUrl);
    if (exists) {
      console.debug('[xthread] Reply already tracked');
      return false;
    }
    
    const newReply = {
      originalPostUrl: replyData.originalPostUrl,
      originalAuthor: replyData.originalAuthor,
      originalAuthorHandle: replyData.originalAuthorHandle,
      originalText: replyData.originalText,
      replyText: replyData.replyText,
      repliedAt: new Date().toISOString(),
      followedBack: null, // null = unknown, true/false = confirmed
      checkedAt: null
    };
    
    history.unshift(newReply);
    
    // Keep only last REPLY_HISTORY_MAX
    if (history.length > REPLY_HISTORY_MAX) {
      history.splice(REPLY_HISTORY_MAX);
    }
    
    await chrome.storage.local.set({ replyHistory: history });
    
    // Notify popup
    chrome.runtime.sendMessage({ type: 'REPLY_TRACKED' });
    
    console.debug('[xthread] Tracked reply to:', replyData.originalAuthorHandle);
    return true;
  } catch (err) {
    console.debug('[xthread] Error tracking reply:', err);
    return false;
  }
}

async function updateReplyFollowStatus(originalPostUrl, followedBack) {
  try {
    const history = await getReplyHistory();
    const reply = history.find(r => r.originalPostUrl === originalPostUrl);
    
    if (reply) {
      reply.followedBack = followedBack;
      reply.checkedAt = new Date().toISOString();
      await chrome.storage.local.set({ replyHistory: history });
    }
  } catch (err) {
    console.debug('[xthread] Error updating follow status:', err);
  }
}

async function getReplyStats() {
  const history = await getReplyHistory();
  const total = history.length;
  const confirmed = history.filter(r => r.followedBack === true).length;
  const pending = history.filter(r => r.followedBack === null).length;
  
  return {
    total,
    confirmed,
    pending,
    conversionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0
  };
}

// ============================================================
// Post History Module (for Content Coach)
// ============================================================

async function getPostHistory() {
  try {
    const stored = await chrome.storage.local.get(['postHistory']);
    return stored.postHistory || [];
  } catch (err) {
    console.debug('[xthread] Error getting post history:', err);
    return [];
  }
}

async function addToPostHistory(post) {
  try {
    const history = await getPostHistory();
    
    // Check for duplicate (same text)
    const exists = history.some(p => p.text === post.text);
    if (exists) {
      console.debug('[xthread] Post already in history');
      return;
    }
    
    const newEntry = {
      text: post.text,
      postedAt: new Date().toISOString(),
      metrics: post.metrics || null,
      estimatedMetrics: null // Will be updated later when we can scrape
    };
    
    history.unshift(newEntry);
    
    // Keep only last POST_HISTORY_MAX posts
    if (history.length > POST_HISTORY_MAX) {
      history.splice(POST_HISTORY_MAX);
    }
    
    await chrome.storage.local.set({ postHistory: history });
    console.debug('[xthread] Added to post history:', post.text.substring(0, 50) + '...');
  } catch (err) {
    console.debug('[xthread] Error adding to post history:', err);
  }
}

async function updatePostMetrics(text, metrics) {
  try {
    const history = await getPostHistory();
    const entry = history.find(p => p.text === text);
    
    if (entry) {
      entry.estimatedMetrics = metrics;
      entry.metricsUpdatedAt = new Date().toISOString();
      await chrome.storage.local.set({ postHistory: history });
    }
  } catch (err) {
    console.debug('[xthread] Error updating post metrics:', err);
  }
}

// ============================================================
// Account Analysis Cache Module
// ============================================================
const ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedAnalysis(handle) {
  try {
    const stored = await chrome.storage.local.get(['accountAnalysisCache']);
    const cache = stored.accountAnalysisCache || {};
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    const entry = cache[normalizedHandle];
    
    if (entry && (Date.now() - entry.cachedAt) < ANALYSIS_CACHE_TTL) {
      console.debug('[xthread] Using cached analysis for:', normalizedHandle);
      return entry;
    }
    return null;
  } catch (err) {
    console.debug('[xthread] Error getting cached analysis:', err);
    return null;
  }
}

async function cacheAnalysis(handle, analysis) {
  try {
    const stored = await chrome.storage.local.get(['accountAnalysisCache']);
    const cache = stored.accountAnalysisCache || {};
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    
    cache[normalizedHandle] = {
      ...analysis,
      cachedAt: Date.now()
    };
    
    // Keep only last 50 cached analyses to prevent storage bloat
    const entries = Object.entries(cache);
    if (entries.length > 50) {
      entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt);
      const toKeep = entries.slice(0, 50);
      const newCache = Object.fromEntries(toKeep);
      await chrome.storage.local.set({ accountAnalysisCache: newCache });
    } else {
      await chrome.storage.local.set({ accountAnalysisCache: cache });
    }
    
    console.debug('[xthread] Cached analysis for:', normalizedHandle);
  } catch (err) {
    console.debug('[xthread] Error caching analysis:', err);
  }
}

function formatCacheAge(cachedAt) {
  const ageMs = Date.now() - cachedAt;
  const minutes = Math.floor(ageMs / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'just now';
}

// ============================================================
// Main Content Script
// ============================================================

// State
let userToken = null;
let isPremium = false;
let isProcessing = false;
let isAnalyzing = false;
let isScoring = false;
let isCoaching = false;
let currentProfileHandle = null;
let composeObserver = null;

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
  
  // Start scanning for watched account posts
  startWatchlistScanner();
  
  // Listen for URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkProfilePage();
    }
  }).observe(document.body, { childList: true, subtree: true });
  
  // Listen for messages from side panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_REPLY' && window.xthreadCurrentPost) {
      const replyBtn = window.xthreadCurrentPost.querySelector('[data-testid="reply"]');
      if (replyBtn) replyBtn.click();
    }
  });
  
  if (!userToken) {
    console.debug('[xthread] Not authenticated. Click extension icon to sign in.');
  }
}

// ============================================================
// Watchlist Scanner - Detect posts from watched accounts
// ============================================================
let watchlistCache = [];
let lastWatchlistFetch = 0;
const WATCHLIST_CACHE_TTL = 30000; // 30 seconds

async function getCachedWatchlist() {
  const now = Date.now();
  if (now - lastWatchlistFetch > WATCHLIST_CACHE_TTL) {
    watchlistCache = await getWatchlist();
    lastWatchlistFetch = now;
  }
  return watchlistCache;
}

function startWatchlistScanner() {
  // Scan on scroll (debounced)
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(scanForWatchedPosts, 500);
  }, { passive: true });
  
  // Also scan periodically
  setInterval(scanForWatchedPosts, 10000);
  
  // Initial scan after a delay
  setTimeout(scanForWatchedPosts, 2000);
}

async function scanForWatchedPosts() {
  // ONLY scan on home feed - not on profile pages or individual tweets
  // This prevents capturing every historical tweet when browsing someone's profile
  const path = location.pathname;
  const isHomeFeed = path === '/home' || path === '/' || path === '/following';
  if (!isHomeFeed) return;
  
  const watchlist = await getCachedWatchlist();
  if (watchlist.length === 0) return;
  
  // Create a Set of watched handles for fast lookup
  const watchedHandles = new Set(watchlist.map(w => w.handle.toLowerCase()));
  
  // Get all visible posts
  const posts = document.querySelectorAll('article[data-testid="tweet"]');
  
  for (const post of posts) {
    // Skip if already scanned
    if (post.dataset.xthreadWatchlistScanned) continue;
    post.dataset.xthreadWatchlistScanned = 'true';
    
    // Extract author handle
    const authorLink = post.querySelector('a[role="link"][href^="/"]');
    if (!authorLink) continue;
    
    const hrefMatch = authorLink.getAttribute('href')?.match(/^\/([^\/]+)/);
    if (!hrefMatch) continue;
    
    const handle = hrefMatch[1].toLowerCase();
    
    // Skip if not watching this account
    if (!watchedHandles.has(handle)) continue;
    
    // This is a post from a watched account - extract details
    const postData = extractWatchedPostData(post, handle);
    if (postData) {
      await addWatchlistNotification(postData);
      
      // Add visual indicator
      highlightWatchedPost(post, handle);
    }
  }
}

function extractWatchedPostData(post, handle) {
  try {
    // Get display name
    const authorEl = post.querySelector('[data-testid="User-Name"]');
    const displayName = authorEl?.querySelector('span')?.textContent || handle;
    
    // Get avatar
    const avatarImg = post.querySelector('img[src*="profile_images"]');
    const avatar = avatarImg?.src || null;
    
    // Get text
    const textEl = post.querySelector('[data-testid="tweetText"]');
    const text = textEl?.textContent || '';
    
    // Skip if no text (might be a retweet indicator)
    if (!text.trim()) return null;
    
    // Get URL
    const timeEl = post.querySelector('time');
    const url = timeEl?.closest('a')?.href || '';
    
    // Skip if no URL (can't link back to it)
    if (!url) return null;
    
    // Get post age
    const postAge = timeEl?.textContent || '';
    
    // Get metrics
    const metrics = {};
    const replyBtn = post.querySelector('[data-testid="reply"]');
    const retweetBtn = post.querySelector('[data-testid="retweet"]');
    const likeBtn = post.querySelector('[data-testid="like"]');
    
    if (replyBtn) {
      const replyMatch = replyBtn.getAttribute('aria-label')?.match(/(\d+[\d,\.]*[KkMm]?)/);
      if (replyMatch) metrics.replies = replyMatch[1];
    }
    if (retweetBtn) {
      const rtMatch = retweetBtn.getAttribute('aria-label')?.match(/(\d+[\d,\.]*[KkMm]?)/);
      if (rtMatch) metrics.retweets = rtMatch[1];
    }
    if (likeBtn) {
      const likeMatch = likeBtn.getAttribute('aria-label')?.match(/(\d+[\d,\.]*[KkMm]?)/);
      if (likeMatch) metrics.likes = likeMatch[1];
    }
    
    return {
      handle,
      displayName,
      avatar,
      text,
      url,
      postAge,
      metrics
    };
  } catch (err) {
    console.debug('[xthread] Error extracting watched post data:', err);
    return null;
  }
}

function highlightWatchedPost(post, handle) {
  // Don't re-highlight
  if (post.querySelector('.xthread-watched-indicator')) return;
  
  // Add subtle indicator
  const indicator = document.createElement('div');
  indicator.className = 'xthread-watched-indicator';
  indicator.innerHTML = `<span class="xthread-watched-icon">👁</span><span class="xthread-watched-label">Watching</span>`;
  indicator.title = `You're watching @${handle}`;
  
  // Insert at top of post
  const firstChild = post.firstChild;
  if (firstChild) {
    post.insertBefore(indicator, firstChild);
  } else {
    post.appendChild(indicator);
  }
}

// Observe DOM for new posts, profile page changes, and compose modal
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
            
            // Check for compose modal / tweet composer
            if (node.querySelector) {
              const composeArea = node.querySelector('[data-testid="tweetTextarea_0"]');
              if (composeArea) {
                checkComposeModal();
              }
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
  
  // Also check for compose modal on initial load
  setTimeout(checkComposeModal, 1000);
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

// Inject the profile action buttons (icon-only gold circles)
async function injectWatchButton(handle) {
  // Don't re-inject if already present ANYWHERE on page
  const existingBtns = document.querySelectorAll('.xthread-profile-btn');
  if (existingBtns.length > 0) {
    // Update state if handle changed, but don't add more buttons
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
  
  // Double-check this specific container doesn't already have our buttons
  if (buttonContainer.querySelector('.xthread-profile-btn')) return;
  
  // Check if user is watching this account
  const watching = await isWatching(handle);
  
  // SVG icons (16x16 for 32px circles)
  const icons = {
    mic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    loader: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="xthread-spinner"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
  };

  // Create Voice button (Mic icon)
  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'xthread-profile-btn xthread-voice-btn';
  voiceBtn.setAttribute('data-handle', handle);
  voiceBtn.innerHTML = icons.mic;
  voiceBtn.title = 'Add to Voice';

  // Create Stats button (Chart icon) - formerly Top Tweets
  const statsBtn = document.createElement('button');
  statsBtn.className = 'xthread-profile-btn xthread-stats-btn';
  statsBtn.setAttribute('data-handle', handle);
  statsBtn.innerHTML = icons.chart;
  statsBtn.title = 'View Stats';

  // Create Watchlist button (Eye icon) - formerly Watch
  const watchlistBtn = document.createElement('button');
  watchlistBtn.className = 'xthread-profile-btn xthread-watchlist-btn' + (watching ? ' xthread-active' : '');
  watchlistBtn.setAttribute('data-handle', handle);
  watchlistBtn.innerHTML = watching ? icons.check : icons.eye;
  watchlistBtn.title = watching ? 'Remove from Watchlist' : 'Add to Watchlist';
  
  // Insert before follow button: Mic, Stats, Watchlist (left to right)
  buttonContainer.insertBefore(voiceBtn, followContainer);
  buttonContainer.insertBefore(statsBtn, followContainer);
  buttonContainer.insertBefore(watchlistBtn, followContainer);
  
  // Voice button click handler
  voiceBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleVoiceClick(voiceBtn, handle);
  });

  // Stats button click handler (uses existing Top Tweets logic)
  statsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleTopTweetsClick(statsBtn, handle);
  });

  // Watchlist button click handler
  watchlistBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleWatchClick(watchlistBtn, handle);
  });
}

// Update watch button state (when navigating between profiles)
async function updateWatchButtonState(handle) {
  const watchlistBtn = document.querySelector('.xthread-watchlist-btn');
  if (!watchlistBtn) return;
  
  // Update handle reference for all profile buttons
  document.querySelectorAll('.xthread-profile-btn').forEach(btn => {
    btn.setAttribute('data-handle', handle);
  });
  
  const watching = await isWatching(handle);
  watchlistBtn.className = 'xthread-profile-btn xthread-watchlist-btn' + (watching ? ' xthread-active' : '');
  watchlistBtn.innerHTML = watching ? getProfileIcon('check') : getProfileIcon('eye');
  watchlistBtn.title = watching ? 'Remove from Watchlist' : 'Add to Watchlist';
}

// SVG icon helper for profile buttons (16x16 for 32px circles)
function getProfileIcon(name) {
  const icons = {
    mic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    loader: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="xthread-spinner"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
  };
  return icons[name] || '';
}

// Legacy icon helper (used by other parts of the code)
function getIcon(name) {
  const icons = {
    eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    chart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    loader: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="xthread-spinner"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
  };
  return icons[name] || '';
}

// Handle watchlist button click
async function handleWatchClick(btn, handle) {
  const watching = await isWatching(handle);
  
  if (watching) {
    // Remove from watchlist
    const result = await removeFromWatchlist(handle);
    if (result.success) {
      btn.className = 'xthread-profile-btn xthread-watchlist-btn';
      btn.innerHTML = getProfileIcon('eye');
      btn.title = 'Add to Watchlist';
      showToast('Removed from Watchlist');
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
      btn.className = 'xthread-profile-btn xthread-watchlist-btn xthread-active';
      btn.innerHTML = getProfileIcon('check');
      btn.title = 'Remove from Watchlist';
      showToast('Added to Watchlist!');
      
      // Update badge
      updateWatchlistBadge();
    } else {
      showToast(result.error || 'Failed to add');
    }
  }
}

// ============================================================
// Account Analyzer Feature (accessed via side panel)
// ============================================================

// Handle analyze button click
async function handleAnalyzeClick(btn, handle, forceRefresh = false) {
  if (isAnalyzing) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  // Account Analyzer is now FREE for all users!
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedAnalysis(handle);
    if (cached) {
      showAnalysisPanel(handle, cached.analysis, cached.cachedAt);
      return;
    }
  }
  
  isAnalyzing = true;
  btn.classList.add('xthread-loading');
  btn.innerHTML = `<span class="xthread-analyze-icon">${getIcon('loader')}</span><span class="xthread-analyze-text">Analyzing...</span>`;
  
  try {
    // Scrape tweets from profile
    const tweets = scrapeProfileTweets();
    if (tweets.length === 0) {
      showToast('No tweets found. Scroll down to load more tweets first.');
      return;
    }
    
    // Get profile stats
    const profileStats = extractProfileStats();
    
    // Call API
    const analysis = await analyzeAccount(handle, tweets, profileStats);
    
    // Cache the result
    await cacheAnalysis(handle, { analysis });
    
    // Show the panel
    showAnalysisPanel(handle, analysis, Date.now());
    
  } catch (err) {
    console.error('[xthread] Error analyzing account:', err);
    showToast(err.message || 'Failed to analyze account. Please try again.');
  } finally {
    isAnalyzing = false;
    btn.classList.remove('xthread-loading');
    btn.innerHTML = `<span class="xthread-analyze-icon">${getIcon('search')}</span><span class="xthread-analyze-text">Analyze</span>`;
  }
}

// Scrape visible tweets from the profile page
function scrapeProfileTweets() {
  const tweets = [];
  const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
  
  for (const el of tweetElements) {
    // Skip retweets (they have a "Retweeted" indicator)
    const socialContext = el.querySelector('[data-testid="socialContext"]');
    if (socialContext && socialContext.textContent.toLowerCase().includes('retweet')) {
      continue;
    }
    
    // Get tweet text
    const textEl = el.querySelector('[data-testid="tweetText"]');
    const text = textEl?.textContent?.trim() || '';
    
    if (!text) continue;
    
    // Get metrics
    const metrics = {};
    const replyBtn = el.querySelector('[data-testid="reply"]');
    const retweetBtn = el.querySelector('[data-testid="retweet"]');
    const likeBtn = el.querySelector('[data-testid="like"]');
    
    // Extract metric numbers from aria-labels or text content
    if (replyBtn) {
      const replyText = replyBtn.getAttribute('aria-label') || replyBtn.textContent;
      const replyMatch = replyText?.match(/(\d+[\d,\.]*[KkMm]?)/);
      if (replyMatch) metrics.replies = replyMatch[1];
    }
    if (retweetBtn) {
      const rtText = retweetBtn.getAttribute('aria-label') || retweetBtn.textContent;
      const rtMatch = rtText?.match(/(\d+[\d,\.]*[KkMm]?)/);
      if (rtMatch) metrics.retweets = rtMatch[1];
    }
    if (likeBtn) {
      const likeText = likeBtn.getAttribute('aria-label') || likeBtn.textContent;
      const likeMatch = likeText?.match(/(\d+[\d,\.]*[KkMm]?)/);
      if (likeMatch) metrics.likes = likeMatch[1];
    }
    
    tweets.push({ text, metrics });
    
    // Limit to 20 tweets
    if (tweets.length >= 20) break;
  }
  
  console.debug(`[xthread] Scraped ${tweets.length} tweets from profile`);
  return tweets;
}

// Extract profile stats (followers, following, etc.)
function extractProfileStats() {
  const stats = {
    followers: null,
    following: null,
    accountAge: null
  };
  
  // Try to get follower/following counts
  // These are usually in links like /username/followers and /username/following
  const followersLink = document.querySelector(`a[href$="/verified_followers"], a[href$="/followers"]`);
  const followingLink = document.querySelector(`a[href$="/following"]`);
  
  if (followersLink) {
    const text = followersLink.textContent;
    const match = text.match(/([\d,\.]+[KkMm]?)/);
    if (match) stats.followers = match[1];
  }
  
  if (followingLink) {
    const text = followingLink.textContent;
    const match = text.match(/([\d,\.]+[KkMm]?)/);
    if (match) stats.following = match[1];
  }
  
  // Try to get account age from "Joined" date
  const joinedEl = document.querySelector('[data-testid="UserJoinDate"]');
  if (joinedEl) {
    stats.accountAge = joinedEl.textContent.replace('Joined ', '');
  }
  
  return stats;
}

// Call API to analyze account
async function analyzeAccount(handle, tweets, profileStats) {
  const response = await fetch(`${XTHREAD_API}/extension/analyze-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ handle, tweets, profileStats })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }
  
  const data = await response.json();
  return data.analysis;
}

// Show analysis panel UI
function showAnalysisPanel(handle, analysis, cachedAt) {
  // Remove existing panel
  const existing = document.querySelector('.xthread-analysis-panel');
  if (existing) existing.remove();
  
  // Create panel container
  const panel = document.createElement('div');
  panel.className = 'xthread-analysis-panel';
  
  // Build topics HTML
  const topicsHtml = analysis.topics.map(topic => {
    const freqClass = topic.frequency === 'primary' ? 'primary' : 
                      topic.frequency === 'secondary' ? 'secondary' : 'occasional';
    return `<span class="xthread-topic-tag ${freqClass}">${escapeHtml(topic.name)}</span>`;
  }).join('');
  
  // Build characteristics HTML
  const charsHtml = analysis.style.characteristics.map(char => 
    `<li>${escapeHtml(char)}</li>`
  ).join('');
  
  // Build engagement tips HTML
  const tipsHtml = analysis.engagementTips.map(tip => `
    <div class="xthread-tip-card">
      <div class="xthread-tip-approach">${escapeHtml(tip.approach)}</div>
      <div class="xthread-tip-example">"${escapeHtml(tip.example)}"</div>
      <div class="xthread-tip-why">${escapeHtml(tip.why)}</div>
    </div>
  `).join('');
  
  // Build viral content section (if available)
  let viralHtml = '';
  if (analysis.viralContent && analysis.viralContent.pattern) {
    const examplesHtml = analysis.viralContent.examples.map(ex => 
      `<li>${escapeHtml(ex)}</li>`
    ).join('');
    viralHtml = `
      <div class="xthread-analysis-section">
        <div class="xthread-section-title">🔥 What Goes Viral</div>
        <div class="xthread-viral-pattern">${escapeHtml(analysis.viralContent.pattern)}</div>
        ${examplesHtml ? `<ul class="xthread-viral-examples">${examplesHtml}</ul>` : ''}
      </div>
    `;
  }
  
  // Calculate cache age
  const cacheAge = formatCacheAge(cachedAt);
  
  panel.innerHTML = `
    <div class="xthread-analysis-header">
      <div class="xthread-header-left">
        <span class="xthread-logo">🔍 Account Analysis</span>
        <span class="xthread-handle">@${escapeHtml(handle)}</span>
      </div>
      <div class="xthread-header-right">
        <span class="xthread-cache-info" title="Click to refresh">Analyzed ${cacheAge}</span>
        <button class="xthread-refresh-btn" title="Refresh analysis">↻</button>
        <button class="xthread-close-btn">×</button>
      </div>
    </div>
    
    <!-- Summary -->
    <div class="xthread-analysis-summary">
      ${escapeHtml(analysis.summary)}
    </div>
    
    <!-- Quick Stats -->
    <div class="xthread-quick-stats">
      <div class="xthread-stat">
        <span class="xthread-stat-icon">📊</span>
        <span class="xthread-stat-value">${escapeHtml(analysis.quickStats.contentMix)}</span>
      </div>
      <div class="xthread-stat">
        <span class="xthread-stat-icon">⏱️</span>
        <span class="xthread-stat-value">${escapeHtml(analysis.quickStats.postingFrequency)}</span>
      </div>
      <div class="xthread-stat">
        <span class="xthread-stat-icon">👥</span>
        <span class="xthread-stat-value">${escapeHtml(analysis.quickStats.audienceType)}</span>
      </div>
    </div>
    
    <!-- Topics -->
    <div class="xthread-analysis-section">
      <div class="xthread-section-title">📌 Content Focus</div>
      <div class="xthread-topics">
        ${topicsHtml}
      </div>
    </div>
    
    <!-- Voice & Style -->
    <div class="xthread-analysis-section">
      <div class="xthread-section-title">🎭 Voice & Style</div>
      <div class="xthread-voice-badge">${escapeHtml(analysis.style.voice)}</div>
      <ul class="xthread-characteristics">
        ${charsHtml}
      </ul>
      <div class="xthread-engagement-pattern">
        <strong>Engagement:</strong> ${escapeHtml(analysis.style.engagement)}
      </div>
    </div>
    
    ${viralHtml}
    
    <!-- Engagement Tips -->
    <div class="xthread-analysis-section">
      <div class="xthread-section-title">💡 How to Engage</div>
      <div class="xthread-tips">
        ${tipsHtml}
      </div>
    </div>
    
    <div class="xthread-analysis-footer">
      <span class="xthread-powered-by">Powered by xthread.io</span>
    </div>
  `;
  
  // Add to page - find profile header area
  const profileHeader = document.querySelector('[data-testid="UserName"]')?.closest('div[data-testid="UserProfileHeader_Items"]')?.parentElement?.parentElement;
  if (profileHeader) {
    profileHeader.parentElement.insertBefore(panel, profileHeader.nextSibling);
  } else {
    // Fallback: insert after primary column header
    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      const header = primaryColumn.querySelector('nav, [role="navigation"]')?.parentElement;
      if (header) {
        header.parentElement.insertBefore(panel, header.nextSibling);
      } else {
        primaryColumn.insertBefore(panel, primaryColumn.firstChild.nextSibling);
      }
    } else {
      document.body.appendChild(panel);
    }
  }
  
  // Event handlers
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  // Refresh button - directly refresh analysis
  panel.querySelector('.xthread-refresh-btn').addEventListener('click', async () => {
    panel.remove();
    await refreshAnalysis(handle);
  });
  
  // Cache info click also refreshes
  panel.querySelector('.xthread-cache-info').addEventListener('click', async () => {
    panel.remove();
    await refreshAnalysis(handle);
  });
}

// Refresh analysis for a handle (used by analysis panel)
async function refreshAnalysis(handle) {
  if (isAnalyzing) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first.');
    return;
  }
  
  isAnalyzing = true;
  showToast('Refreshing analysis...');
  
  try {
    const tweets = scrapeProfileTweets();
    if (tweets.length === 0) {
      showToast('No tweets found. Scroll down to load more tweets first.');
      return;
    }
    
    const profileStats = extractProfileStats();
    const analysis = await analyzeAccount(handle, tweets, profileStats);
    await cacheAnalysis(handle, { analysis });
    showAnalysisPanel(handle, analysis, Date.now());
  } catch (err) {
    console.error('[xthread] Error refreshing analysis:', err);
    showToast(err.message || 'Failed to refresh analysis.');
  } finally {
    isAnalyzing = false;
  }
}

// ============================================================
// Top Tweets Feature - Show user's best performing tweets
// ============================================================

let isLoadingTopTweets = false;

// Handle Top Tweets button click
async function handleTopTweetsClick(btn, handle) {
  if (isLoadingTopTweets) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  isLoadingTopTweets = true;
  btn.classList.add('xthread-loading');
  btn.innerHTML = getProfileIcon('loader');
  
  try {
    const response = await fetch(`${XTHREAD_API}/extension/user-top-tweets?username=${encodeURIComponent(handle)}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch tweets');
    }
    
    const data = await response.json();
    showTopTweetsPanel(handle, data.user, data.tweets);
    
  } catch (err) {
    console.error('[xthread] Error fetching top tweets:', err);
    showToast(err.message || 'Failed to load stats. Please try again.');
  } finally {
    isLoadingTopTweets = false;
    btn.classList.remove('xthread-loading');
    btn.innerHTML = getProfileIcon('chart');
  }
}

// Show Top Tweets panel
function showTopTweetsPanel(handle, user, tweets) {
  // Remove any existing panel
  const existing = document.querySelector('.xthread-top-tweets-panel');
  if (existing) existing.remove();
  
  // Also close analysis panel if open
  const analysisPanel = document.querySelector('.xthread-analysis-panel');
  if (analysisPanel) analysisPanel.remove();
  
  const panel = document.createElement('div');
  panel.className = 'xthread-top-tweets-panel';
  
  // Build tweets HTML
  const tweetsHtml = tweets.length === 0 
    ? '<div class="xthread-no-tweets">No tweets found for this account.</div>'
    : tweets.slice(0, 20).map((tweet, i) => `
      <div class="xthread-tweet-card" data-tweet-id="${escapeHtml(tweet.id)}" data-tweet-text="${escapeHtml(tweet.text)}" data-tweet-url="${escapeHtml(tweet.url)}">
        <div class="xthread-tweet-rank">#${i + 1}</div>
        <div class="xthread-tweet-content">
          <div class="xthread-tweet-text">${escapeHtml(tweet.text).substring(0, 200)}${tweet.text.length > 200 ? '...' : ''}</div>
          <div class="xthread-tweet-metrics">
            <span class="xthread-metric" title="Replies">💬 ${formatMetric(tweet.reply_count)}</span>
            <span class="xthread-metric" title="Reposts">🔄 ${formatMetric(tweet.repost_count)}</span>
            <span class="xthread-metric" title="Likes">❤️ ${formatMetric(tweet.like_count)}</span>
          </div>
        </div>
        <div class="xthread-tweet-actions">
          <button class="xthread-save-btn" title="Save to inspiration">💾 Save</button>
          <button class="xthread-repurpose-btn" title="Repurpose this tweet">✨ Repurpose</button>
          <a href="${escapeHtml(tweet.url)}" target="_blank" class="xthread-view-btn" title="View on X">↗️</a>
        </div>
      </div>
    `).join('');
  
  panel.innerHTML = `
    <div class="xthread-top-tweets-header">
      <div class="xthread-header-left">
        ${user.profile_image_url ? `<img src="${escapeHtml(user.profile_image_url)}" class="xthread-user-avatar" alt="">` : ''}
        <div>
          <span class="xthread-logo">📊 Top Tweets</span>
          <span class="xthread-handle">@${escapeHtml(handle)}</span>
        </div>
      </div>
      <div class="xthread-header-right">
        <span class="xthread-tweet-count">${tweets.length} tweets • sorted by replies</span>
        <button class="xthread-close-btn">×</button>
      </div>
    </div>
    
    <div class="xthread-top-tweets-info">
      💡 Save tweets to your Inspiration library, or click Repurpose to generate your own version.
    </div>
    
    <div class="xthread-tweets-list">
      ${tweetsHtml}
    </div>
    
    <div class="xthread-top-tweets-footer">
      <span class="xthread-powered-by">Powered by xthread.io</span>
    </div>
  `;
  
  // Insert panel into page
  const profileHeader = document.querySelector('[data-testid="UserName"]')?.closest('div[data-testid="UserProfileHeader_Items"]')?.parentElement?.parentElement;
  if (profileHeader) {
    profileHeader.parentElement.insertBefore(panel, profileHeader.nextSibling);
  } else {
    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    if (primaryColumn) {
      primaryColumn.insertBefore(panel, primaryColumn.firstChild.nextSibling);
    } else {
      document.body.appendChild(panel);
    }
  }
  
  // Close button handler
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  // Save button handlers
  panel.querySelectorAll('.xthread-save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest('.xthread-tweet-card');
      await handleSaveInspirationTweet(btn, card, user);
    });
  });
  
  // Repurpose button handlers
  panel.querySelectorAll('.xthread-repurpose-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest('.xthread-tweet-card');
      handleRepurposeTweet(card, user);
    });
  });
}

// Save tweet to inspiration library
async function handleSaveInspirationTweet(btn, card, user) {
  const tweetId = card.getAttribute('data-tweet-id');
  const tweetText = card.getAttribute('data-tweet-text');
  const tweetUrl = card.getAttribute('data-tweet-url');
  
  // Get metrics from the card
  const metricsEl = card.querySelector('.xthread-tweet-metrics');
  const replyMatch = metricsEl?.textContent?.match(/💬\s*([\d.]+[KM]?)/);
  const repostMatch = metricsEl?.textContent?.match(/🔄\s*([\d.]+[KM]?)/);
  const likeMatch = metricsEl?.textContent?.match(/❤️\s*([\d.]+[KM]?)/);
  
  btn.disabled = true;
  btn.textContent = '⏳';
  
  try {
    const response = await fetch(`${XTHREAD_API}/inspiration-tweets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        tweet_id: tweetId,
        tweet_text: tweetText,
        tweet_url: tweetUrl,
        author_id: user.id,
        author_username: user.username,
        author_name: user.name,
        author_profile_image_url: user.profile_image_url,
        reply_count: parseMetric(replyMatch?.[1] || '0'),
        like_count: parseMetric(likeMatch?.[1] || '0'),
        repost_count: parseMetric(repostMatch?.[1] || '0'),
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 409) {
        showToast('Already saved!');
        btn.textContent = '✓ Saved';
        btn.classList.add('xthread-saved');
        return;
      }
      throw new Error(error.error || 'Failed to save');
    }
    
    btn.textContent = '✓ Saved';
    btn.classList.add('xthread-saved');
    showToast('Saved to Inspiration! 💾');
    
  } catch (err) {
    console.error('[xthread] Error saving inspiration tweet:', err);
    showToast(err.message || 'Failed to save tweet');
    btn.disabled = false;
    btn.textContent = '💾 Save';
  }
}

// Open xthread with tweet for repurposing
function handleRepurposeTweet(card, user) {
  const tweetText = card.getAttribute('data-tweet-text');
  const repurposeUrl = `https://xthread.io/generate?repurpose=${encodeURIComponent(tweetText)}&author=${encodeURIComponent(user.username)}`;
  window.open(repurposeUrl, '_blank');
  showToast('Opening xthread to repurpose... ✨');
}

// Parse metric string like "1.2K" to number
function parseMetric(str) {
  if (!str) return 0;
  str = str.toString().trim();
  if (str.endsWith('K') || str.endsWith('k')) {
    return Math.round(parseFloat(str) * 1000);
  }
  if (str.endsWith('M') || str.endsWith('m')) {
    return Math.round(parseFloat(str) * 1000000);
  }
  return parseInt(str) || 0;
}

// Format metric number for display
function formatMetric(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Extract profile information from the page
function extractProfileInfo() {
  const info = {
    displayName: currentProfileHandle,
    avatar: null,
    bio: ''
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
  
  // Try to get bio
  const bioEl = document.querySelector('[data-testid="UserDescription"]');
  if (bioEl) {
    info.bio = bioEl.textContent.trim();
  }
  
  return info;
}

// ============================================================
// DM Message Templates
// ============================================================

let isLoadingTemplates = false;

async function handleMessageClick(btn, handle) {
  if (isLoadingTemplates) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  isLoadingTemplates = true;
  btn.classList.add('xthread-loading');
  btn.innerHTML = `<span class="xthread-message-icon">${getIcon('loader')}</span><span class="xthread-message-text">Loading...</span>`;
  
  try {
    const response = await fetch(`${XTHREAD_API}/extension/dm-templates`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch templates');
    }
    
    const data = await response.json();
    const templates = data.templates || [];
    
    if (templates.length === 0) {
      showToast('No templates yet. Create one at xthread.io/settings');
      return;
    }
    
    showMessageTemplateModal(handle, templates);
    
  } catch (err) {
    console.error('[xthread] Error fetching templates:', err);
    showToast(err.message || 'Failed to load templates. Please try again.');
  } finally {
    isLoadingTemplates = false;
    btn.classList.remove('xthread-loading');
    btn.innerHTML = `<span class="xthread-message-icon">${getIcon('message')}</span><span class="xthread-message-text">Message</span>`;
  }
}

// Handle "Add to Voice" button click
async function handleVoiceClick(btn, handle) {
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  btn.classList.add('xthread-loading');
  btn.innerHTML = getProfileIcon('loader');
  
  try {
    const response = await fetch(`${XTHREAD_API}/admired-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ username: handle })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to add account');
    }
    
    const data = await response.json();
    
    // Update button to show success
    btn.classList.add('xthread-voice-added');
    btn.innerHTML = getProfileIcon('check');
    showToast(data.message || `Added @${handle} to your voice profile`);
    
    // Reset button after 2 seconds
    setTimeout(() => {
      btn.classList.remove('xthread-voice-added');
      btn.innerHTML = getProfileIcon('mic');
    }, 2000);
    
  } catch (err) {
    console.error('[xthread] Error adding to voice:', err);
    showToast(err.message || 'Failed to add account. Please try again.');
    btn.innerHTML = getProfileIcon('mic');
  } finally {
    btn.classList.remove('xthread-loading');
  }
}

// Show message template selector modal
function showMessageTemplateModal(handle, templates) {
  // Remove any existing modal
  const existing = document.querySelector('.xthread-message-modal');
  if (existing) existing.remove();
  
  const profileInfo = extractProfileInfo();
  
  const modal = document.createElement('div');
  modal.className = 'xthread-message-modal';
  
  const templatesHtml = templates.map((template, i) => `
    <div class="xthread-template-card" data-template-id="${escapeHtml(template.id)}">
      <div class="xthread-template-title">${escapeHtml(template.title)}</div>
      <div class="xthread-template-preview">${escapeHtml(template.message_body).substring(0, 100)}${template.message_body.length > 100 ? '...' : ''}</div>
      ${template.times_used > 0 ? `<div class="xthread-template-usage">Used ${template.times_used}x</div>` : ''}
    </div>
  `).join('');
  
  modal.innerHTML = `
    <div class="xthread-modal-backdrop"></div>
    <div class="xthread-modal-content">
      <div class="xthread-modal-header">
        <span class="xthread-modal-title">💬 Send DM to @${escapeHtml(handle)}</span>
        <button class="xthread-modal-close">×</button>
      </div>
      
      <div class="xthread-modal-body">
        <div class="xthread-template-list">
          ${templatesHtml}
        </div>
        
        <div class="xthread-template-create">
          <a href="https://xthread.io/settings" target="_blank">+ Create new template</a>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close button handler
  modal.querySelector('.xthread-modal-close').addEventListener('click', () => {
    modal.remove();
  });
  
  // Backdrop click handler
  modal.querySelector('.xthread-modal-backdrop').addEventListener('click', () => {
    modal.remove();
  });
  
  // Template card click handlers
  modal.querySelectorAll('.xthread-template-card').forEach(card => {
    card.addEventListener('click', async () => {
      const templateId = card.getAttribute('data-template-id');
      const template = templates.find(t => t.id === templateId);
      if (template) {
        showMessagePreviewModal(handle, template, profileInfo);
        modal.remove();
      }
    });
  });
}

// Show message preview/edit modal before sending
function showMessagePreviewModal(handle, template, profileInfo) {
  // Remove any existing modal
  const existing = document.querySelector('.xthread-message-modal');
  if (existing) existing.remove();
  
  // Replace variables in message
  let message = template.message_body;
  message = message.replace(/\{\{username\}\}/gi, handle);
  message = message.replace(/\{\{display_name\}\}/gi, profileInfo.displayName || handle);
  message = message.replace(/\{\{bio_snippet\}\}/gi, profileInfo.bio ? profileInfo.bio.substring(0, 100) : '');
  
  const modal = document.createElement('div');
  modal.className = 'xthread-message-modal';
  
  modal.innerHTML = `
    <div class="xthread-modal-backdrop"></div>
    <div class="xthread-modal-content xthread-preview-modal">
      <div class="xthread-modal-header">
        <span class="xthread-modal-title">✉️ Preview DM to @${escapeHtml(handle)}</span>
        <button class="xthread-modal-close">×</button>
      </div>
      
      <div class="xthread-modal-body">
        <div class="xthread-message-preview">
          <textarea class="xthread-message-textarea">${escapeHtml(message)}</textarea>
        </div>
        
        <div class="xthread-preview-footer">
          <button class="xthread-copy-btn">📋 Copy</button>
          <button class="xthread-send-btn">✉️ Open DM</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const textarea = modal.querySelector('.xthread-message-textarea');
  
  // Auto-resize textarea
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  
  // Close button handler
  modal.querySelector('.xthread-modal-close').addEventListener('click', () => {
    modal.remove();
  });
  
  // Backdrop click handler
  modal.querySelector('.xthread-modal-backdrop').addEventListener('click', () => {
    modal.remove();
  });
  
  // Copy button handler
  modal.querySelector('.xthread-copy-btn').addEventListener('click', async () => {
    const finalMessage = textarea.value;
    await navigator.clipboard.writeText(finalMessage);
    showToast('Message copied to clipboard! 📋');
    
    // Track usage
    incrementTemplateUsage(template.id);
  });
  
  // Send button handler - opens X DM compose with message
  modal.querySelector('.xthread-send-btn').addEventListener('click', async () => {
    const finalMessage = textarea.value;
    
    // Copy to clipboard first
    await navigator.clipboard.writeText(finalMessage);
    
    // Track usage
    incrementTemplateUsage(template.id);
    
    // Navigate to DM compose page
    // X DM deep link format: https://twitter.com/messages/compose?recipient_id=USER_ID
    // Since we don't have user_id, we'll use the messages page
    const dmUrl = `https://twitter.com/messages/${handle}`;
    window.open(dmUrl, '_blank');
    
    showToast('Message copied! Paste it in the DM. 📋');
    modal.remove();
  });
}

// Increment template usage counter
async function incrementTemplateUsage(templateId) {
  try {
    await fetch(`${XTHREAD_API}/dm-templates/${templateId}/used`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.debug('[xthread] Error incrementing template usage:', err);
  }
}

// Update watchlist badge count
async function updateWatchlistBadge() {
  const watchlist = await getWatchlist();
  chrome.runtime.sendMessage({
    type: 'UPDATE_WATCHLIST_BADGE',
    count: watchlist.length
  });
}

// ============================================================
// Algo Analyzer - Score Draft Feature
// ============================================================

// Check for compose modal and inject score button + ideas button
function checkComposeModal() {
  // Look for tweet compose areas (modal or inline)
  const composeAreas = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
  
  composeAreas.forEach((textarea) => {
    // Find the toolbar with the Post button (closest to textarea)
    // X structure: textarea is nested, toolbar is nearby with tweetButton
    let toolbar = null;
    let searchEl = textarea.parentElement;
    
    // Walk up the DOM to find the toolbar
    for (let i = 0; i < 10 && searchEl; i++) {
      toolbar = searchEl.querySelector('[data-testid="toolBar"]');
      if (toolbar) break;
      searchEl = searchEl.parentElement;
    }
    
    if (!toolbar) {
      console.debug('[xthread] No toolbar found for compose area');
      return;
    }
    
    // Check if we already injected the score button
    if (!toolbar.querySelector('.xthread-score-btn')) {
      injectScoreButton(toolbar, textarea);
    }
    
    // Check if we already injected the ideas button
    if (!toolbar.querySelector('.xthread-ideas-btn')) {
      injectIdeasButton(toolbar, textarea);
    }
  });
  
  // Also check for post submission to track in history
  observePostSubmission();
}

// Inject score button into compose toolbar
function injectScoreButton(toolbar, textarea) {
  // Find the Post button - try multiple selectors
  let postButton = toolbar.querySelector('[data-testid="tweetButton"]');
  if (!postButton) {
    postButton = toolbar.querySelector('[data-testid="tweetButtonInline"]');
  }
  if (!postButton) {
    // Fallback: find a button that looks like the Post button
    const buttons = toolbar.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase();
      if (text && (text.includes('post') || text.includes('reply') || text.includes('tweet'))) {
        postButton = btn;
        break;
      }
    }
  }
  
  // Create score button
  const scoreBtn = document.createElement('button');
  scoreBtn.className = 'xthread-score-btn' + (isPremium ? '' : ' xthread-needs-pro');
  scoreBtn.type = 'button';
  scoreBtn.setAttribute('aria-label', 'Score your tweet');
  scoreBtn.innerHTML = `
    <span class="xthread-score-icon">📊</span>
    <span class="xthread-score-text">Score</span>
    ${!isPremium ? '<span class="xthread-pro-badge">PRO</span>' : ''}
  `;
  scoreBtn.title = isPremium ? 'Analyze your tweet before posting' : 'PRO feature: Analyze your tweet before posting';
  
  // Insert into toolbar
  if (postButton && postButton.parentElement) {
    // Insert before the Post button's container
    const postBtnContainer = postButton.closest('div[class]') || postButton.parentElement;
    if (postBtnContainer && postBtnContainer.parentElement) {
      postBtnContainer.parentElement.insertBefore(scoreBtn, postBtnContainer);
    } else {
      toolbar.insertBefore(scoreBtn, postButton);
    }
  } else {
    // Fallback: append to toolbar
    toolbar.appendChild(scoreBtn);
  }
  
  // Click handler
  scoreBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleScoreDraft(scoreBtn, textarea);
  });
  
  console.debug('[xthread] Score button injected');
}

// Handle score button click
async function handleScoreDraft(btn, textarea) {
  if (isScoring) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  if (!isPremium) {
    showToast('Algo Analyzer is a premium feature. Upgrade at xthread.io');
    return;
  }
  
  // Get the draft text
  const draftText = getDraftText(textarea);
  
  if (!draftText || draftText.trim().length === 0) {
    showToast('Write something first to score your tweet!');
    return;
  }
  
  isScoring = true;
  btn.classList.add('xthread-loading');
  btn.innerHTML = `
    <span class="xthread-score-icon">⏳</span>
    <span class="xthread-score-text">Scoring...</span>
  `;
  
  try {
    // Determine if this is a reply
    const isReply = isReplyComposer(textarea);
    const replyToContext = isReply ? getReplyContext() : null;
    
    // Call API
    const result = await scoreDraft(draftText, isReply ? 'reply' : 'tweet', replyToContext);
    
    // Show score panel
    showScorePanel(btn, result, draftText);
    
  } catch (err) {
    console.error('[xthread] Error scoring draft:', err);
    showToast(err.message || 'Failed to score draft. Please try again.');
  } finally {
    isScoring = false;
    btn.classList.remove('xthread-loading');
    btn.innerHTML = `
      <span class="xthread-score-icon">📊</span>
      <span class="xthread-score-text">Score</span>
    `;
  }
}

// Get draft text from textarea
function getDraftText(textarea) {
  // X uses contenteditable divs, not actual textareas
  // The text is in a div with data-testid="tweetTextarea_0"
  
  // First try: textarea itself might be the editable div
  let editableDiv = textarea;
  if (!editableDiv.matches('[data-testid="tweetTextarea_0"]')) {
    editableDiv = textarea.closest('[data-testid="tweetTextarea_0"]');
  }
  
  if (editableDiv) {
    // Try multiple methods to get text
    
    // Method 1: Look for spans with data-text="true"
    const spans = editableDiv.querySelectorAll('[data-text="true"]');
    if (spans.length > 0) {
      return Array.from(spans).map(span => span.textContent).join('\n');
    }
    
    // Method 2: Get innerText which preserves line breaks better
    if (editableDiv.innerText && editableDiv.innerText.trim()) {
      return editableDiv.innerText.trim();
    }
    
    // Method 3: Get textContent as fallback
    if (editableDiv.textContent && editableDiv.textContent.trim()) {
      return editableDiv.textContent.trim();
    }
  }
  
  // Fallback: search nearby for text content
  let searchEl = textarea.parentElement;
  for (let i = 0; i < 5 && searchEl; i++) {
    const textSpans = searchEl.querySelectorAll('[data-text="true"]');
    if (textSpans.length > 0) {
      return Array.from(textSpans).map(span => span.textContent).join('\n');
    }
    searchEl = searchEl.parentElement;
  }
  
  return '';
}

// Check if this is a reply composer
function isReplyComposer(textarea) {
  // Check if we're in a reply context by looking for reply indicator
  const dialog = textarea.closest('[role="dialog"]');
  if (dialog) {
    // Check for "Replying to" text
    const replyingTo = dialog.querySelector('[data-testid="Tweet-User-Avatar"]');
    if (replyingTo) return true;
  }
  
  // Check URL for reply context
  if (location.pathname.includes('/status/') && location.pathname.includes('/compose/')) {
    return true;
  }
  
  return false;
}

// Get context of the tweet being replied to
function getReplyContext() {
  // Try to find the original tweet in the reply modal
  const dialog = document.querySelector('[role="dialog"]');
  if (dialog) {
    const originalTweet = dialog.querySelector('[data-testid="tweetText"]');
    if (originalTweet) {
      return originalTweet.textContent || '';
    }
  }
  
  // Try to get from the thread view
  const threadTweets = document.querySelectorAll('article[data-testid="tweet"] [data-testid="tweetText"]');
  if (threadTweets.length > 0) {
    return threadTweets[0].textContent || '';
  }
  
  return null;
}

// Call scoring API
async function scoreDraft(text, postType, replyToContext) {
  const response = await fetch(`${XTHREAD_API}/extension/score-draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      text,
      postType,
      replyToContext
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }
  
  const data = await response.json();
  return data.result;
}

// Show score panel
function showScorePanel(btn, result, draftText) {
  // Remove existing panel
  const existingPanel = document.querySelector('.xthread-score-panel');
  if (existingPanel) existingPanel.remove();
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'xthread-score-panel';
  
  // Score color class
  const scoreColorClass = result.scoreColor === 'green' ? 'score-green' :
                          result.scoreColor === 'yellow' ? 'score-yellow' : 'score-red';
  
  // Build factors HTML
  const factorsHtml = result.factors.map(factor => {
    const factorColor = factor.score >= 7 ? 'factor-good' :
                        factor.score >= 4 ? 'factor-medium' : 'factor-weak';
    return `
      <div class="xthread-factor ${factorColor}">
        <div class="xthread-factor-header">
          <span class="xthread-factor-name">${escapeHtml(factor.name)}</span>
          <span class="xthread-factor-score">${factor.score}/10</span>
        </div>
        <div class="xthread-factor-feedback">${escapeHtml(factor.feedback)}</div>
      </div>
    `;
  }).join('');
  
  // Build suggestions HTML
  const suggestionsHtml = result.suggestions.map(suggestion => 
    `<li>${escapeHtml(suggestion)}</li>`
  ).join('');
  
  // Build strengths/weaknesses HTML
  const strengthsHtml = result.strengthsAndWeaknesses.strengths.map(s =>
    `<li class="xthread-strength">✓ ${escapeHtml(s)}</li>`
  ).join('');
  
  const weaknessesHtml = result.strengthsAndWeaknesses.weaknesses.map(w =>
    `<li class="xthread-weakness">✗ ${escapeHtml(w)}</li>`
  ).join('');
  
  // Engagement prediction icon
  const engagementIcon = result.predictedEngagement.primary === 'replies' ? '💬' :
                         result.predictedEngagement.primary === 'retweets' ? '🔄' :
                         result.predictedEngagement.primary === 'likes' ? '❤️' : '✨';
  
  panel.innerHTML = `
    <div class="xthread-score-header">
      <div class="xthread-header-left">
        <span class="xthread-logo">📊 Algo Analyzer</span>
        <span class="xthread-subtitle">How the algorithm sees your tweet</span>
      </div>
      <button class="xthread-close-btn">×</button>
    </div>
    
    <!-- Overall Score -->
    <div class="xthread-overall-score ${scoreColorClass}">
      <div class="xthread-score-circle">
        <span class="xthread-score-number">${result.score}</span>
        <span class="xthread-score-max">/100</span>
      </div>
      <div class="xthread-score-label">
        ${result.score >= 70 ? 'Great! Ready to post' :
          result.score >= 40 ? 'Room for improvement' : 'Needs work'}
      </div>
    </div>
    
    <!-- Predicted Engagement -->
    <div class="xthread-engagement-prediction">
      <div class="xthread-engagement-icon">${engagementIcon}</div>
      <div class="xthread-engagement-info">
        <span class="xthread-engagement-type">Predicted: ${result.predictedEngagement.primary}</span>
        <span class="xthread-engagement-why">${escapeHtml(result.predictedEngagement.explanation)}</span>
      </div>
    </div>
    
    <!-- Factors Breakdown -->
    <div class="xthread-factors-section">
      <div class="xthread-section-title">📈 Factor Breakdown</div>
      <div class="xthread-factors">
        ${factorsHtml}
      </div>
    </div>
    
    <!-- Strengths & Weaknesses -->
    ${(strengthsHtml || weaknessesHtml) ? `
    <div class="xthread-sw-section">
      <div class="xthread-section-title">⚖️ Quick Summary</div>
      <ul class="xthread-sw-list">
        ${strengthsHtml}
        ${weaknessesHtml}
      </ul>
    </div>
    ` : ''}
    
    <!-- Suggestions -->
    <div class="xthread-suggestions-section">
      <div class="xthread-section-title">💡 Suggestions to Improve</div>
      <ul class="xthread-suggestions">
        ${suggestionsHtml}
      </ul>
    </div>
    
    <div class="xthread-score-footer">
      <span class="xthread-algo-tip">💡 Replies are weighted 75x in the algorithm!</span>
    </div>
  `;
  
  // Find where to insert panel
  const composeContainer = btn.closest('[role="dialog"]') || 
                           btn.closest('[data-testid="primaryColumn"]')?.querySelector('div[style*="border"]')?.parentElement ||
                           btn.parentElement?.parentElement?.parentElement;
  
  if (composeContainer) {
    // Insert at the top of compose area
    const toolbar = btn.closest('[data-testid="toolBar"]');
    if (toolbar && toolbar.parentElement) {
      toolbar.parentElement.insertBefore(panel, toolbar.parentElement.firstChild);
    } else {
      composeContainer.insertBefore(panel, composeContainer.firstChild);
    }
  } else {
    // Fallback: append to body as fixed position
    panel.style.position = 'fixed';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.zIndex = '10001';
    document.body.appendChild(panel);
  }
  
  // Close button handler
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
}

// ============================================================
// Content Coach - Ideas Feature
// ============================================================

// Inject ideas button into compose toolbar
function injectIdeasButton(toolbar, textarea) {
  // Create ideas button
  const ideasBtn = document.createElement('button');
  ideasBtn.className = 'xthread-ideas-btn' + (isPremium ? '' : ' xthread-needs-pro');
  ideasBtn.type = 'button';
  ideasBtn.setAttribute('aria-label', 'Get content ideas');
  ideasBtn.innerHTML = `
    <span class="xthread-ideas-icon">💡</span>
    <span class="xthread-ideas-text">Ideas</span>
    ${!isPremium ? '<span class="xthread-pro-badge">PRO</span>' : ''}
  `;
  ideasBtn.title = isPremium ? 'Get personalized content ideas' : 'PRO feature: Get personalized content ideas';
  
  // Find where to insert (before the score button if it exists, or at start of toolbar)
  const scoreBtn = toolbar.querySelector('.xthread-score-btn');
  if (scoreBtn) {
    toolbar.insertBefore(ideasBtn, scoreBtn);
  } else {
    const postButton = toolbar.querySelector('[data-testid="tweetButton"]') ||
                       toolbar.querySelector('[data-testid="tweetButtonInline"]');
    if (postButton && postButton.parentElement) {
      const postBtnContainer = postButton.closest('div[class]') || postButton.parentElement;
      if (postBtnContainer && postBtnContainer.parentElement) {
        postBtnContainer.parentElement.insertBefore(ideasBtn, postBtnContainer);
      } else {
        toolbar.insertBefore(ideasBtn, postButton);
      }
    } else {
      toolbar.appendChild(ideasBtn);
    }
  }
  
  // Click handler
  ideasBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleGetIdeas(ideasBtn, textarea);
  });
  
  console.debug('[xthread] Ideas button injected');
}

// Handle ideas button click
async function handleGetIdeas(btn, textarea) {
  if (isCoaching) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  if (!isPremium) {
    showToast('Content Coach is a premium feature. Upgrade at xthread.io');
    return;
  }
  
  isCoaching = true;
  btn.classList.add('xthread-loading');
  btn.innerHTML = `
    <span class="xthread-ideas-icon">⏳</span>
    <span class="xthread-ideas-text">Loading...</span>
  `;
  
  try {
    // Get post history from local storage
    const postHistory = await getPostHistory();
    
    // Get user's voice profile from storage (if available)
    const stored = await chrome.storage.local.get(['voiceProfile']);
    const voiceProfile = stored.voiceProfile || null;
    
    // Call API
    const result = await getContentCoaching(postHistory, voiceProfile);
    
    // Show content coach panel
    showContentCoachPanel(btn, result, postHistory.length);
    
  } catch (err) {
    console.error('[xthread] Error getting content ideas:', err);
    showToast(err.message || 'Failed to get ideas. Please try again.');
  } finally {
    isCoaching = false;
    btn.classList.remove('xthread-loading');
    btn.innerHTML = `
      <span class="xthread-ideas-icon">💡</span>
      <span class="xthread-ideas-text">Ideas</span>
    `;
  }
}

// Call Content Coach API
async function getContentCoaching(postHistory, voiceProfile) {
  // Map post history to API format
  const recentPosts = postHistory.map(post => ({
    text: post.text,
    metrics: post.estimatedMetrics || post.metrics || null,
    postedAt: post.postedAt
  }));
  
  const response = await fetch(`${XTHREAD_API}/extension/content-coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      recentPosts,
      voiceProfile
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }
  
  const data = await response.json();
  return data.result;
}

// Show Content Coach panel
function showContentCoachPanel(btn, result, postCount) {
  // Remove existing panel
  const existingPanel = document.querySelector('.xthread-coach-panel-ideas');
  if (existingPanel) existingPanel.remove();
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'xthread-coach-panel-ideas';
  
  // Format icons for content ideas
  const formatIcons = {
    'single': '📝',
    'thread': '🧵',
    'question': '❓',
    'hot-take': '🔥',
    'story': '📖'
  };
  
  // Build "What's Working" section
  const whatWorksHtml = `
    <div class="xthread-coach-section">
      <div class="xthread-section-title">✨ What's Working</div>
      ${result.whatWorks.topics.length > 0 ? `
        <div class="xthread-working-row">
          <span class="xthread-working-label">Topics:</span>
          <div class="xthread-tags">
            ${result.whatWorks.topics.map(t => `<span class="xthread-tag topic">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${result.whatWorks.formats.length > 0 ? `
        <div class="xthread-working-row">
          <span class="xthread-working-label">Formats:</span>
          <div class="xthread-tags">
            ${result.whatWorks.formats.map(f => `<span class="xthread-tag format">${escapeHtml(f)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${result.whatWorks.hooks.length > 0 ? `
        <div class="xthread-working-row">
          <span class="xthread-working-label">Hooks:</span>
          <div class="xthread-tags">
            ${result.whatWorks.hooks.map(h => `<span class="xthread-tag hook">${escapeHtml(h)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${postCount === 0 ? '<p class="xthread-no-data">Start posting to see what works for you!</p>' : ''}
    </div>
  `;
  
  // Build "Try This" ideas section
  const ideasHtml = `
    <div class="xthread-coach-section">
      <div class="xthread-section-title">💡 Try This</div>
      <div class="xthread-ideas-list">
        ${result.ideas.map((idea, i) => `
          <div class="xthread-idea-card" data-index="${i}">
            <div class="xthread-idea-header">
              <span class="xthread-idea-format">${formatIcons[idea.format] || '📝'} ${idea.format}</span>
              <span class="xthread-idea-title">${escapeHtml(idea.title)}</span>
            </div>
            <div class="xthread-idea-desc">${escapeHtml(idea.description)}</div>
            <div class="xthread-idea-hook" data-hook="${escapeHtml(idea.hook)}">
              <span class="xthread-hook-label">Hook:</span>
              <span class="xthread-hook-text">"${escapeHtml(idea.hook)}"</span>
              <span class="xthread-copy-hint">Click to copy</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Build "Best Time" section
  const bestTimeHtml = `
    <div class="xthread-coach-section">
      <div class="xthread-section-title">⏰ Best Time to Post</div>
      <div class="xthread-best-times">
        <div class="xthread-time-pills">
          ${result.bestTimes.days.map(d => `<span class="xthread-time-pill day">${escapeHtml(d)}</span>`).join('')}
          ${result.bestTimes.times.map(t => `<span class="xthread-time-pill time">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="xthread-time-reason">${escapeHtml(result.bestTimes.reasoning)}</div>
      </div>
    </div>
  `;
  
  // Build "Voice Check" section
  const voiceHtml = `
    <div class="xthread-coach-section">
      <div class="xthread-section-title">🎭 Voice Check</div>
      <div class="xthread-voice-style">${escapeHtml(result.voiceReminder.style)}</div>
      <ul class="xthread-voice-tips">
        ${result.voiceReminder.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
      </ul>
    </div>
  `;
  
  // Build "Content Gaps" section
  const gapsHtml = result.contentGaps.length > 0 ? `
    <div class="xthread-coach-section">
      <div class="xthread-section-title">📊 Content Gaps</div>
      <ul class="xthread-gaps-list">
        ${result.contentGaps.map(gap => `<li>${escapeHtml(gap)}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  
  panel.innerHTML = `
    <div class="xthread-coach-header">
      <div class="xthread-header-left">
        <span class="xthread-logo">💡 Content Coach</span>
        <span class="xthread-subtitle">Personalized ideas based on ${postCount} post${postCount !== 1 ? 's' : ''}</span>
      </div>
      <button class="xthread-close-btn">×</button>
    </div>
    
    ${whatWorksHtml}
    ${ideasHtml}
    ${bestTimeHtml}
    ${voiceHtml}
    ${gapsHtml}
    
    <div class="xthread-coach-footer">
      <span class="xthread-footer-tip">📝 Your posts are tracked locally to improve suggestions</span>
    </div>
  `;
  
  // Find where to insert panel - inside the compose area
  const composeContainer = btn.closest('[role="dialog"]') || 
                           btn.closest('[data-testid="primaryColumn"]');
  
  if (composeContainer) {
    const toolbar = btn.closest('[data-testid="toolBar"]');
    if (toolbar && toolbar.parentElement) {
      toolbar.parentElement.insertBefore(panel, toolbar.parentElement.firstChild);
    } else {
      composeContainer.insertBefore(panel, composeContainer.firstChild);
    }
  } else {
    // Fallback: append to body as fixed position
    panel.style.position = 'fixed';
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.zIndex = '10001';
    panel.style.maxWidth = '500px';
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'auto';
    document.body.appendChild(panel);
  }
  
  // Close button handler
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  // Hook copy handlers
  panel.querySelectorAll('.xthread-idea-hook').forEach(hookEl => {
    hookEl.addEventListener('click', () => {
      const hookText = hookEl.dataset.hook;
      navigator.clipboard.writeText(hookText);
      hookEl.classList.add('xthread-copied');
      setTimeout(() => hookEl.classList.remove('xthread-copied'), 1500);
      showToast('Hook copied! Paste it in your compose area 📋');
    });
  });
}

// Observe post submission to track in history
function observePostSubmission() {
  // We'll track when the user clicks Post/Tweet button
  // The text should be captured before submission
  
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
    if (!target) return;
    
    // Find the compose textarea
    let toolbar = target.closest('[data-testid="toolBar"]');
    if (!toolbar) return;
    
    // Walk up to find the textarea
    let searchEl = toolbar.parentElement;
    let textarea = null;
    
    for (let i = 0; i < 10 && searchEl; i++) {
      textarea = searchEl.querySelector('[data-testid="tweetTextarea_0"]');
      if (textarea) break;
      searchEl = searchEl.parentElement;
    }
    
    if (!textarea) return;
    
    // Get the text being posted
    const text = getDraftText(textarea);
    if (!text || text.trim().length < 5) return;
    
    // Check if this is a reply
    const isReply = isReplyComposer(textarea);
    
    // Add to history after a short delay (to ensure post goes through)
    setTimeout(async () => {
      await addToPostHistory({ text: text.trim() });
      
      // If this is a reply, also track it for performance analysis
      if (isReply) {
        const replyContext = extractReplyContext();
        if (replyContext) {
          await trackReply({
            originalPostUrl: replyContext.url,
            originalAuthor: replyContext.author,
            originalAuthorHandle: replyContext.handle,
            originalText: replyContext.text,
            replyText: text.trim()
          });
          showToast('Reply tracked! 📊 Check Stats tab to see performance.');
        }
      }
    }, 2000);
  }, true);
}

// Extract context from the tweet being replied to
function extractReplyContext() {
  try {
    // Check if we're in a reply modal
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) {
      // Try to get from thread view (if replying inline)
      return extractReplyContextFromThread();
    }
    
    // Look for the original tweet in the modal
    // The modal typically shows the tweet being replied to
    const originalTweet = dialog.querySelector('[data-testid="tweet"]');
    if (!originalTweet) return null;
    
    // Get author info
    const authorLink = originalTweet.querySelector('a[role="link"][href^="/"]');
    const hrefMatch = authorLink?.getAttribute('href')?.match(/^\/([^\/]+)/);
    const handle = hrefMatch ? hrefMatch[1] : null;
    
    if (!handle) return null;
    
    // Get display name
    const authorEl = originalTweet.querySelector('[data-testid="User-Name"]');
    const author = authorEl?.querySelector('span')?.textContent || handle;
    
    // Get text
    const textEl = originalTweet.querySelector('[data-testid="tweetText"]');
    const text = textEl?.textContent || '';
    
    // Get URL
    const timeEl = originalTweet.querySelector('time');
    const url = timeEl?.closest('a')?.href || window.location.href;
    
    return { handle, author, text, url };
  } catch (err) {
    console.debug('[xthread] Error extracting reply context:', err);
    return null;
  }
}

// Extract reply context when replying in a thread view
function extractReplyContextFromThread() {
  try {
    // If we're on a status page and replying
    if (!location.pathname.includes('/status/')) return null;
    
    // Get the first tweet in the thread (the one being replied to)
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    if (tweets.length === 0) return null;
    
    const originalTweet = tweets[0];
    
    // Get author info
    const authorLink = originalTweet.querySelector('a[role="link"][href^="/"]');
    const hrefMatch = authorLink?.getAttribute('href')?.match(/^\/([^\/]+)/);
    const handle = hrefMatch ? hrefMatch[1] : null;
    
    if (!handle) return null;
    
    // Get display name
    const authorEl = originalTweet.querySelector('[data-testid="User-Name"]');
    const author = authorEl?.querySelector('span')?.textContent || handle;
    
    // Get text
    const textEl = originalTweet.querySelector('[data-testid="tweetText"]');
    const text = textEl?.textContent || '';
    
    // Get URL from the current page
    const url = location.href;
    
    return { handle, author, text, url };
  } catch (err) {
    console.debug('[xthread] Error extracting thread reply context:', err);
    return null;
  }
}

// ============================================================
// Post Buttons & Coaching
// ============================================================

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
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    </button>
    <button class="xthread-save-btn" title="Save for later">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
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
  
  // Reply Coach is now FREE for all users!
  
  isProcessing = true;
  btn.classList.add('xthread-loading');
  
  // Store reference to current post for reply button
  window.xthreadCurrentPost = post;
  
  try {
    const postData = extractPostData(post);
    const coaching = await generateCoaching(postData);
    
    // Send coaching to side panel
    chrome.runtime.sendMessage({
      type: 'SHOW_COACHING',
      coaching: coaching,
      postData: postData
    });
    
    // Open the side panel
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    
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
  
  // Extract author handle from profile link
  const authorLink = post.querySelector('a[role="link"][href^="/"]');
  const hrefMatch = authorLink?.getAttribute('href')?.match(/^\/([^\/]+)/);
  const handle = hrefMatch ? hrefMatch[1] : '';
  
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
  
  // Extract author avatar
  const avatarImg = post.querySelector('img[src*="profile_images"]');
  const avatar = avatarImg?.src || null;
  
  return {
    author,
    handle,
    text,
    metrics,
    url: postLink,
    postAge,
    authorFollowers,
    avatar
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
      <button class="xthread-start-reply-btn">Open X Composer →</button>
      ${isPremium ? `<button class="xthread-quick-post-btn">⚡ Quick Post via xthread</button>` : ''}
    </div>
  `;
  
  // Insert after action bar
  const actionBar = post.querySelector('[role="group"]');
  actionBar.parentNode.insertBefore(panel, actionBar.nextSibling);
  
  // Event handlers
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  // Hook click - copy to clipboard and optionally open quick post
  panel.querySelectorAll('.xthread-hook').forEach(hook => {
    hook.addEventListener('click', () => {
      const text = hook.dataset.text;
      navigator.clipboard.writeText(text);
      hook.classList.add('xthread-copied');
      setTimeout(() => hook.classList.remove('xthread-copied'), 1500);
      
      if (isPremium) {
        // Open quick post modal with hook pre-filled
        showQuickReplyModal(postData, text);
      } else {
        showToast('Hook copied to clipboard!');
      }
    });
  });
  
  // Start reply button (opens X's native composer)
  panel.querySelector('.xthread-start-reply-btn').addEventListener('click', () => {
    openReplyComposer(post);
  });
  
  // Quick post button (posts via xthread API)
  const quickPostBtn = panel.querySelector('.xthread-quick-post-btn');
  if (quickPostBtn) {
    quickPostBtn.addEventListener('click', () => {
      showQuickReplyModal(postData);
    });
  }
  
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

// ============================================================
// Direct Posting via xthread X API
// ============================================================

let isPosting = false;

// Post a reply directly to X via xthread API
async function postReplyViaXthread(replyText, replyToUrl) {
  if (isPosting) return { success: false, error: 'Already posting' };
  
  if (!userToken) {
    return { success: false, error: 'Please sign in to xthread first' };
  }
  
  if (!isPremium) {
    return { success: false, error: 'Premium subscription required for direct posting' };
  }
  
  isPosting = true;
  
  try {
    const response = await fetch(`${XTHREAD_API}/extension/post-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        text: replyText,
        replyToUrl: replyToUrl
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to post' };
    }
    
    return { 
      success: true, 
      tweetId: data.tweet_id,
      text: data.text
    };
    
  } catch (err) {
    console.error('[xthread] Error posting reply:', err);
    return { success: false, error: err.message || 'Network error' };
  } finally {
    isPosting = false;
  }
}

// Show quick reply modal for direct posting
function showQuickReplyModal(postData, hookText = '') {
  // Remove existing modal
  const existing = document.querySelector('.xthread-reply-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.className = 'xthread-reply-modal';
  modal.innerHTML = `
    <div class="xthread-modal-overlay"></div>
    <div class="xthread-modal-content">
      <div class="xthread-modal-header">
        <span class="xthread-modal-title">✨ Quick Reply via xthread</span>
        <button class="xthread-modal-close">×</button>
      </div>
      <div class="xthread-modal-body">
        <div class="xthread-reply-to">
          <span class="xthread-reply-label">Replying to @${escapeHtml(postData.handle)}</span>
          <p class="xthread-reply-preview">${escapeHtml(postData.text.slice(0, 100))}${postData.text.length > 100 ? '...' : ''}</p>
        </div>
        <textarea 
          class="xthread-reply-input" 
          placeholder="Write your reply..."
          maxlength="280"
        >${escapeHtml(hookText)}</textarea>
        <div class="xthread-reply-footer">
          <span class="xthread-char-count">0/280</span>
          <div class="xthread-reply-actions">
            <button class="xthread-cancel-btn">Cancel</button>
            <button class="xthread-post-btn" disabled>Post Reply</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const textarea = modal.querySelector('.xthread-reply-input');
  const charCount = modal.querySelector('.xthread-char-count');
  const postBtn = modal.querySelector('.xthread-post-btn');
  
  // Update char count
  const updateCharCount = () => {
    const len = textarea.value.length;
    charCount.textContent = `${len}/280`;
    postBtn.disabled = len === 0 || len > 280;
    charCount.classList.toggle('xthread-over-limit', len > 280);
  };
  
  textarea.addEventListener('input', updateCharCount);
  updateCharCount();
  
  // Focus textarea
  setTimeout(() => textarea.focus(), 100);
  
  // Close handlers
  modal.querySelector('.xthread-modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('.xthread-modal-overlay').addEventListener('click', () => modal.remove());
  modal.querySelector('.xthread-cancel-btn').addEventListener('click', () => modal.remove());
  
  // Post handler
  postBtn.addEventListener('click', async () => {
    const replyText = textarea.value.trim();
    if (!replyText) return;
    
    postBtn.disabled = true;
    postBtn.textContent = 'Posting...';
    
    const result = await postReplyViaXthread(replyText, postData.url);
    
    if (result.success) {
      showToast('Reply posted! 🎉');
      modal.remove();
      
      // Track the reply
      await trackReply({
        originalPostUrl: postData.url,
        originalAuthor: postData.author,
        originalAuthorHandle: postData.handle,
        originalText: postData.text,
        replyText: replyText
      });
      
    } else {
      showToast(result.error || 'Failed to post');
      postBtn.disabled = false;
      postBtn.textContent = 'Post Reply';
    }
  });
  
  // Escape key to close
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
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
  
  // Fill compose modal with content (from Queue Post button)
  if (message.type === 'FILL_COMPOSE') {
    fillComposeWithContent(message.content);
    sendResponse({ success: true });
  }
});

// Fill the X compose modal with content without page refresh
async function fillComposeWithContent(content) {
  try {
    // Step 1: Copy content to clipboard (always works, preserves formatting)
    await navigator.clipboard.writeText(content);
    console.debug('[xthread] Content copied to clipboard');
    
    // Step 2: Click the compose button to open modal (doesn't refresh page)
    const composeButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') ||
                          document.querySelector('a[href="/compose/post"]') ||
                          document.querySelector('[aria-label="Post"]');
    
    if (composeButton) {
      composeButton.click();
      console.debug('[xthread] Compose button clicked');
      
      // Wait for modal to open
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Show toast notification
      showXthreadToast('Tweet copied! Press Ctrl+V to paste');
    } else {
      // No compose button found, show notification
      showXthreadToast('Tweet copied! Click compose and press Ctrl+V to paste');
    }
  } catch (err) {
    console.error('[xthread] Error:', err);
    showXthreadToast('Error copying tweet. Please try again.');
  }
}

// Show a toast notification on the X page
function showXthreadToast(message) {
  // Remove existing toast
  const existing = document.getElementById('xthread-toast');
  if (existing) existing.remove();
  
  // Create toast
  const toast = document.createElement('div');
  toast.id = 'xthread-toast';
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #1d9bf0;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      ${message}
    </div>
  `;
  document.body.appendChild(toast);
  
  // Auto-remove after 3 seconds
  setTimeout(() => toast.remove(), 3000);
}

// Start
init();
