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
  
  // Check for pending stats request (from Stats button click)
  chrome.runtime.sendMessage({ type: 'GET_PENDING_STATS' }, (response) => {
    if (response && response.handle) {
      console.log('[xthread] Got pending stats request for:', response.handle);
      switchTab('stats');
      fetchAndStoreProfileStats(response.handle);
    }
  });
  
  // Check for pending voice request (from Voice button click)
  chrome.runtime.sendMessage({ type: 'GET_PENDING_VOICE' }, (response) => {
    if (response && response.handle) {
      console.log('[xthread] Got pending voice request for:', response.handle);
      addVoiceAccount(response.handle, response.displayName, response.avatar);
      switchTab('saved');
      // Switch to Voice section
      document.querySelector('.saved-toggle .toggle-btn[data-section="voice"]')?.click();
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
    
    case 'SWITCH_TO_STATS':
      // Switch to stats tab and load/scan the profile
      switchTab('stats');
      if (message.handle) {
        fetchAndStoreProfileStats(message.handle);
      }
      break;
    
    case 'ADD_VOICE_PROFILE':
      // Add account to saved voice accounts
      addVoiceAccount(message.handle, message.displayName, message.avatar);
      break;
    
    case 'STATS_UPDATED':
      if (currentTab === 'stats') loadStats();
      break;
    
    case 'VOICE_UPDATED':
      if (currentTab === 'saved') loadSavedVoice();
      break;
  }
}

// Fetch and store profile stats (top tweets)
async function fetchAndStoreProfileStats(handle) {
  console.log('[xthread] fetchAndStoreProfileStats called for:', handle);
  console.log('[xthread] userToken exists:', !!userToken);
  
  if (!userToken) {
    console.error('[xthread] No auth token for stats fetch');
    // Still store basic info even without token
    await storeBasicProfileInfo(handle);
    return;
  }
  
  try {
    const url = `${XTHREAD_API}/extension/user-top-tweets?handle=${encodeURIComponent(handle)}&days=30&limit=10`;
    console.log('[xthread] Fetching:', url);
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    
    console.log('[xthread] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[xthread] API error:', errorText);
      // Store basic info on error
      await storeBasicProfileInfo(handle);
      return;
    }
    
    const data = await response.json();
    console.log('[xthread] Got data:', data);
    
    // Store in scannedProfiles
    const stored = await chrome.storage.local.get(['scannedProfiles']);
    const profiles = stored.scannedProfiles || [];
    
    // Remove existing entry for this handle
    const filtered = profiles.filter(p => p.handle.toLowerCase() !== handle.toLowerCase());
    
    // Add new entry at the beginning
    filtered.unshift({
      handle: handle,
      scannedAt: new Date().toISOString(),
      topTweets: data.tweets || [],
      styleSummary: data.styleSummary || null
    });
    
    // Keep only last 20 profiles
    const trimmed = filtered.slice(0, 20);
    
    await chrome.storage.local.set({ scannedProfiles: trimmed });
    console.log('[xthread] Stored profile stats, reloading UI');
    loadStats();
    
  } catch (err) {
    console.error('[xthread] Error fetching profile stats:', err);
    await storeBasicProfileInfo(handle);
  }
}

// Store basic profile info when API isn't available
async function storeBasicProfileInfo(handle) {
  const stored = await chrome.storage.local.get(['scannedProfiles']);
  const profiles = stored.scannedProfiles || [];
  
  // Check if already exists
  const exists = profiles.some(p => p.handle.toLowerCase() === handle.toLowerCase());
  if (exists) return;
  
  profiles.unshift({
    handle: handle,
    scannedAt: new Date().toISOString(),
    topTweets: [],
    styleSummary: 'Sign in to fetch top tweets'
  });
  
  await chrome.storage.local.set({ scannedProfiles: profiles.slice(0, 20) });
  loadStats();
}

