// xthread Reply Coach - Popup Script

const XTHREAD_URL = 'https://xthread.io';
const XTHREAD_API = 'https://xthread.io/api';
const WATCHLIST_MAX = 50;

// DOM Elements
const onboardingView = document.getElementById('onboarding-view');
const authView = document.getElementById('auth-view');
const mainView = document.getElementById('main-view');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const userPlan = document.getElementById('user-plan');
const premiumStatus = document.getElementById('premium-status');
const freeStatus = document.getElementById('free-status');
const coachingToday = document.getElementById('coaching-today');
const savedCount = document.getElementById('saved-count');
const statsSection = document.getElementById('stats-section');
const savedPostsList = document.getElementById('saved-posts-list');
const noSaved = document.getElementById('no-saved');
const clearSavedBtn = document.getElementById('clear-saved-btn');

// Watchlist DOM elements
const watchlistList = document.getElementById('watchlist-list');
const watchlistEmpty = document.getElementById('watchlist-empty');
const watchlistBadge = document.getElementById('watchlist-badge');
const savedBadge = document.getElementById('saved-badge');

// Notifications DOM elements
const notificationsList = document.getElementById('notifications-list');
const notificationsEmpty = document.getElementById('notifications-empty');
const notificationsBadge = document.getElementById('notifications-badge');
const markReadBtn = document.getElementById('mark-read-btn');

// Stats DOM elements
const totalReplies = document.getElementById('total-replies');
const conversionRate = document.getElementById('conversion-rate');
const replyHistoryList = document.getElementById('reply-history-list');
const replyHistoryEmpty = document.getElementById('reply-history-empty');
const clearRepliesBtn = document.getElementById('clear-replies-btn');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Onboarding elements
const onboardingNextBtn = document.getElementById('onboarding-next');
const onboardingBackBtn = document.getElementById('onboarding-back');
const onboardingSkipBtn = document.getElementById('onboarding-skip');
const onboardingDots = document.querySelectorAll('.onboarding-dots .dot');
const onboardingSteps = document.querySelectorAll('.onboarding-step');

let currentOnboardingStep = 1;
const totalOnboardingSteps = 4;

// Initialize
async function init() {
  const stored = await chrome.storage.local.get(['xthreadToken', 'xthreadUser', 'isPremium', 'onboardingCompleted']);
  
  if (stored.xthreadToken && stored.xthreadUser) {
    // User is authenticated, show main view
    showMainView(stored.xthreadUser, stored.isPremium);
    refreshUserData(stored.xthreadToken);
  } else if (!stored.onboardingCompleted) {
    // First-time user, show onboarding
    showOnboardingView();
  } else {
    // Onboarding done, but not authenticated
    showAuthView();
  }
  
  // Setup tab switching
  setupTabs();
  
  // Setup onboarding navigation
  setupOnboarding();
  
  // Load watchlist
  loadWatchlist();
  
  // Update badges
  updateBadges();
}

// ============================================================
// Onboarding Functions
// ============================================================

function showOnboardingView() {
  onboardingView.classList.remove('hidden');
  authView.classList.add('hidden');
  mainView.classList.add('hidden');
}

function setupOnboarding() {
  // Next button handler
  if (onboardingNextBtn) {
    onboardingNextBtn.addEventListener('click', () => {
      if (currentOnboardingStep < totalOnboardingSteps) {
        goToOnboardingStep(currentOnboardingStep + 1);
      } else {
        // Last step - complete onboarding
        completeOnboarding();
      }
    });
  }
  
  // Back button handler
  if (onboardingBackBtn) {
    onboardingBackBtn.addEventListener('click', () => {
      if (currentOnboardingStep > 1) {
        goToOnboardingStep(currentOnboardingStep - 1);
      }
    });
  }
  
  // Skip button handler
  if (onboardingSkipBtn) {
    onboardingSkipBtn.addEventListener('click', () => {
      completeOnboarding();
    });
  }
  
  // Dot click handlers
  onboardingDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      goToOnboardingStep(step);
    });
  });
}

