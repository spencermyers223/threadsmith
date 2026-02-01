// xthread Side Panel JavaScript
// Handles all panel functionality: Coach, Feed, Stats, Watch, Saved

const XTHREAD_API = 'https://xthread.io/api';

// State
let userToken = null;
let isPremium = false;
let planName = 'Free';
let userEmail = null;
let xUsername = null;
let currentTab = 'coach';

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[xthread] Side panel loaded');
  
  // Load auth state
  await loadAuthState();
  
  // Setup tab navigation
  setupTabs();
  
  // Setup event listeners
  setupEventListeners();
  
  // Listen for messages from content script and background
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Listen for storage changes (e.g., when auth completes)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.xthreadToken || changes.userEmail || changes.isPremium) {
        console.log('[xthread] Auth state changed, reloading...');
        loadAuthState();
      }
    }
  });
  
  // Load initial data
  loadTabData(currentTab);
});

async function loadAuthState() {
  const stored = await chrome.storage.local.get(['xthreadToken', 'isPremium', 'planName', 'userEmail', 'xUsername']);
  userToken = stored.xthreadToken;
  isPremium = stored.isPremium || false;
  planName = stored.planName || 'Free';
  userEmail = stored.userEmail;
  xUsername = stored.xUsername;
  
  // Always try to fetch fresh user info if we have a token
  if (userToken) {
    try {
      console.log('[xthread] Fetching user info from API...');
      const response = await fetch('https://xthread.io/api/extension/user', {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[xthread] API response:', data);
        
        // Update with fresh data
        if (data.user) {
          if (data.user.xUsername) {
            xUsername = data.user.xUsername;
          }
          if (data.user.email) {
            userEmail = data.user.email;
          }
          isPremium = data.isPremium || false;
          planName = data.planName || 'Free';
          
          // Save to storage
          await chrome.storage.local.set({ 
            xUsername, 
            userEmail,
            isPremium,
            planName
          });
        }
      } else {
        console.error('[xthread] API error:', response.status);
      }
    } catch (e) {
      console.error('[xthread] Failed to fetch user info:', e);
    }
  }
  
  updateAuthUI();
}

function updateAuthUI() {
  const userSection = document.getElementById('user-section');
  const authSection = document.getElementById('auth-section');
  
  if (userToken) {
    userSection.classList.remove('hidden');
    authSection.classList.add('hidden');
    
    // Display X username if available, otherwise fall back to email
    const displayName = xUsername ? `@${xUsername}` : (userEmail || 'User');
    document.getElementById('user-email').textContent = displayName;
    document.getElementById('user-plan').textContent = planName;
    
    // Avatar: use first letter of username or email
    const avatarLetter = xUsername ? xUsername.charAt(0).toUpperCase() : 
                         userEmail ? userEmail.charAt(0).toUpperCase() : '?';
    document.getElementById('user-avatar').textContent = avatarLetter;
  } else {
    userSection.classList.add('hidden');
    authSection.classList.remove('hidden');
  }
}

// ============================================================
// Tab Navigation
// ============================================================

function setupTabs() {
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
  
  // Load tab data
  loadTabData(tabName);
}

async function loadTabData(tabName) {
  switch (tabName) {
    case 'coach':
      // Coach tab shows empty state by default, filled by messages
      break;
    case 'feed':
      await loadFeed();
      break;
    case 'stats':
      await loadStats();
      break;
    case 'watch':
      await loadWatchlist();
      break;
    case 'saved':
      await loadSaved();
      break;
    case 'queue':
      await loadQueue();
      break;
  }
}

// ============================================================
// Message Handler (from content script)
// ============================================================

function handleMessage(message, sender, sendResponse) {
  console.log('[xthread] Received message:', message.type);
  
  switch (message.type) {
    case 'SHOW_COACHING':
      switchTab('coach');
      showCoaching(message.coaching, message.postData);
      break;
    
    case 'AUTH_UPDATE':
      userToken = message.token;
      isPremium = message.isPremium;
      userEmail = message.email;
      updateAuthUI();
      break;
    
    case 'WATCHLIST_UPDATED':
      if (currentTab === 'watch') loadWatchlist();
      if (currentTab === 'feed') loadFeed();
      break;
    
    case 'SAVED_UPDATED':
      if (currentTab === 'saved') loadSaved();
      break;
  }
}

// ============================================================
// Coach Tab
// ============================================================

function showCoaching(coaching, postData) {
  const emptyState = document.querySelector('#tab-coach .empty-state');
  const coachContent = document.getElementById('coach-content');
  
  emptyState.classList.add('hidden');
  coachContent.classList.remove('hidden');
  
  // Safely handle potential missing data
  const toneRecommendation = coaching.toneRecommendation || { primary: 'engaging', why: '' };
  const angles = coaching.angles || [];
  const hookStarters = coaching.hookStarters || [];
  const pitfalls = coaching.pitfalls || [];
  
  coachContent.innerHTML = `
    <div class="coach-section">
      <div class="section-header">🎯 Recommended Tone</div>
      <div class="tone-pill">${escapeHtml(toneRecommendation.primary)}</div>
      <div class="tone-reason">${escapeHtml(toneRecommendation.why)}</div>
    </div>
    
    <div class="coach-section">
      <div class="section-header">💡 Strategic Angles</div>
      ${angles.map(angle => `
        <div class="angle-item">
          <div class="angle-header">
            <span class="angle-name">${escapeHtml(angle.title || '')}</span>
            <span class="angle-tone">${escapeHtml(angle.tone || '')}</span>
          </div>
          <div class="angle-desc">${escapeHtml(angle.description || '')}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="coach-section">
      <div class="section-header">🪝 Hook Starters <span class="section-hint">(click to copy)</span></div>
      ${hookStarters.map(hook => `
        <div class="hook-item" data-text="${escapeHtml(hook.text || '')}">
          <span class="hook-text">"${escapeHtml(hook.text || '')}"</span>
          <span class="hook-source">${escapeHtml(hook.angle || '')}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="coach-section">
      <div class="section-header" style="color:var(--danger);">⚠️ What to Avoid</div>
      <ul class="avoid-list">
        ${pitfalls.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
      </ul>
    </div>
    
    <div class="cta-section">
      <button class="start-reply-btn" id="start-reply-btn">
        Start Writing Reply →
      </button>
    </div>
    
    <div class="save-draft-section">
      <textarea id="draft-textarea" class="draft-textarea" placeholder="Write your reply here to save as a draft..." rows="3"></textarea>
      <button class="save-draft-btn" id="save-draft-btn">
        💾 Save to xthread Drafts
      </button>
    </div>
  `;
  
  // Hook click to copy
  coachContent.querySelectorAll('.hook-item').forEach(item => {
    item.addEventListener('click', () => {
      navigator.clipboard.writeText(item.dataset.text);
      item.classList.add('copied');
      setTimeout(() => item.classList.remove('copied'), 1500);
    });
  });
  
  // Start reply button - send message to content script
  document.getElementById('start-reply-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'OPEN_REPLY',
          postUrl: postData.url
        });
      }
    });
  });
  
  // Save draft button
  document.getElementById('save-draft-btn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('draft-textarea');
    const content = textarea?.value?.trim();
    
    if (!content) {
      alert('Please write something before saving');
      return;
    }
    
    const btn = document.getElementById('save-draft-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    const success = await saveDraftToXthread(
      content,
      extractHandle(postData.author),
      postData.url
    );
    
    if (success) {
      btn.textContent = '✓ Saved!';
      textarea.value = '';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    } else {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
  
  // Pre-fill textarea when clicking a hook
  coachContent.querySelectorAll('.hook-item').forEach(item => {
    item.addEventListener('dblclick', () => {
      const textarea = document.getElementById('draft-textarea');
      if (textarea) {
        textarea.value = item.dataset.text + ' ';
        textarea.focus();
      }
    });
  });
}

// ============================================================
// Feed Tab
// ============================================================

async function loadFeed() {
  const stored = await chrome.storage.local.get(['watchlistNotifications']);
  const notifications = stored.watchlistNotifications || [];
  
  const feedList = document.getElementById('feed-list');
  const feedEmpty = document.getElementById('feed-empty');
  
  if (notifications.length === 0) {
    feedList.classList.add('hidden');
    feedEmpty.classList.remove('hidden');
    return;
  }
  
  feedList.classList.remove('hidden');
  feedEmpty.classList.add('hidden');
  
  feedList.innerHTML = notifications.slice(0, 20).map(notif => `
    <div class="list-item" data-url="${escapeHtml(notif.url)}">
      <div class="item-header">
        <span class="item-author">@${escapeHtml(notif.handle)}</span>
        <span class="item-time">${escapeHtml(notif.postAge || '')}</span>
      </div>
      <div class="item-text">${escapeHtml(truncateText(notif.text, 100))}</div>
    </div>
  `).join('');
  
  // Click to open
  feedList.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
  
  // Mark as read
  notifications.forEach(n => n.read = true);
  await chrome.storage.local.set({ watchlistNotifications: notifications });
}

// ============================================================
// Stats Tab
// ============================================================

async function loadStats() {
  const stored = await chrome.storage.local.get(['replyHistory']);
  const history = stored.replyHistory || [];
  
  const total = history.length;
  const confirmed = history.filter(r => r.followedBack === true).length;
  const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  
  document.getElementById('total-replies').textContent = total;
  document.getElementById('conversion-rate').textContent = `${rate}%`;
  
  const replyList = document.getElementById('reply-list');
  const statsEmpty = document.getElementById('stats-empty');
  
  if (history.length === 0) {
    replyList.classList.add('hidden');
    statsEmpty.classList.remove('hidden');
    return;
  }
  
  replyList.classList.remove('hidden');
  statsEmpty.classList.add('hidden');
  
  replyList.innerHTML = history.slice(0, 15).map(reply => `
    <div class="list-item">
      <div class="item-header">
        <span class="item-author">@${escapeHtml(reply.originalAuthorHandle || 'unknown')}</span>
        <span class="item-time">${formatTimeAgo(reply.repliedAt)}</span>
      </div>
      <div class="item-text">${escapeHtml(truncateText(reply.replyText || '', 80))}</div>
    </div>
  `).join('');
}

// ============================================================
// Watchlist Tab
// ============================================================

async function loadWatchlist() {
  const stored = await chrome.storage.local.get(['watchlist']);
  const watchlist = stored.watchlist || [];
  
  document.getElementById('watch-count').textContent = `${watchlist.length} accounts`;
  
  const watchList = document.getElementById('watch-list');
  const watchEmpty = document.getElementById('watch-empty');
  
  if (watchlist.length === 0) {
    watchList.classList.add('hidden');
    watchEmpty.classList.remove('hidden');
    return;
  }
  
  watchList.classList.remove('hidden');
  watchEmpty.classList.add('hidden');
  
  watchList.innerHTML = watchlist.map(account => `
    <div class="list-item" data-handle="${escapeHtml(account.handle)}">
      <div class="item-header">
        <span class="item-author">@${escapeHtml(account.handle)}</span>
        <button class="item-remove" data-handle="${escapeHtml(account.handle)}">×</button>
      </div>
      <div class="item-text">${escapeHtml(account.displayName || account.handle)}</div>
    </div>
  `).join('');
  
  // Click to view profile
  watchList.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.item-remove')) return;
      const handle = item.dataset.handle;
      chrome.tabs.create({ url: `https://x.com/${handle}` });
    });
  });
  
  // Remove button
  watchList.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const handle = btn.dataset.handle;
      const stored = await chrome.storage.local.get(['watchlist']);
      const watchlist = stored.watchlist || [];
      const index = watchlist.findIndex(w => w.handle.toLowerCase() === handle.toLowerCase());
      if (index >= 0) {
        watchlist.splice(index, 1);
        await chrome.storage.local.set({ watchlist });
        loadWatchlist();
      }
    });
  });
}

