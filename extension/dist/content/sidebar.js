// xthread Sidebar Component
// Persistent sidebar panel with all features (Coach, Feed, Stats, Watch, Saved)

let sidebarElement = null;
let isSidebarOpen = false;
let currentTab = 'coach';
let userToken = null;
let isPremium = false;
let userEmail = null;

// Sidebar configuration
const SIDEBAR_WIDTH = 380;

/**
 * Initialize the sidebar - call once when content script loads
 */
function initSidebar() {
  if (sidebarElement) return;
  
  // Get auth state
  chrome.storage.local.get(['xthreadToken', 'isPremium', 'userEmail'], (stored) => {
    userToken = stored.xthreadToken;
    isPremium = stored.isPremium || false;
    userEmail = stored.userEmail || null;
  });
  
  // Create sidebar container
  sidebarElement = document.createElement('div');
  sidebarElement.id = 'xthread-sidebar';
  sidebarElement.className = 'xthread-sidebar';
  sidebarElement.innerHTML = `
    <div class="xthread-sidebar-header">
      <div class="xthread-sidebar-brand">
        <svg class="xthread-sidebar-logo" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span class="xthread-sidebar-title">xthread</span>
      </div>
      <div class="xthread-sidebar-actions">
        <button class="xthread-sidebar-close" title="Close sidebar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Tabs -->
    <div class="xthread-sidebar-tabs">
      <button class="xthread-tab active" data-tab="coach">
        <span class="xthread-tab-icon">🎯</span>
        <span class="xthread-tab-label">Coach</span>
      </button>
      <button class="xthread-tab" data-tab="feed">
        <span class="xthread-tab-icon">🔔</span>
        <span class="xthread-tab-label">Feed</span>
        <span class="xthread-tab-badge" id="feed-badge"></span>
      </button>
      <button class="xthread-tab" data-tab="stats">
        <span class="xthread-tab-icon">📈</span>
        <span class="xthread-tab-label">Stats</span>
      </button>
      <button class="xthread-tab" data-tab="watch">
        <span class="xthread-tab-icon">👁</span>
        <span class="xthread-tab-label">Watch</span>
      </button>
      <button class="xthread-tab" data-tab="saved">
        <span class="xthread-tab-icon">📌</span>
        <span class="xthread-tab-label">Saved</span>
      </button>
    </div>
    
    <div class="xthread-sidebar-content">
      <div class="xthread-sidebar-empty">
        <div class="xthread-sidebar-empty-icon">✨</div>
        <div class="xthread-sidebar-empty-text">Click "Coach" on any tweet to get personalized reply coaching</div>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(sidebarElement);
  
  // Close button handler
  sidebarElement.querySelector('.xthread-sidebar-close').addEventListener('click', closeSidebar);
  
  // Tab click handlers
  sidebarElement.querySelectorAll('.xthread-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Prevent clicks inside sidebar from bubbling
  sidebarElement.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  console.debug('[xthread] Sidebar initialized');
}

/**
 * Switch to a different tab
 */
function switchTab(tabName) {
  currentTab = tabName;
  
  // Update active tab styling
  sidebarElement.querySelectorAll('.xthread-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Load tab content
  switch (tabName) {
    case 'coach':
      setSidebarContent('empty');
      break;
    case 'feed':
      loadFeedTab();
      break;
    case 'stats':
      loadStatsTab();
      break;
    case 'watch':
      loadWatchTab();
      break;
    case 'saved':
      loadSavedTab();
      break;
  }
}

/**
 * Open the sidebar
 */
function openSidebar() {
  if (!sidebarElement) initSidebar();
  
  sidebarElement.classList.add('xthread-sidebar-open');
  isSidebarOpen = true;
  
  // Adjust page layout to make room for sidebar
  adjustPageLayout(true);
}

/**
 * Close the sidebar
 */
function closeSidebar() {
  if (!sidebarElement) return;
  
  sidebarElement.classList.remove('xthread-sidebar-open');
  isSidebarOpen = false;
  
  // Reset page layout
  adjustPageLayout(false);
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  if (isSidebarOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/**
 * Check if sidebar is currently open
 */
function isSidebarVisible() {
  return isSidebarOpen;
}

/**
 * Adjust the main page layout when sidebar opens/closes
 */
function adjustPageLayout(sidebarOpen) {
  const sidebarColumn = document.querySelector('[data-testid="sidebarColumn"]');
  
  if (sidebarOpen) {
    document.body.classList.add('xthread-sidebar-active');
    if (sidebarColumn) {
      sidebarColumn.style.display = 'none';
    }
  } else {
    document.body.classList.remove('xthread-sidebar-active');
    if (sidebarColumn) {
      sidebarColumn.style.display = '';
    }
  }
}

/**
 * Set sidebar content - main function for updating what's shown
 */
function setSidebarContent(type, data = {}) {
  if (!sidebarElement) initSidebar();
  
  const contentArea = sidebarElement.querySelector('.xthread-sidebar-content');
  if (!contentArea) return;
  
  switch (type) {
    case 'loading':
      contentArea.innerHTML = renderLoadingContent(data.message || 'Loading...');
      break;
    
    case 'coach':
      contentArea.innerHTML = renderCoachContent(data.coaching, data.postData);
      attachCoachEventHandlers(contentArea, data.post);
      break;
    
    case 'feed':
      contentArea.innerHTML = renderFeedContent(data.notifications || []);
      attachFeedEventHandlers(contentArea);
      break;
    
    case 'stats':
      contentArea.innerHTML = renderStatsContent(data.stats || {}, data.history || []);
      attachStatsEventHandlers(contentArea);
      break;
    
    case 'watch':
      contentArea.innerHTML = renderWatchContent(data.watchlist || []);
      attachWatchEventHandlers(contentArea);
      break;
    
    case 'saved':
      contentArea.innerHTML = renderSavedContent(data.posts || []);
      attachSavedEventHandlers(contentArea);
      break;
    
    case 'error':
      contentArea.innerHTML = renderErrorContent(data.message || 'Something went wrong');
      break;
    
    case 'empty':
    default:
      contentArea.innerHTML = renderEmptyContent();
      break;
  }
}

// ============================================================
// Tab Loaders
// ============================================================

async function loadFeedTab() {
  setSidebarContent('loading', { message: 'Loading feed...' });
  
  try {
    const stored = await chrome.storage.local.get(['watchlistNotifications']);
    const notifications = stored.watchlistNotifications || [];
    setSidebarContent('feed', { notifications });
    
    // Mark as read
    await chrome.storage.local.get(['watchlistNotifications'], async (result) => {
      const notifs = result.watchlistNotifications || [];
      notifs.forEach(n => n.read = true);
      await chrome.storage.local.set({ watchlistNotifications: notifs });
    });
    
    // Update badge
    updateFeedBadge(0);
  } catch (err) {
    setSidebarContent('error', { message: 'Failed to load feed' });
  }
}

async function loadStatsTab() {
  setSidebarContent('loading', { message: 'Loading stats...' });
  
  try {
    const stored = await chrome.storage.local.get(['replyHistory']);
    const history = stored.replyHistory || [];
    
    const total = history.length;
    const confirmed = history.filter(r => r.followedBack === true).length;
    const pending = history.filter(r => r.followedBack === null).length;
    const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    
    setSidebarContent('stats', {
      stats: { total, confirmed, pending, conversionRate },
      history
    });
  } catch (err) {
    setSidebarContent('error', { message: 'Failed to load stats' });
  }
}

async function loadWatchTab() {
  setSidebarContent('loading', { message: 'Loading watchlist...' });
  
  try {
    const stored = await chrome.storage.local.get(['watchlist']);
    const watchlist = stored.watchlist || [];
    setSidebarContent('watch', { watchlist });
  } catch (err) {
    setSidebarContent('error', { message: 'Failed to load watchlist' });
  }
}

async function loadSavedTab() {
  setSidebarContent('loading', { message: 'Loading saved posts...' });
  
  try {
    const stored = await chrome.storage.local.get(['savedPosts']);
    const posts = stored.savedPosts || [];
    setSidebarContent('saved', { posts });
  } catch (err) {
    setSidebarContent('error', { message: 'Failed to load saved posts' });
  }
}

// ============================================================
// Content Renderers
// ============================================================

function renderLoadingContent(message) {
  return `
    <div class="xthread-sidebar-loading">
      <div class="xthread-loading-spinner"></div>
      <div class="xthread-loading-text">${escapeHtml(message)}</div>
    </div>
  `;
}

function renderEmptyContent() {
  return `
    <div class="xthread-sidebar-empty">
      <div class="xthread-sidebar-empty-icon">✨</div>
      <div class="xthread-sidebar-empty-text">Click "Coach" on any tweet to get personalized reply coaching</div>
    </div>
  `;
}

function renderErrorContent(message) {
  return `
    <div class="xthread-sidebar-error">
      <div class="xthread-error-icon">⚠️</div>
      <div class="xthread-error-text">${escapeHtml(message)}</div>
    </div>
  `;
}

function renderCoachContent(coaching, postData) {
  const scoreClass = coaching.postScore.score >= 7 ? 'high' : 
                     coaching.postScore.score >= 4 ? 'medium' : 'low';
  const urgencyEmoji = coaching.postScore.timeUrgency === 'high' ? '🔥' :
                       coaching.postScore.timeUrgency === 'medium' ? '⏰' : '📋';
  
  return `
    <div class="xthread-coach-context">
      <div class="xthread-context-label">Coaching for reply to:</div>
      <div class="xthread-context-author">@${escapeHtml(extractHandle(postData.author))}</div>
      <div class="xthread-context-text">${escapeHtml(truncateText(postData.text, 100))}</div>
    </div>
    
    <div class="xthread-score-card ${scoreClass}">
      <div class="xthread-score-left">
        <div class="xthread-score-number">${coaching.postScore.score}</div>
        <div class="xthread-score-label">/10</div>
      </div>
      <div class="xthread-score-right">
        <div class="xthread-score-title">
          ${coaching.postScore.worthReplying ? 'Worth Replying' : 'Consider Skipping'}
          <span class="xthread-urgency-badge">${urgencyEmoji} ${coaching.postScore.timeUrgency} urgency</span>
        </div>
        <div class="xthread-score-reason">${escapeHtml(coaching.postScore.reasoning)}</div>
      </div>
    </div>
    
    <div class="xthread-algo-tip-banner">
      <span class="xthread-tip-icon">💡</span>
      <span class="xthread-tip-text">Replies are weighted <strong>75x</strong> in the algorithm!</span>
    </div>
    
    <div class="xthread-section">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">🎯</span>
        <span class="xthread-section-title">Recommended Tone</span>
      </div>
      <div class="xthread-tone-pill">${escapeHtml(coaching.toneRecommendation.primary)}</div>
      <div class="xthread-tone-reason">${escapeHtml(coaching.toneRecommendation.why)}</div>
    </div>
    
    <div class="xthread-section">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">💡</span>
        <span class="xthread-section-title">Strategic Angles</span>
      </div>
      <div class="xthread-angles-list">
        ${coaching.angles.map((angle, i) => `
          <div class="xthread-angle-item" data-index="${i}">
            <div class="xthread-angle-header">
              <span class="xthread-angle-name">${escapeHtml(angle.title)}</span>
              <span class="xthread-angle-tone-badge">${escapeHtml(angle.tone)}</span>
            </div>
            <div class="xthread-angle-desc">${escapeHtml(angle.description)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="xthread-section">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">🪝</span>
        <span class="xthread-section-title">Hook Starters</span>
        <span class="xthread-section-hint">(click to copy)</span>
      </div>
      <div class="xthread-hooks-list">
        ${coaching.hookStarters.map(hook => `
          <div class="xthread-hook-item" data-text="${escapeHtml(hook.text)}">
            <span class="xthread-hook-text">"${escapeHtml(hook.text)}"</span>
            <span class="xthread-hook-source">${escapeHtml(hook.angle)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="xthread-section xthread-section-warning">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">⚠️</span>
        <span class="xthread-section-title">What to Avoid</span>
      </div>
      <ul class="xthread-avoid-list">
        ${coaching.pitfalls.map(pitfall => `
          <li>${escapeHtml(pitfall)}</li>
        `).join('')}
      </ul>
    </div>
    
    <div class="xthread-cta-section">
      <button class="xthread-start-reply-btn">
        Start Writing Reply
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  `;
}

function renderFeedContent(notifications) {
  if (notifications.length === 0) {
    return `
      <div class="xthread-feed-empty">
        <div class="xthread-empty-icon">🔔</div>
        <div class="xthread-empty-title">No posts yet</div>
        <div class="xthread-empty-desc">Posts from accounts you're watching will appear here as you browse X.</div>
      </div>
    `;
  }
  
  return `
    <div class="xthread-feed-header">
      <span class="xthread-feed-subtitle">Recent posts from your watchlist</span>
    </div>
    <div class="xthread-feed-list">
      ${notifications.slice(0, 20).map(notif => `
        <div class="xthread-feed-item ${notif.read ? '' : 'unread'}" data-url="${escapeHtml(notif.url)}">
          <div class="xthread-feed-avatar">
            ${notif.avatar ? `<img src="${escapeHtml(notif.avatar)}" alt="">` : notif.handle.charAt(0).toUpperCase()}
          </div>
          <div class="xthread-feed-content">
            <div class="xthread-feed-meta">
              <span class="xthread-feed-author">${escapeHtml(notif.displayName)}</span>
              <span class="xthread-feed-handle">@${escapeHtml(notif.handle)}</span>
              <span class="xthread-feed-time">${escapeHtml(notif.postAge || '')}</span>
            </div>
            <div class="xthread-feed-text">${escapeHtml(truncateText(notif.text, 120))}</div>
            ${notif.metrics ? `
              <div class="xthread-feed-metrics">
                ${notif.metrics.replies ? `<span>💬 ${notif.metrics.replies}</span>` : ''}
                ${notif.metrics.retweets ? `<span>🔄 ${notif.metrics.retweets}</span>` : ''}
                ${notif.metrics.likes ? `<span>❤️ ${notif.metrics.likes}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderStatsContent(stats, history) {
  return `
    <div class="xthread-stats-overview">
      <div class="xthread-stat-card">
        <div class="xthread-stat-value">${stats.total || 0}</div>
        <div class="xthread-stat-label">Replies Tracked</div>
      </div>
      <div class="xthread-stat-card highlight">
        <div class="xthread-stat-value">${stats.conversionRate || 0}%</div>
        <div class="xthread-stat-label">Conversion Rate</div>
      </div>
    </div>
    
    <div class="xthread-stats-section">
      <div class="xthread-stats-header">
        <span class="xthread-stats-title">Reply History</span>
        <button class="xthread-clear-btn" id="clear-replies-btn">Clear all</button>
      </div>
      
      ${history.length === 0 ? `
        <div class="xthread-stats-empty">
          <div class="xthread-empty-icon">📈</div>
          <div class="xthread-empty-title">No replies tracked</div>
          <div class="xthread-empty-desc">Your replies will be tracked automatically when you reply to posts.</div>
        </div>
      ` : `
        <div class="xthread-reply-list">
          ${history.slice(0, 15).map(reply => `
            <div class="xthread-reply-item ${reply.followedBack === true ? 'converted' : reply.followedBack === false ? 'not-converted' : ''}">
              <div class="xthread-reply-header">
                <a href="https://x.com/${escapeHtml(reply.originalAuthorHandle)}" target="_blank" class="xthread-reply-author">@${escapeHtml(reply.originalAuthorHandle)}</a>
                <span class="xthread-reply-time">${formatTimeAgo(reply.repliedAt)}</span>
              </div>
              <div class="xthread-reply-original">${escapeHtml(truncateText(reply.originalText || '', 60))}</div>
              <div class="xthread-reply-yours">"${escapeHtml(truncateText(reply.replyText || '', 60))}"</div>
              <div class="xthread-reply-actions">
                <span class="xthread-reply-label">Followed back?</span>
                <button class="xthread-reply-btn ${reply.followedBack === true ? 'active' : ''}" data-action="yes" data-url="${escapeHtml(reply.originalPostUrl)}">Yes</button>
                <button class="xthread-reply-btn ${reply.followedBack === false ? 'active' : ''}" data-action="no" data-url="${escapeHtml(reply.originalPostUrl)}">No</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
    
    <div class="xthread-stats-tip">
      💡 <strong>Tip:</strong> Track which replies lead to follows to optimize your engagement strategy!
    </div>
  `;
}

function renderWatchContent(watchlist) {
  if (watchlist.length === 0) {
    return `
      <div class="xthread-watch-empty">
        <div class="xthread-empty-icon">👁</div>
        <div class="xthread-empty-title">No accounts yet</div>
        <div class="xthread-empty-desc">Add accounts to your watchlist by clicking the <strong>👁 Watch</strong> button on their profile page.</div>
      </div>
    `;
  }
  
  return `
    <div class="xthread-watch-header">
      <span class="xthread-watch-subtitle">Track your favorite creators (${watchlist.length}/50)</span>
    </div>
    <div class="xthread-watch-list">
      ${watchlist.map(account => `
        <div class="xthread-watch-item" data-handle="${escapeHtml(account.handle)}">
          <div class="xthread-watch-avatar">
            ${account.avatar ? `<img src="${escapeHtml(account.avatar)}" alt="">` : account.handle.charAt(0).toUpperCase()}
          </div>
          <div class="xthread-watch-info">
            <div class="xthread-watch-name">${escapeHtml(account.displayName || account.handle)}</div>
            <a href="https://x.com/${escapeHtml(account.handle)}" target="_blank" class="xthread-watch-handle">@${escapeHtml(account.handle)}</a>
          </div>
          <button class="xthread-watch-remove" data-handle="${escapeHtml(account.handle)}" title="Remove from watchlist">×</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSavedContent(posts) {
  if (posts.length === 0) {
    return `
      <div class="xthread-saved-empty">
        <div class="xthread-empty-icon">📌</div>
        <div class="xthread-empty-title">No saved posts</div>
        <div class="xthread-empty-desc">Click the bookmark icon on any post to save it for later.</div>
      </div>
    `;
  }
  
  return `
    <div class="xthread-saved-header">
      <span class="xthread-saved-subtitle">Posts you've bookmarked (${posts.length})</span>
      <button class="xthread-clear-btn" id="clear-saved-btn">Clear all</button>
    </div>
    <div class="xthread-saved-list">
      ${posts.slice(0, 20).map(post => `
        <div class="xthread-saved-item" data-url="${escapeHtml(post.url)}">
          <div class="xthread-saved-author">${escapeHtml(post.author)}</div>
          <div class="xthread-saved-text">${escapeHtml(truncateText(post.text, 100))}</div>
          <div class="xthread-saved-meta">
            <span class="xthread-saved-date">${formatTimeAgo(post.savedAt)}</span>
            <a href="${escapeHtml(post.url)}" target="_blank" class="xthread-saved-link">View on X →</a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================
// Event Handlers
// ============================================================

function attachCoachEventHandlers(contentArea, post) {
  // Hook click to copy
  contentArea.querySelectorAll('.xthread-hook-item').forEach(hook => {
    hook.addEventListener('click', () => {
      const text = hook.dataset.text;
      navigator.clipboard.writeText(text);
      hook.classList.add('xthread-copied');
      showToast('Hook copied to clipboard!');
      setTimeout(() => hook.classList.remove('xthread-copied'), 1500);
    });
  });
  
  // Start reply button
  const startReplyBtn = contentArea.querySelector('.xthread-start-reply-btn');
  if (startReplyBtn && post) {
    startReplyBtn.addEventListener('click', () => {
      const replyBtn = post.querySelector('[data-testid="reply"]');
      if (replyBtn) {
        replyBtn.click();
      }
    });
  }
}

function attachFeedEventHandlers(contentArea) {
  contentArea.querySelectorAll('.xthread-feed-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) window.open(url, '_blank');
    });
  });
}

function attachStatsEventHandlers(contentArea) {
  // Clear replies button
  const clearBtn = contentArea.querySelector('#clear-replies-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Clear all reply history?')) {
        await chrome.storage.local.set({ replyHistory: [] });
        loadStatsTab();
        showToast('Reply history cleared');
      }
    });
  }
  
  // Follow status buttons
  contentArea.querySelectorAll('.xthread-reply-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const url = btn.dataset.url;
      const followedBack = action === 'yes';
      
      const stored = await chrome.storage.local.get(['replyHistory']);
      const history = stored.replyHistory || [];
      const reply = history.find(r => r.originalPostUrl === url);
      
      if (reply) {
        reply.followedBack = followedBack;
        reply.checkedAt = new Date().toISOString();
        await chrome.storage.local.set({ replyHistory: history });
        loadStatsTab();
      }
    });
  });
}

function attachWatchEventHandlers(contentArea) {
  contentArea.querySelectorAll('.xthread-watch-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const handle = btn.dataset.handle;
      
      const stored = await chrome.storage.local.get(['watchlist']);
      const watchlist = stored.watchlist || [];
      const index = watchlist.findIndex(w => w.handle.toLowerCase() === handle.toLowerCase());
      
      if (index >= 0) {
        watchlist.splice(index, 1);
        await chrome.storage.local.set({ watchlist });
        loadWatchTab();
        showToast('Removed from watchlist');
      }
    });
  });
  
  contentArea.querySelectorAll('.xthread-watch-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.xthread-watch-remove')) return;
      const handle = item.dataset.handle;
      window.open(`https://x.com/${handle}`, '_blank');
    });
  });
}

function attachSavedEventHandlers(contentArea) {
  // Clear saved button
  const clearBtn = contentArea.querySelector('#clear-saved-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Clear all saved posts?')) {
        await chrome.storage.local.set({ savedPosts: [] });
        loadSavedTab();
        showToast('Saved posts cleared');
      }
    });
  }
  
  contentArea.querySelectorAll('.xthread-saved-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const url = item.dataset.url;
      if (url) window.open(url, '_blank');
    });
  });
}

// ============================================================
// Helpers
// ============================================================

function extractHandle(author) {
  const match = author.match(/@(\w+)/);
  return match ? match[1] : author;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function updateFeedBadge(count) {
  const badge = sidebarElement?.querySelector('#feed-badge');
  if (badge) {
    badge.textContent = count > 0 ? count : '';
    badge.classList.toggle('visible', count > 0);
  }
}

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

// Export functions for use in content.js
window.xthreadSidebar = {
  init: initSidebar,
  open: openSidebar,
  close: closeSidebar,
  toggle: toggleSidebar,
  isOpen: isSidebarVisible,
  setContent: setSidebarContent,
  switchTab: switchTab
};