function goToOnboardingStep(step) {
  currentOnboardingStep = step;
  
  // Update steps visibility
  onboardingSteps.forEach(s => {
    s.classList.remove('active');
    if (parseInt(s.dataset.step) === step) {
      s.classList.add('active');
    }
  });
  
  // Update dots
  onboardingDots.forEach(dot => {
    const dotStep = parseInt(dot.dataset.step);
    dot.classList.remove('active', 'completed');
    if (dotStep === step) {
      dot.classList.add('active');
    } else if (dotStep < step) {
      dot.classList.add('completed');
    }
  });
  
  // Update back button visibility
  if (onboardingBackBtn) {
    if (step === 1) {
      onboardingBackBtn.classList.add('hidden');
    } else {
      onboardingBackBtn.classList.remove('hidden');
    }
  }
  
  // Update next button text
  if (onboardingNextBtn) {
    if (step === totalOnboardingSteps) {
      onboardingNextBtn.textContent = 'Get Started →';
    } else {
      onboardingNextBtn.textContent = 'Next →';
    }
  }
}

async function completeOnboarding() {
  // Mark onboarding as completed
  await chrome.storage.local.set({ onboardingCompleted: true });
  
  // Transition to auth view
  showAuthView();
}

// Setup tab switching
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Update badge counts
async function updateBadges() {
  const stored = await chrome.storage.local.get(['watchlist', 'savedPosts', 'watchlistNotifications']);
  
  const watchlistCount = stored.watchlist?.length || 0;
  const savedPostsCount = stored.savedPosts?.length || 0;
  const notifications = stored.watchlistNotifications || [];
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (watchlistCount > 0) {
    watchlistBadge.textContent = watchlistCount;
    watchlistBadge.classList.add('visible');
  } else {
    watchlistBadge.classList.remove('visible');
  }
  
  if (savedPostsCount > 0) {
    savedBadge.textContent = savedPostsCount;
    savedBadge.classList.add('visible');
  } else {
    savedBadge.classList.remove('visible');
  }
  
  if (unreadCount > 0) {
    notificationsBadge.textContent = unreadCount;
    notificationsBadge.classList.add('visible');
  } else {
    notificationsBadge.classList.remove('visible');
  }
}

// Show auth view
function showAuthView() {
  authView.classList.remove('hidden');
  mainView.classList.add('hidden');
}

// Show main view
function showMainView(user, isPremium) {
  authView.classList.add('hidden');
  mainView.classList.remove('hidden');
  
  userName.textContent = user.email || user.name || 'User';
  userAvatar.textContent = (user.email || user.name || 'U')[0].toUpperCase();
  userPlan.textContent = isPremium ? 'Premium' : 'Free';
  
  if (isPremium) {
    premiumStatus.classList.remove('hidden');
    freeStatus.classList.add('hidden');
  } else {
    premiumStatus.classList.add('hidden');
    freeStatus.classList.remove('hidden');
  }
  
  loadStats();
  loadSavedPosts();
  loadWatchlist();
  loadNotifications();
  loadReplyHistory();
}