// ============================================================
// Saved Tab
// ============================================================

async function loadSaved() {
  const stored = await chrome.storage.local.get(['savedPosts']);
  const posts = stored.savedPosts || [];
  
  document.getElementById('saved-count').textContent = `${posts.length} posts`;
  
  const savedList = document.getElementById('saved-list');
  const savedEmpty = document.getElementById('saved-empty');
  
  if (posts.length === 0) {
    savedList.classList.add('hidden');
    savedEmpty.classList.remove('hidden');
    return;
  }
  
  savedList.classList.remove('hidden');
  savedEmpty.classList.add('hidden');
  
  savedList.innerHTML = posts.slice(0, 20).map(post => `
    <div class="list-item" data-url="${escapeHtml(post.url)}">
      <div class="item-header">
        <span class="item-author">${escapeHtml(post.author || 'Unknown')}</span>
        <span class="item-time">${formatTimeAgo(post.savedAt)}</span>
      </div>
      <div class="item-text">${escapeHtml(truncateText(post.text, 100))}</div>
    </div>
  `).join('');
  
  // Click to open
  savedList.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

// ============================================================
// Queue Tab (Scheduled Posts from xthread)
// ============================================================

async function loadQueue() {
  const queueList = document.getElementById('queue-list');
  const queueEmpty = document.getElementById('queue-empty');
  const queueLoading = document.getElementById('queue-loading');
  const queueCount = document.getElementById('queue-count');
  
  if (!userToken) {
    queueList.classList.add('hidden');
    queueLoading.classList.add('hidden');
    queueEmpty.classList.remove('hidden');
    queueEmpty.querySelector('.empty-desc').textContent = 'Sign in to see your scheduled posts.';
    return;
  }
  
  // Show loading
  queueList.classList.add('hidden');
  queueEmpty.classList.add('hidden');
  queueLoading.classList.remove('hidden');
  
  try {
    // Pass client's local date to handle timezone correctly
    const clientDate = new Date().toISOString().split('T')[0];
    // Adjust for local timezone - get actual local date
    const localDate = new Date();
    const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    
    const response = await fetch(`${XTHREAD_API}/extension/scheduled?status=scheduled&upcoming=true&limit=15&clientDate=${localDateStr}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch scheduled posts');
    }
    
    const data = await response.json();
    const posts = data.posts || [];
    
    queueLoading.classList.add('hidden');
    
    if (posts.length === 0) {
      queueList.classList.add('hidden');
      queueEmpty.classList.remove('hidden');
      queueCount.textContent = 'No upcoming posts';
      return;
    }
    
    queueList.classList.remove('hidden');
    queueEmpty.classList.add('hidden');
    queueCount.textContent = `${posts.length} scheduled`;
    
    queueList.innerHTML = posts.map(post => `
      <div class="list-item queue-item" data-id="${escapeHtml(post.id)}" data-content="${escapeHtml(post.content || '')}">
        <div class="item-header">
          <span class="item-type">${getTypeEmoji(post.generationType)} ${escapeHtml(formatGenerationType(post.generationType))}</span>
          <span class="item-time">${escapeHtml(post.scheduledDisplay || 'Not scheduled')}</span>
        </div>
        <div class="item-text">${escapeHtml(truncateText(post.content, 120))}</div>
        <div class="item-actions">
          <button class="copy-btn" title="Copy to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy
          </button>
        </div>
      </div>
    `).join('');
    
    // Store full content for each post (preserving formatting)
    const postContentMap = {};
    posts.forEach(post => {
      postContentMap[post.id] = post.content || '';
    });
    
    // Copy button - copies tweet content to clipboard
    queueList.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.queue-item');
        const postId = item.dataset.id;
        const content = postContentMap[postId] || '';
        
        try {
          await navigator.clipboard.writeText(content);
          // Show feedback
          const originalText = btn.innerHTML;
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('[xthread] Copy failed:', err);
          btn.textContent = 'Failed';
          setTimeout(() => {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
          }, 2000);
        }
      });
    });
    
    // Click item to open in xthread calendar
    queueList.querySelectorAll('.queue-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.post-to-x-btn')) return; // Don't trigger if clicking button
        chrome.tabs.create({ url: `https://xthread.io/calendar` });
      });
    });
    
  } catch (error) {
    console.error('[xthread] Error loading queue:', error);
    queueLoading.classList.add('hidden');
    queueEmpty.classList.remove('hidden');
    queueEmpty.querySelector('.empty-desc').textContent = 'Failed to load scheduled posts. Try again later.';
  }
}

