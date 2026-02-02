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
  
  // Check for pending coaching data (from Coach button click before panel was open)
  chrome.runtime.sendMessage({ type: 'GET_PENDING_COACHING' }, (response) => {
    if (response && response.coaching) {
      console.log('[xthread] Got pending coaching data');
      switchTab('coach');
      showCoaching(response.coaching, response.postData);
    }
  });
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
    case 'stats':
      await loadStats();
      break;
    case 'watchlist':
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
      if (currentTab === 'watchlist') loadWatchlist();
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
  
  // Get hooks by tone (now single strings, not arrays)
  const hooks = coaching.hooks || {};
  
  const renderHook = (emoji, label, hook) => {
    if (!hook) return '';
    return `
      <div class="hook-item" data-text="${escapeHtml(hook)}">
        <div class="hook-content">
          <div class="hook-header">
            <span class="hook-emoji">${emoji}</span>
            <span class="hook-label">${label}</span>
          </div>
          <span class="hook-text">${escapeHtml(hook)}</span>
        </div>
        <button class="hook-copy-btn" title="Copy hook">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
      </div>
    `;
  };
  
  coachContent.innerHTML = `
    <div class="coach-hooks">
      ${renderHook('😏', 'Witty', hooks.witty)}
      ${renderHook('💡', 'Insightful', hooks.insightful)}
      ${renderHook('🤔', 'Contrarian', hooks.contrarian)}
      ${renderHook('🤝', 'Friendly', hooks.friendly)}
      ${renderHook('❓', 'Curious', hooks.curious)}
    </div>
  `;
  
  // Hook copy button click
  coachContent.querySelectorAll('.hook-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.hook-item');
      navigator.clipboard.writeText(item.dataset.text);
      btn.classList.add('copied');
      btn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = 'Copy';
      }, 1500);
    });
  });
}

// ============================================================
// Stats Tab
// ============================================================