// Refresh user data from API
async function refreshUserData(token) {
  try {
    const response = await fetch(`${XTHREAD_API}/extension/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        await signOut();
        return;
      }
      throw new Error('Failed to fetch user data');
    }
    
    const data = await response.json();
    
    await chrome.storage.local.set({
      xthreadUser: data.user,
      isPremium: data.isPremium
    });
    
    showMainView(data.user, data.isPremium);
    notifyContentScripts(token, data.isPremium);
    
  } catch (err) {
    console.error('Failed to refresh user data:', err);
  }
}

// Load usage stats
async function loadStats() {
  try {
    const stored = await chrome.storage.local.get(['coachingStats', 'savedPosts']);
    
    if (stored.coachingStats) {
      const today = new Date().toISOString().split('T')[0];
      coachingToday.textContent = stored.coachingStats[today] || 0;
    }
    
    const savedPosts = stored.savedPosts || [];
    savedCount.textContent = savedPosts.length;
    
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Load and display saved posts
async function loadSavedPosts() {
  try {
    const stored = await chrome.storage.local.get(['savedPosts']);
    const posts = stored.savedPosts || [];
    
    if (posts.length === 0) {
      noSaved.classList.remove('hidden');
      savedPostsList.innerHTML = '';
      return;
    }
    
    noSaved.classList.add('hidden');
    savedPostsList.innerHTML = posts.slice(0, 5).map((post, index) => `
      <div class="saved-post" data-index="${index}">
        <div class="saved-post-author">${escapeHtml(truncate(post.author, 30))}</div>
        <div class="saved-post-text">${escapeHtml(truncate(post.text, 80))}</div>
        <div class="saved-post-meta">
          <span class="saved-post-date">${formatDate(post.savedAt)}</span>
          <a href="${post.url}" target="_blank" class="saved-post-link">Open →</a>
        </div>
      </div>
    `).join('');
    
    if (posts.length > 5) {
      savedPostsList.innerHTML += `
        <div class="saved-more">
          +${posts.length - 5} more saved posts
        </div>
      `;
    }
    
  } catch (err) {
    console.error('Failed to load saved posts:', err);
  }
}

// Clear all saved posts
async function clearSavedPosts() {
  if (!confirm('Clear all saved posts?')) return;
  
  await chrome.storage.local.set({ savedPosts: [] });
  loadSavedPosts();
  savedCount.textContent = '0';
  updateBadges();
}

// ============================================================
// Watchlist Functions
// ============================================================

// Load and display watchlist
async function loadWatchlist() {
  try {
    const stored = await chrome.storage.local.get(['watchlist']);
    const watchlist = stored.watchlist || [];
    
    if (watchlist.length === 0) {
      watchlistEmpty.classList.remove('hidden');
      watchlistList.innerHTML = '';
      return;
    }
    
    watchlistEmpty.classList.add('hidden');
    watchlistList.innerHTML = watchlist.map((account, index) => `
      <div class="watchlist-item" data-handle="${escapeHtml(account.handle)}">
        <div class="watchlist-avatar">
          ${account.avatar 
            ? `<img src="${escapeHtml(account.avatar)}" alt="${escapeHtml(account.displayName)}" onerror="this.parentElement.innerHTML='${account.displayName[0]?.toUpperCase() || '?'}'">` 
            : account.displayName[0]?.toUpperCase() || '?'}
        </div>
        <div class="watchlist-info">
          <div class="watchlist-name">${escapeHtml(account.displayName)}</div>
          <div class="watchlist-handle">
            <a href="https://x.com/${escapeHtml(account.handle)}" target="_blank">@${escapeHtml(account.handle)}</a>
            <span class="watchlist-added">• Added ${formatDate(account.addedAt)}</span>
          </div>
        </div>
        <div class="watchlist-actions">
          <button class="watchlist-remove-btn" data-handle="${escapeHtml(account.handle)}" title="Remove from watchlist">×</button>
        </div>
      </div>
    `).join('');
    
    // Add remove handlers
    watchlistList.querySelectorAll('.watchlist-remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const handle = btn.dataset.handle;
        await removeFromWatchlist(handle);
      });
    });
    
    // Make items clickable to open profile
    watchlistList.querySelectorAll('.watchlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.watchlist-remove-btn') && !e.target.closest('a')) {
          const handle = item.dataset.handle;
          chrome.tabs.create({ url: `https://x.com/${handle}` });
        }
      });
    });
    
  } catch (err) {
    console.error('Failed to load watchlist:', err);
  }
}

// Remove from watchlist
async function removeFromWatchlist(handle) {
  try {
    const stored = await chrome.storage.local.get(['watchlist']);
    const watchlist = stored.watchlist || [];
    
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    const index = watchlist.findIndex(w => w.handle.toLowerCase() === normalizedHandle);
    
    if (index !== -1) {
      watchlist.splice(index, 1);
      await chrome.storage.local.set({ watchlist });
      
      // Reload UI
      loadWatchlist();
      updateBadges();
      
      // Notify content scripts
      notifyWatchlistUpdated();
    }
  } catch (err) {
    console.error('Failed to remove from watchlist:', err);
  }
}

// Notify content scripts that watchlist was updated
async function notifyWatchlistUpdated() {
  const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
  
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'WATCHLIST_UPDATED' });
    } catch (err) {
      // Tab might not have content script loaded
    }
  }
}