// Add voice account
async function addVoiceAccount(handle, displayName, avatar) {
  const stored = await chrome.storage.local.get(['savedVoiceAccounts']);
  const accounts = stored.savedVoiceAccounts || [];
  
  // Check if already exists
  const exists = accounts.some(a => a.handle.toLowerCase() === handle.toLowerCase());
  if (exists) {
    console.log('[xthread] Voice account already saved:', handle);
    return;
  }
  
  accounts.unshift({
    handle: handle,
    displayName: displayName || handle,
    avatar: avatar || null,
    addedAt: new Date().toISOString()
  });
  
  // Keep only last 50
  const trimmed = accounts.slice(0, 50);
  
  await chrome.storage.local.set({ savedVoiceAccounts: trimmed });
  console.log('[xthread] Added voice account:', handle);
  
  // If on saved tab, refresh
  if (currentTab === 'saved') loadSavedVoice();
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
  const stored = await chrome.storage.local.get(['scannedProfiles']);
  const profiles = stored.scannedProfiles || [];
  
  const statsList = document.getElementById('stats-list');
  const statsEmpty = document.getElementById('stats-empty');
  
  if (profiles.length === 0) {
    statsList.classList.add('hidden');
    statsEmpty.classList.remove('hidden');
    return;
  }
  
  statsList.classList.remove('hidden');
  statsEmpty.classList.add('hidden');
  
  statsList.innerHTML = profiles.map(profile => `
    <div class="stats-profile" data-handle="${escapeHtml(profile.handle)}">
      <div class="stats-profile-header">
        <div class="stats-profile-info">
          <span class="stats-handle">@${escapeHtml(profile.handle)}</span>
          <span class="stats-time">${formatTimeAgo(profile.scannedAt)}</span>
        </div>
        <button class="stats-remove" data-handle="${escapeHtml(profile.handle)}">×</button>
      </div>
      ${profile.styleSummary ? `<div class="stats-style">${escapeHtml(profile.styleSummary)}</div>` : ''}
      <div class="stats-tweets">
        ${(profile.topTweets || []).slice(0, 5).map((tweet, i) => `
          <div class="stats-tweet">
            <div class="stats-tweet-rank">#${i + 1}</div>
            <div class="stats-tweet-content">
              <div class="stats-tweet-text">${escapeHtml(truncateText(tweet.text, 100))}</div>
              <div class="stats-tweet-metrics">
                ❤️ ${formatNumber(tweet.likes || 0)} · 🔄 ${formatNumber(tweet.retweets || 0)} · 💬 ${formatNumber(tweet.replies || 0)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  // Remove button handlers
  statsList.querySelectorAll('.stats-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const handle = btn.dataset.handle;
      const stored = await chrome.storage.local.get(['scannedProfiles']);
      const profiles = stored.scannedProfiles || [];
      const filtered = profiles.filter(p => p.handle.toLowerCase() !== handle.toLowerCase());
      await chrome.storage.local.set({ scannedProfiles: filtered });
      loadStats();
    });
  });
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ============================================================
// Watchlist Tab
// ============================================================

async function loadWatchlist() {
  const stored = await chrome.storage.local.get(['watchlistCategories']);
  const categories = stored.watchlistCategories || [{ id: 'default', name: 'Default', accounts: [] }];
  
  // Populate category dropdown
  const dropdown = document.getElementById('watchlist-category-dropdown');
  const currentValue = dropdown.value || 'default';
  dropdown.innerHTML = categories.map(cat => 
    `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.name)} (${cat.accounts?.length || 0})</option>`
  ).join('');
  dropdown.value = currentValue;
  
  // Get selected category
  const selectedCategory = categories.find(c => c.id === dropdown.value) || categories[0];
  const accounts = selectedCategory?.accounts || [];
  
  const watchlistPosts = document.getElementById('watchlist-posts');
  const watchlistEmpty = document.getElementById('watchlist-empty');
  
  if (accounts.length === 0) {
    watchlistPosts.classList.add('hidden');
    watchlistEmpty.classList.remove('hidden');
    return;
  }
  
  watchlistPosts.classList.remove('hidden');
  watchlistEmpty.classList.add('hidden');
  
  // Show accounts with their info
  watchlistPosts.innerHTML = accounts.map(account => `
    <div class="watchlist-account" data-handle="${escapeHtml(account.handle)}">
      <div class="watchlist-account-header">
        <span class="watchlist-handle">@${escapeHtml(account.handle)}</span>
        <button class="watchlist-remove" data-handle="${escapeHtml(account.handle)}">×</button>
      </div>
      ${account.displayName ? `<div class="watchlist-name">${escapeHtml(account.displayName)}</div>` : ''}
    </div>
  `).join('');
  
  // Remove button handlers
  watchlistPosts.querySelectorAll('.watchlist-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const handle = btn.dataset.handle;
      await removeFromWatchlistCategory(dropdown.value, handle);
      loadWatchlist();
    });
  });
  
  // Click to view profile
  watchlistPosts.querySelectorAll('.watchlist-account').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.watchlist-remove')) return;
      const handle = item.dataset.handle;
      chrome.tabs.create({ url: `https://x.com/${handle}` });
    });
  });
}

// Remove account from watchlist category
async function removeFromWatchlistCategory(categoryId, handle) {
  const stored = await chrome.storage.local.get(['watchlistCategories']);
  const categories = stored.watchlistCategories || [];
  const category = categories.find(c => c.id === categoryId);
  if (category && category.accounts) {
    category.accounts = category.accounts.filter(a => a.handle.toLowerCase() !== handle.toLowerCase());
    await chrome.storage.local.set({ watchlistCategories: categories });
  }
}

// Setup watchlist category dropdown change handler
function setupWatchlistHandlers() {
  const dropdown = document.getElementById('watchlist-category-dropdown');
  if (dropdown) {
    dropdown.addEventListener('change', () => loadWatchlist());
  }
  
  const manageBtn = document.getElementById('manage-lists-btn');
  if (manageBtn) {
    manageBtn.addEventListener('click', showManageListsModal);
  }
}