function getTypeEmoji(type) {
  const emojiMap = {
    'scroll_stopper': '🛑',
    'debate_starter': '🔥',
    'viral_catalyst': '🚀',
    'market_take': '📊',
    'hot_take': '🌶️',
    'on_chain_insight': '⛓️',
    'alpha_thread': '💎',
    'protocol_breakdown': '🔬',
    'build_in_public': '🔨',
    'user_generated': '✍️'
  };
  return emojiMap[type] || '📝';
}

function formatGenerationType(type) {
  if (!type) return 'Post';
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ============================================================
// Save Draft to xthread
// ============================================================

async function saveDraftToXthread(content, replyTo, sourceUrl) {
  if (!userToken) {
    alert('Please sign in to save drafts to xthread');
    return false;
  }
  
  try {
    const response = await fetch(`${XTHREAD_API}/extension/save-draft`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        replyTo,
        sourceUrl,
        source: 'extension-coach'
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to save draft');
    }
    
    const data = await response.json();
    return data.success;
    
  } catch (error) {
    console.error('[xthread] Error saving draft:', error);
    alert('Failed to save draft: ' + error.message);
    return false;
  }
}

// ============================================================
// Event Listeners
// ============================================================

function setupEventListeners() {
  // Sign in button - go directly to extension callback
  // If not logged in, that page shows a "Sign In" button that redirects properly
  document.getElementById('sign-in-btn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://xthread.io/auth/extension-callback' });
  });
  
  // Sign out button
  document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
    await chrome.storage.local.remove(['xthreadToken', 'isPremium', 'userEmail']);
    userToken = null;
    isPremium = false;
    userEmail = null;
    updateAuthUI();
  });
  
  // Clear replies
  document.getElementById('clear-replies-btn')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ replyHistory: [] });
    loadStats();
  });
  
  // Clear saved
  document.getElementById('clear-saved-btn')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ savedPosts: [] });
    loadSaved();
  });
  
  // Refresh queue
  document.getElementById('refresh-queue-btn')?.addEventListener('click', () => {
    loadQueue();
  });
}

// ============================================================
// Helpers
// ============================================================

function extractHandle(author) {
  if (!author) return 'unknown';
  const match = author.match(/@(\w+)/);
  return match ? match[1] : author.split(' ')[0] || 'unknown';
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