// ============================================================
// Notifications Functions
// ============================================================

// Load and display notifications
async function loadNotifications() {
  try {
    const stored = await chrome.storage.local.get(['watchlistNotifications']);
    const notifications = stored.watchlistNotifications || [];
    
    if (notifications.length === 0) {
      notificationsEmpty.classList.remove('hidden');
      notificationsList.innerHTML = '';
      return;
    }
    
    notificationsEmpty.classList.add('hidden');
    notificationsList.innerHTML = notifications.slice(0, 20).map((notif, index) => `
      <div class="notification-item ${notif.read ? '' : 'unread'}" data-url="${escapeHtml(notif.url)}">
        <div class="notification-avatar">
          ${notif.avatar 
            ? `<img src="${escapeHtml(notif.avatar)}" alt="${escapeHtml(notif.displayName)}" onerror="this.parentElement.innerHTML='${(notif.displayName || '?')[0]?.toUpperCase() || '?'}'">` 
            : (notif.displayName || '?')[0]?.toUpperCase() || '?'}
        </div>
        <div class="notification-content">
          <div class="notification-header">
            <span class="notification-author">${escapeHtml(notif.displayName)}</span>
            <span class="notification-handle">@${escapeHtml(notif.handle)}</span>
            <span class="notification-time">${notif.postAge || formatDate(notif.detectedAt)}</span>
          </div>
          <div class="notification-text">${escapeHtml(truncate(notif.text, 100))}</div>
          ${notif.metrics && Object.keys(notif.metrics).length > 0 ? `
            <div class="notification-metrics">
              ${notif.metrics.replies ? `<span>💬 ${notif.metrics.replies}</span>` : ''}
              ${notif.metrics.retweets ? `<span>🔄 ${notif.metrics.retweets}</span>` : ''}
              ${notif.metrics.likes ? `<span>❤️ ${notif.metrics.likes}</span>` : ''}
            </div>
          ` : ''}
        </div>
        ${!notif.read ? '<div class="notification-unread-dot"></div>' : ''}
      </div>
    `).join('');
    
    if (notifications.length > 20) {
      notificationsList.innerHTML += `
        <div class="notifications-more">
          +${notifications.length - 20} more posts
        </div>
      `;
    }
    
    // Add click handlers to open posts
    notificationsList.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) {
          chrome.tabs.create({ url });
        }
      });
    });
    
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  try {
    const stored = await chrome.storage.local.get(['watchlistNotifications']);
    const notifications = stored.watchlistNotifications || [];
    
    notifications.forEach(n => n.read = true);
    await chrome.storage.local.set({ watchlistNotifications: notifications });
    
    // Reload UI
    loadNotifications();
    updateBadges();
    
    // Update extension badge
    chrome.runtime.sendMessage({ type: 'WATCHLIST_NOTIFICATIONS_READ' });
  } catch (err) {
    console.error('Failed to mark notifications read:', err);
  }
}

// Clear all notifications
async function clearAllNotifications() {
  if (!confirm('Clear all notifications?')) return;
  
  await chrome.storage.local.set({ watchlistNotifications: [] });
  loadNotifications();
  updateBadges();
}

// ============================================================
// Reply History / Performance Tracking Functions
// ============================================================