// Show manage lists modal
async function showManageListsModal() {
  const stored = await chrome.storage.local.get(['watchlistCategories']);
  const categories = stored.watchlistCategories || [{ id: 'default', name: 'Default', accounts: [] }];
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Manage Watchlists</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="lists-container">
          ${categories.map(cat => `
            <div class="list-row" data-id="${escapeHtml(cat.id)}">
              <span class="list-name">${escapeHtml(cat.name)}</span>
              <span class="list-count">${cat.accounts?.length || 0} accounts</span>
              ${cat.id !== 'default' ? `<button class="list-delete" data-id="${escapeHtml(cat.id)}">🗑️</button>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="new-list-form">
          <input type="text" placeholder="New list name..." id="new-list-input">
          <button id="create-list-btn">Create</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  // Create new list
  modal.querySelector('#create-list-btn').addEventListener('click', async () => {
    const input = modal.querySelector('#new-list-input');
    const name = input.value.trim();
    if (!name) return;
    
    const stored = await chrome.storage.local.get(['watchlistCategories']);
    const categories = stored.watchlistCategories || [{ id: 'default', name: 'Default', accounts: [] }];
    categories.push({ id: `list_${Date.now()}`, name, accounts: [] });
    await chrome.storage.local.set({ watchlistCategories: categories });
    modal.remove();
    loadWatchlist();
  });
  
  // Delete list
  modal.querySelectorAll('.list-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const stored = await chrome.storage.local.get(['watchlistCategories']);
      const categories = stored.watchlistCategories || [];
      const filtered = categories.filter(c => c.id !== id);
      await chrome.storage.local.set({ watchlistCategories: filtered });
      modal.remove();
      loadWatchlist();
    });
  });
}

// ============================================================
// Saved Tab
// ============================================================

async function loadSaved() {
  await loadSavedPosts();
  await loadSavedVoice();
}

async function loadSavedPosts() {
  const stored = await chrome.storage.local.get(['savedPosts']);
  const posts = stored.savedPosts || [];
  
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

async function loadSavedVoice() {
  const stored = await chrome.storage.local.get(['savedVoiceAccounts']);
  const accounts = stored.savedVoiceAccounts || [];
  
  const voiceList = document.getElementById('voice-list');
  const voiceEmpty = document.getElementById('voice-empty');
  
  if (accounts.length === 0) {
    voiceList.classList.add('hidden');
    voiceEmpty.classList.remove('hidden');
    return;
  }
  
  voiceList.classList.remove('hidden');
  voiceEmpty.classList.add('hidden');
  
  voiceList.innerHTML = accounts.map(account => `
    <div class="voice-item" data-handle="${escapeHtml(account.handle)}">
      <div class="voice-item-header">
        <span class="voice-handle">@${escapeHtml(account.handle)}</span>
        <button class="voice-remove" data-handle="${escapeHtml(account.handle)}">×</button>
      </div>
      ${account.displayName ? `<div class="voice-name">${escapeHtml(account.displayName)}</div>` : ''}
      <div class="voice-added">Added ${formatTimeAgo(account.addedAt)}</div>
    </div>
  `).join('');
  
  // Remove button handlers
  voiceList.querySelectorAll('.voice-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const handle = btn.dataset.handle;
      const stored = await chrome.storage.local.get(['savedVoiceAccounts']);
      const accounts = stored.savedVoiceAccounts || [];
      const filtered = accounts.filter(a => a.handle.toLowerCase() !== handle.toLowerCase());
      await chrome.storage.local.set({ savedVoiceAccounts: filtered });
      loadSavedVoice();
    });
  });
  
  // Click to view profile
  voiceList.querySelectorAll('.voice-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.voice-remove')) return;
      const handle = item.dataset.handle;
      chrome.tabs.create({ url: `https://x.com/${handle}` });
    });
  });
}

// Setup saved tab toggle
function setupSavedToggle() {
  document.querySelectorAll('.saved-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      
      // Update button states
      document.querySelectorAll('.saved-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show/hide sections
      document.getElementById('saved-posts-section').classList.toggle('active', section === 'posts');
      document.getElementById('saved-voice-section').classList.toggle('active', section === 'voice');
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
  
  // Clear stats (scanned profiles)
  document.getElementById('clear-stats-btn')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ scannedProfiles: [] });
    loadStats();
  });
  
  // Clear saved - now clears based on active section
  document.getElementById('clear-saved-btn')?.addEventListener('click', async () => {
    const postsActive = document.getElementById('saved-posts-section')?.classList.contains('active');
    if (postsActive) {
      await chrome.storage.local.set({ savedPosts: [] });
    } else {
      await chrome.storage.local.set({ savedVoiceAccounts: [] });
    }
    loadSaved();
  });
  
  // Refresh queue
  document.getElementById('refresh-queue-btn')?.addEventListener('click', () => {
    loadQueue();
  });
  
  // Setup watchlist category handlers
  setupWatchlistHandlers();
  
  // Setup saved tab toggle (Posts/Voice)
  setupSavedToggle();
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