async function loadStats() {
  const stored = await chrome.storage.local.get(['scannedProfiles']);
  const profiles = stored.scannedProfiles || [];
  
  // Update header stats
  const profileCount = profiles.length;
  document.getElementById('total-replies').textContent = profileCount;
  document.getElementById('conversion-rate').textContent = `${profileCount} scanned`;
  
  const replyList = document.getElementById('reply-list');
  const statsEmpty = document.getElementById('stats-empty');
  
  if (profiles.length === 0) {
    replyList.classList.add('hidden');
    statsEmpty.classList.remove('hidden');
    return;
  }
  
  replyList.classList.remove('hidden');
  statsEmpty.classList.add('hidden');
  
  // Sort by most recent scan
  const sortedProfiles = [...profiles].sort((a, b) => 
    new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );
  
  replyList.innerHTML = sortedProfiles.map((profile, index) => `
    <div class="scanned-profile" data-index="${index}">
      <div class="profile-header" onclick="toggleProfileExpand(${index})">
        <img class="profile-avatar" src="${escapeHtml(profile.avatar || '')}" alt="" onerror="this.style.display='none'">
        <div class="profile-info">
          <span class="profile-handle">${escapeHtml(profile.handle || '@unknown')}</span>
          <span class="profile-date">${formatTimeAgo(profile.scannedAt)}</span>
        </div>
        <span class="expand-icon">▶</span>
      </div>
      <div class="profile-content hidden" id="profile-content-${index}">
        ${profile.styleSummary ? `
          <div class="style-summary">
            <strong>Writing Style:</strong> ${escapeHtml(profile.styleSummary)}
          </div>
        ` : ''}
        <div class="tweets-list">
          ${(profile.tweets || []).slice(0, 10).map(tweet => `
            <div class="tweet-item">
              <div class="tweet-text">${escapeHtml(truncateText(tweet.text || '', 120))}</div>
              <div class="tweet-metrics">
                <span class="metric">💬 ${formatNumber(tweet.replies || 0)}</span>
                <span class="metric">🔁 ${formatNumber(tweet.retweets || 0)}</span>
                <span class="metric">❤️ ${formatNumber(tweet.likes || 0)}</span>
                ${tweet.views ? `<span class="metric">👁 ${formatNumber(tweet.views)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// Toggle profile expansion in Stats tab
function toggleProfileExpand(index) {
  const content = document.getElementById(`profile-content-${index}`);
  const profile = content?.closest('.scanned-profile');
  const icon = profile?.querySelector('.expand-icon');
  
  if (content) {
    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden');
    if (icon) {
      icon.textContent = isHidden ? '▼' : '▶';
    }
  }
}

// Format large numbers (1000 -> 1K, etc.)
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ============================================================
// Watchlist Tab - Category-based Watchlist System
// ============================================================

const DEFAULT_CATEGORY = 'General';

async function loadWatchlist() {
  // Get categories and accounts from storage
  const stored = await chrome.storage.local.get([
    'watchlistCategories', 
    'watchlistAccounts', 
    'activeWatchlist',
    'watchlist' // Legacy support
  ]);
  
  // Handle migration from old flat list
  let categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
  let accounts = stored.watchlistAccounts || {};
  let activeCategory = stored.activeWatchlist || DEFAULT_CATEGORY;
  
  // Migrate legacy data if needed
  if (stored.watchlist && stored.watchlist.length > 0 && !stored.watchlistAccounts) {
    accounts[DEFAULT_CATEGORY] = stored.watchlist;
    await chrome.storage.local.set({
      watchlistCategories: categories,
      watchlistAccounts: accounts,
      activeWatchlist: DEFAULT_CATEGORY
    });
  }
  
  // Ensure active category exists
  if (!categories.includes(activeCategory)) {
    activeCategory = categories[0] || DEFAULT_CATEGORY;
    await chrome.storage.local.set({ activeWatchlist: activeCategory });
  }
  
  const categoryAccounts = accounts[activeCategory] || [];
  document.getElementById('watch-count').textContent = `${categoryAccounts.length} accounts`;
  
  const watchList = document.getElementById('watch-list');
  const watchEmpty = document.getElementById('watch-empty');
  
  // Build category selector and manage button
  const headerHtml = `
    <div class="watchlist-header">
      <div class="watchlist-selector">
        <select id="watchlist-category-select" class="category-select">
          ${categories.map(cat => `
            <option value="${escapeHtml(cat)}" ${cat === activeCategory ? 'selected' : ''}>
              ${escapeHtml(cat)} (${(accounts[cat] || []).length})
            </option>
          `).join('')}
        </select>
        <button id="manage-lists-btn" class="manage-btn" title="Manage Lists">⚙️</button>
      </div>
    </div>
  `;
  
  if (categoryAccounts.length === 0) {
    watchList.innerHTML = headerHtml;
    watchList.classList.remove('hidden');
    watchEmpty.classList.remove('hidden');
    watchEmpty.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">👀</span>
        <p>No accounts in "${escapeHtml(activeCategory)}"</p>
        <p class="empty-hint">Visit a profile on X and click the Watchlist button to add accounts</p>
      </div>
    `;
    setupWatchlistEventListeners(activeCategory);
    return;
  }
  
  watchList.classList.remove('hidden');
  watchEmpty.classList.add('hidden');
  
  // Build account list with avatars
  const accountsHtml = categoryAccounts.map(account => `
    <div class="list-item watchlist-account" data-handle="${escapeHtml(account.handle)}">
      <div class="account-row">
        <div class="account-avatar">
          ${account.avatar 
            ? `<img src="${escapeHtml(account.avatar)}" alt="" class="avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="avatar-fallback" style="display:none">👤</span>`
            : '<span class="avatar-fallback">👤</span>'
          }
        </div>
        <div class="account-info">
          <span class="account-handle">@${escapeHtml(account.handle)}</span>
          <span class="account-name">${escapeHtml(account.displayName || account.handle)}</span>
        </div>
        <button class="item-remove" data-handle="${escapeHtml(account.handle)}" title="Remove">×</button>
      </div>
    </div>
  `).join('');
  
  watchList.innerHTML = headerHtml + accountsHtml;
  
  setupWatchlistEventListeners(activeCategory);
}

function setupWatchlistEventListeners(activeCategory) {
  // Category select change
  const categorySelect = document.getElementById('watchlist-category-select');
  if (categorySelect) {
    categorySelect.addEventListener('change', async (e) => {
      await chrome.storage.local.set({ activeWatchlist: e.target.value });
      loadWatchlist();
    });
  }
  
  // Manage lists button
  const manageBtn = document.getElementById('manage-lists-btn');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => showManageListsModal());
  }
  
  const watchList = document.getElementById('watch-list');
  
  // Click to view profile
  watchList.querySelectorAll('.watchlist-account').forEach(item => {
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
      const stored = await chrome.storage.local.get(['watchlistAccounts', 'activeWatchlist']);
      const accounts = stored.watchlistAccounts || {};
      const category = stored.activeWatchlist || DEFAULT_CATEGORY;
      
      if (accounts[category]) {
        const index = accounts[category].findIndex(w => w.handle.toLowerCase() === handle.toLowerCase());
        if (index >= 0) {
          accounts[category].splice(index, 1);
          await chrome.storage.local.set({ watchlistAccounts: accounts });
          loadWatchlist();
        }
      }
    });
  });
}

function showManageListsModal() {
  // Remove existing modal if present
  const existingModal = document.getElementById('manage-lists-modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'manage-lists-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Manage Watchlists</h3>
        <button class="modal-close" id="close-manage-modal">×</button>
      </div>
      <div class="modal-body">
        <div class="new-category-row">
          <input type="text" id="new-category-input" placeholder="New category name..." maxlength="30">
          <button id="add-category-btn" class="btn-primary">Add</button>
        </div>
        <div id="categories-list" class="categories-list"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load categories into modal
  refreshCategoriesList();
  
  // Close modal
  document.getElementById('close-manage-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Add new category
  document.getElementById('add-category-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-category-input');
    const name = input.value.trim();
    if (!name) return;
    
    const stored = await chrome.storage.local.get(['watchlistCategories']);
    const categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
    
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert('Category already exists');
      return;
    }
    
    if (categories.length >= 20) {
      alert('Maximum 20 categories allowed');
      return;
    }
    
    categories.push(name);
    await chrome.storage.local.set({ watchlistCategories: categories });
    input.value = '';
    refreshCategoriesList();
    loadWatchlist();
  });
  
  // Enter key to add
  document.getElementById('new-category-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('add-category-btn').click();
    }
  });
}

async function refreshCategoriesList() {
  const stored = await chrome.storage.local.get(['watchlistCategories', 'watchlistAccounts']);
  const categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
  const accounts = stored.watchlistAccounts || {};
  
  const listEl = document.getElementById('categories-list');
  if (!listEl) return;
  
  listEl.innerHTML = categories.map(cat => {
    const count = (accounts[cat] || []).length;
    return `
      <div class="category-item" data-category="${escapeHtml(cat)}">
        <span class="category-name">${escapeHtml(cat)}</span>
        <span class="category-count">${count} accounts</span>
        <div class="category-actions">
          <button class="btn-icon rename-category" data-category="${escapeHtml(cat)}" title="Rename">✏️</button>
          <button class="btn-icon delete-category" data-category="${escapeHtml(cat)}" title="Delete" ${categories.length <= 1 ? 'disabled' : ''}>🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Rename handlers
  listEl.querySelectorAll('.rename-category').forEach(btn => {
    btn.addEventListener('click', async () => {
      const oldName = btn.dataset.category;
      const newName = prompt('Enter new name:', oldName);
      if (!newName || newName.trim() === oldName) return;
      
      const stored = await chrome.storage.local.get(['watchlistCategories', 'watchlistAccounts', 'activeWatchlist']);
      const categories = stored.watchlistCategories || [];
      const accounts = stored.watchlistAccounts || {};
      
      const index = categories.indexOf(oldName);
      if (index === -1) return;
      
      if (categories.some(c => c.toLowerCase() === newName.trim().toLowerCase() && c !== oldName)) {
        alert('Category name already exists');
        return;
      }
      
      categories[index] = newName.trim();
      
      if (accounts[oldName]) {
        accounts[newName.trim()] = accounts[oldName];
        delete accounts[oldName];
      }
      
      const updates = { watchlistCategories: categories, watchlistAccounts: accounts };
      if (stored.activeWatchlist === oldName) {
        updates.activeWatchlist = newName.trim();
      }
      
      await chrome.storage.local.set(updates);
      refreshCategoriesList();
      loadWatchlist();
    });
  });
  
  // Delete handlers
  listEl.querySelectorAll('.delete-category').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.category;
      const stored = await chrome.storage.local.get(['watchlistCategories', 'watchlistAccounts', 'activeWatchlist']);
      const categories = stored.watchlistCategories || [];
      const accounts = stored.watchlistAccounts || {};
      const count = (accounts[name] || []).length;
      
      if (categories.length <= 1) {
        alert('Cannot delete the last category');
        return;
      }
      
      const confirmMsg = count > 0 
        ? `Delete "${name}" and its ${count} accounts?`
        : `Delete "${name}"?`;
      
      if (!confirm(confirmMsg)) return;
      
      const index = categories.indexOf(name);
      if (index === -1) return;
      
      categories.splice(index, 1);
      delete accounts[name];
      
      const updates = { watchlistCategories: categories, watchlistAccounts: accounts };
      if (stored.activeWatchlist === name) {
        updates.activeWatchlist = categories[0];
      }
      
      await chrome.storage.local.set(updates);
      refreshCategoriesList();
      loadWatchlist();
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
  
  savedList.innerHTML = posts.slice(0, 20).map((post, index) => `
    <div class="list-item saved-post-item" data-url="${escapeHtml(post.url)}" data-index="${index}">
      <div class="item-header">
        <div class="item-author-row">
          ${post.avatar 
            ? `<img src="${escapeHtml(post.avatar)}" alt="" class="item-avatar" onerror="this.style.display='none'">`
            : '<span class="item-avatar-placeholder">👤</span>'
          }
          <span class="item-author">${escapeHtml(post.author || 'Unknown')}</span>
        </div>
        <div class="item-actions-row">
          <span class="item-time">${formatTimeAgo(post.savedAt)}</span>
          <button class="item-delete" data-index="${index}" title="Delete">×</button>
        </div>
      </div>
      <div class="item-text">${escapeHtml(truncateText(post.text, 100))}</div>
    </div>
  `).join('');
  
  // Click to open in same tab
  savedList.querySelectorAll('.saved-post-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      // Don't navigate if clicking delete button
      if (e.target.closest('.item-delete')) return;
      
      const url = item.dataset.url;
      if (url) {
        // Get current active tab and navigate it
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          chrome.tabs.update(tab.id, { url });
        } else {
          chrome.tabs.create({ url });
        }
      }
    });
  });
  
  // Delete button handlers
  savedList.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const stored = await chrome.storage.local.get(['savedPosts']);
      const posts = stored.savedPosts || [];
      
      if (index >= 0 && index < posts.length) {
        posts.splice(index, 1);
        await chrome.storage.local.set({ savedPosts: posts });
        loadSaved(); // Reload the list
      }
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
  
  // Get saved queue mode (posts or dms)
  const storage = await chrome.storage.local.get(['queueMode']);
  let queueMode = storage.queueMode || 'posts';
  
  // Render mode toggle if not already present
  let modeToggle = document.getElementById('queue-mode-toggle');
  if (!modeToggle) {
    const queueTab = document.getElementById('queue-tab');
    const tabHeader = queueTab.querySelector('.tab-header');
    
    modeToggle = document.createElement('div');
    modeToggle.id = 'queue-mode-toggle';
    modeToggle.className = 'queue-mode-toggle';
    modeToggle.innerHTML = `
      <button class="mode-btn ${queueMode === 'posts' ? 'active' : ''}" data-mode="posts">Posts</button>
      <button class="mode-btn ${queueMode === 'dms' ? 'active' : ''}" data-mode="dms">DMs</button>
    `;
    
    // Insert after the tab header
    tabHeader.insertAdjacentElement('afterend', modeToggle);
    
    // Add click handlers
    modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newMode = btn.dataset.mode;
        if (newMode !== queueMode) {
          await chrome.storage.local.set({ queueMode: newMode });
          loadQueue(); // Reload with new mode
        }
      });
    });
  } else {
    // Update active state
    modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === queueMode);
    });
  }
  
  // Show loading
  queueList.classList.add('hidden');
  queueEmpty.classList.add('hidden');
  queueLoading.classList.remove('hidden');
  
  if (queueMode === 'posts') {
    await loadQueuePosts(queueList, queueEmpty, queueLoading, queueCount);
  } else {
    await loadQueueDMs(queueList, queueEmpty, queueLoading, queueCount);
  }
}

