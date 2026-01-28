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

// Inject the watch button and analyze button on profile page
async function injectWatchButton(handle) {
  // Don't re-inject if already present
  if (document.querySelector('.xthread-watch-btn')) {
    // But do update state if handle changed
    updateWatchButtonState(handle);
    updateAnalyzeButtonState(handle);
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
  
  // Create analyze button
  const analyzeBtn = document.createElement('button');
  analyzeBtn.className = 'xthread-analyze-btn';
  analyzeBtn.setAttribute('data-handle', handle);
  analyzeBtn.innerHTML = `<span class="xthread-analyze-icon">🔍</span><span class="xthread-analyze-text">Analyze</span>`;
  analyzeBtn.title = 'Analyze this account';
  
  // Insert before follow button (analyze first, then watch)
  buttonContainer.insertBefore(analyzeBtn, followContainer);
  buttonContainer.insertBefore(watchBtn, followContainer);
  
  // Watch button click handler
  watchBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleWatchClick(watchBtn, handle);
  });
  
  // Analyze button click handler
  analyzeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleAnalyzeClick(analyzeBtn, handle);
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

// ============================================================
// Account Analyzer Feature
// ============================================================

// Update analyze button state (when navigating between profiles)
function updateAnalyzeButtonState(handle) {
  const analyzeBtn = document.querySelector('.xthread-analyze-btn');
  if (!analyzeBtn) return;
  
  // Update handle reference
  analyzeBtn.setAttribute('data-handle', handle);
  
  // Reset to default state
  analyzeBtn.classList.remove('xthread-loading');
  analyzeBtn.innerHTML = `<span class="xthread-analyze-icon">🔍</span><span class="xthread-analyze-text">Analyze</span>`;
  
  // Close any open analysis panel when switching profiles
  const existingPanel = document.querySelector('.xthread-analysis-panel');
  if (existingPanel) existingPanel.remove();
}

// Handle analyze button click
async function handleAnalyzeClick(btn, handle, forceRefresh = false) {
  if (isAnalyzing) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  if (!isPremium) {
    showToast('Account Analyzer is a premium feature. Upgrade at xthread.io');
    return;
  }
  
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
  btn.innerHTML = `<span class="xthread-analyze-icon">⏳</span><span class="xthread-analyze-text">Analyzing...</span>`;
  
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
    btn.innerHTML = `<span class="xthread-analyze-icon">🔍</span><span class="xthread-analyze-text">Analyze</span>`;
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
  
  // Refresh button
  panel.querySelector('.xthread-refresh-btn').addEventListener('click', async () => {
    panel.remove();
    const analyzeBtn = document.querySelector('.xthread-analyze-btn');
    if (analyzeBtn) {
      await handleAnalyzeClick(analyzeBtn, handle, true);
    }
  });
  
  // Cache info click also refreshes
  panel.querySelector('.xthread-cache-info').addEventListener('click', async () => {
    panel.remove();
    const analyzeBtn = document.querySelector('.xthread-analyze-btn');
    if (analyzeBtn) {
      await handleAnalyzeClick(analyzeBtn, handle, true);
    }
  });
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

// ============================================================
// Algo Analyzer - Score Draft Feature
// ============================================================

// Check for compose modal and inject score button
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
    
    // Check if we already injected
    if (toolbar.querySelector('.xthread-score-btn')) return;
    
    injectScoreButton(toolbar, textarea);
  });
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
  scoreBtn.className = 'xthread-score-btn';
  scoreBtn.type = 'button';
  scoreBtn.setAttribute('aria-label', 'Score your tweet');
  scoreBtn.innerHTML = `
    <span class="xthread-score-icon">📊</span>
    <span class="xthread-score-text">Score</span>
  `;
  scoreBtn.title = 'Analyze your tweet before posting';
  
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