// Load and display reply history
async function loadReplyHistory() {
  try {
    const stored = await chrome.storage.local.get(['replyHistory']);
    const history = stored.replyHistory || [];
    
    // Update stats
    const total = history.length;
    const confirmed = history.filter(r => r.followedBack === true).length;
    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    
    totalReplies.textContent = total;
    conversionRate.textContent = rate + '%';
    
    if (history.length === 0) {
      replyHistoryEmpty.classList.remove('hidden');
      replyHistoryList.innerHTML = '';
      return;
    }
    
    replyHistoryEmpty.classList.add('hidden');
    replyHistoryList.innerHTML = history.slice(0, 15).map((reply, index) => `
      <div class="reply-item ${reply.followedBack === true ? 'converted' : reply.followedBack === false ? 'not-converted' : ''}" data-index="${index}">
        <div class="reply-header">
          <a href="https://x.com/${escapeHtml(reply.originalAuthorHandle)}" target="_blank" class="reply-author">@${escapeHtml(reply.originalAuthorHandle)}</a>
          <span class="reply-time">${formatDate(reply.repliedAt)}</span>
        </div>
        <div class="reply-original-text">${escapeHtml(truncate(reply.originalText, 60))}</div>
        <div class="reply-your-text">↳ "${escapeHtml(truncate(reply.replyText, 50))}"</div>
        <div class="reply-actions">
          <button class="reply-action-btn ${reply.followedBack === true ? 'active' : ''}" data-url="${escapeHtml(reply.originalPostUrl)}" data-action="yes" title="They followed back!">
            ✓ Followed
          </button>
          <button class="reply-action-btn ${reply.followedBack === false ? 'active' : ''}" data-url="${escapeHtml(reply.originalPostUrl)}" data-action="no" title="They didn't follow">
            ✗ Nope
          </button>
          <a href="${escapeHtml(reply.originalPostUrl)}" target="_blank" class="reply-view-btn">View →</a>
        </div>
      </div>
    `).join('');
    
    if (history.length > 15) {
      replyHistoryList.innerHTML += `
        <div class="reply-history-more">
          +${history.length - 15} more replies tracked
        </div>
      `;
    }
    
    // Add action handlers
    replyHistoryList.querySelectorAll('.reply-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.dataset.url;
        const action = btn.dataset.action;
        await updateReplyFollowStatus(url, action === 'yes');
      });
    });
    
  } catch (err) {
    console.error('Failed to load reply history:', err);
  }
}

// Update reply follow status
async function updateReplyFollowStatus(originalPostUrl, followedBack) {
  try {
    const stored = await chrome.storage.local.get(['replyHistory']);
    const history = stored.replyHistory || [];
    
    const reply = history.find(r => r.originalPostUrl === originalPostUrl);
    if (reply) {
      reply.followedBack = followedBack;
      reply.checkedAt = new Date().toISOString();
      await chrome.storage.local.set({ replyHistory: history });
      
      // Reload UI
      loadReplyHistory();
    }
  } catch (err) {
    console.error('Failed to update reply status:', err);
  }
}