async function loadQueuePosts(queueList, queueEmpty, queueLoading, queueCount) {
  try {
    // Pass client's local date to handle timezone correctly
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
      queueEmpty.querySelector('.empty-desc').textContent = 'No scheduled posts yet.';
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
        if (e.target.closest('.copy-btn')) return; // Don't trigger if clicking button
        chrome.tabs.create({ url: `https://xthread.io/calendar` });
      });
    });
    
  } catch (error) {
    console.error('[xthread] Error loading queue posts:', error);
    queueLoading.classList.add('hidden');
    queueEmpty.classList.remove('hidden');
    queueEmpty.querySelector('.empty-desc').textContent = 'Failed to load scheduled posts. Try again later.';
  }
}

async function loadQueueDMs(queueList, queueEmpty, queueLoading, queueCount) {
  try {
    const response = await fetch(`${XTHREAD_API}/extension/dm-templates`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch DM templates');
    }
    
    const data = await response.json();
    const templates = data.templates || [];
    
    queueLoading.classList.add('hidden');
    
    if (templates.length === 0) {
      queueList.classList.add('hidden');
      queueEmpty.classList.remove('hidden');
      queueEmpty.querySelector('.empty-desc').textContent = 'No DM templates yet. Create templates in xthread to quickly copy them here.';
      queueCount.textContent = 'No templates';
      return;
    }
    
    queueList.classList.remove('hidden');
    queueEmpty.classList.add('hidden');
    queueCount.textContent = `${templates.length} template${templates.length !== 1 ? 's' : ''}`;
    
    queueList.innerHTML = templates.map(template => `
      <div class="list-item queue-item dm-template-item" data-id="${escapeHtml(template.id)}">
        <div class="item-header">
          <span class="item-type">💬 ${escapeHtml(template.name || 'Untitled')}</span>
        </div>
        <div class="item-text">${escapeHtml(truncateText(template.content, 120))}</div>
        <div class="item-actions">
          <button class="copy-btn" title="Copy to clipboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy
          </button>
        </div>
      </div>
    `).join('');
    
    // Store full content for each template (preserving formatting)
    const templateContentMap = {};
    templates.forEach(template => {
      templateContentMap[template.id] = template.content || '';
    });
    
    // Copy button - copies template content to clipboard
    queueList.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.dm-template-item');
        const templateId = item.dataset.id;
        const content = templateContentMap[templateId] || '';
        
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
    
    // Click item to open in xthread DM templates page
    queueList.querySelectorAll('.dm-template-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.copy-btn')) return; // Don't trigger if clicking button
        chrome.tabs.create({ url: `https://xthread.io/dm-templates` });
      });
    });
    
  } catch (error) {
    console.error('[xthread] Error loading DM templates:', error);
    queueLoading.classList.add('hidden');
    queueEmpty.classList.remove('hidden');
    queueEmpty.querySelector('.empty-desc').textContent = 'Failed to load DM templates. Try again later.';
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