// Clear all reply history
async function clearReplyHistory() {
  if (!confirm('Clear all reply history? This cannot be undone.')) return;
  
  await chrome.storage.local.set({ replyHistory: [] });
  loadReplyHistory();
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Sign in handler
signInBtn.addEventListener('click', () => {
  // Open xthread homepage - user signs in with Google
  // After OAuth, they land on the dashboard
  // Then they need to go to extension-callback to get token
  // OR the extension auto-detects if they visit extension-callback
  chrome.tabs.create({ url: `${XTHREAD_URL}/auth/extension-callback` });
});

// Token paste handler
const tokenInput = document.getElementById('token-input');
const tokenSubmitBtn = document.getElementById('token-submit-btn');

tokenSubmitBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  
  tokenSubmitBtn.textContent = '...';
  tokenSubmitBtn.disabled = true;
  
  try {
    // Verify token with API
    const response = await fetch(`${XTHREAD_API}/extension/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Invalid token');
    }
    
    const data = await response.json();
    
    // Save to storage
    await chrome.storage.local.set({
      xthreadToken: token,
      xthreadUser: data.user,
      isPremium: data.isPremium
    });
    
    // Update UI
    showMainView(data.user, data.isPremium);
    notifyContentScripts(token, data.isPremium);
    
    tokenInput.value = '';
  } catch (err) {
    alert('Invalid token. Please try again.');
    tokenInput.value = '';
  } finally {
    tokenSubmitBtn.textContent = '→';
    tokenSubmitBtn.disabled = false;
  }
});

// Allow Enter key to submit token
tokenInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    tokenSubmitBtn.click();
  }
});

// Sign out handler
signOutBtn.addEventListener('click', async () => {
  await signOut();
});

// Clear saved handler
clearSavedBtn.addEventListener('click', clearSavedPosts);

// Mark notifications read handler
markReadBtn.addEventListener('click', markAllNotificationsRead);

// Clear reply history handler
clearRepliesBtn.addEventListener('click', clearReplyHistory);

async function signOut() {
  await chrome.storage.local.remove(['xthreadToken', 'xthreadUser', 'isPremium', 'coachingStats']);
  notifyContentScripts(null, false);
  showAuthView();
}

// Notify content scripts of auth change
async function notifyContentScripts(token, isPremium) {
  const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
  
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'AUTH_UPDATE',
        token,
        isPremium
      });
    } catch (err) {
      // Tab might not have content script loaded
    }
  }
}

// Listen for auth callback and updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_CALLBACK') {
    handleAuthCallback(message.token);
  }
  if (message.type === 'AUTH_SUCCESS') {
    // Extension auto-grabbed token from callback page
    console.log('[xthread] Auth success received!');
    init(); // Reload everything
  }
  if (message.type === 'UPDATE_BADGE') {
    savedCount.textContent = message.count;
    loadSavedPosts();
    updateBadges();
  }
  if (message.type === 'UPDATE_WATCHLIST_BADGE') {
    loadWatchlist();
    updateBadges();
  }
  if (message.type === 'WATCHLIST_NOTIFICATION_REFRESH') {
    loadNotifications();
    updateBadges();
  }
  if (message.type === 'REPLY_TRACKED') {
    loadReplyHistory();
  }
});

async function handleAuthCallback(token) {
  try {
    const response = await fetch(`${XTHREAD_API}/extension/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const data = await response.json();
    
    await chrome.storage.local.set({
      xthreadToken: token,
      xthreadUser: data.user,
      isPremium: data.isPremium
    });
    
    showMainView(data.user, data.isPremium);
    notifyContentScripts(token, data.isPremium);
    
  } catch (err) {
    console.error('Auth callback error:', err);
  }
}

// Start
init();

// ============================================================
// Learn From My Tweets Feature
// ============================================================

const learnTweetsBtn = document.getElementById('learn-tweets-btn');
const learnStatus = document.getElementById('learn-status');

if (learnTweetsBtn) {
  learnTweetsBtn.addEventListener('click', async () => {
    const stored = await chrome.storage.local.get(['xthreadToken', 'isPremium']);
    
    if (!stored.xthreadToken) {
      showLearnStatus('Please sign in first', 'error');
      return;
    }
    
    // Disable button and show loading
    learnTweetsBtn.disabled = true;
    learnTweetsBtn.innerHTML = '<span class="learn-icon">⏳</span><span>Analyzing...</span>';
    showLearnStatus('Fetching your top tweets and analyzing patterns...', 'loading');
    
    try {
      const response = await fetch(`${XTHREAD_API}/engagement/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stored.xthreadToken}`
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze tweets');
      }
      
      // Show success
      const tweetsAnalyzed = data.patterns?.tweets_analyzed || data.tweetsAnalyzed || 0;
      showLearnStatus(
        `✓ Analyzed ${tweetsAnalyzed} tweets! Your engagement scoring is now personalized.`,
        'success'
      );
      
      // Store that we've learned
      await chrome.storage.local.set({ 
        learnedFromTweets: true,
        learnedAt: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('[xthread] Error learning from tweets:', err);
      showLearnStatus(err.message || 'Failed to analyze tweets. Please try again.', 'error');
    } finally {
      learnTweetsBtn.disabled = false;
      learnTweetsBtn.innerHTML = '<span class="learn-icon">🧠</span><span>Learn from my tweets</span>';
    }
  });
}

function showLearnStatus(message, type) {
  if (!learnStatus) return;
  learnStatus.textContent = message;
  learnStatus.className = `learn-status ${type}`;
  learnStatus.classList.remove('hidden');
}

// Check if user has already learned and update UI accordingly
async function checkLearnedStatus() {
  const stored = await chrome.storage.local.get(['learnedFromTweets', 'learnedAt']);
  if (stored.learnedFromTweets && learnStatus) {
    const learnedDate = new Date(stored.learnedAt);
    const formattedDate = learnedDate.toLocaleDateString();
    showLearnStatus(`✓ Personalized on ${formattedDate}. Click to re-analyze.`, 'success');
  }
}

// Call on init
checkLearnedStatus();
