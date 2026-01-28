// xthread Reply Coach - Popup Script

const XTHREAD_URL = 'https://xthread.io';
const XTHREAD_API = 'https://xthread.io/api';

// DOM Elements
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
const savedSection = document.getElementById('saved-section');
const savedPostsList = document.getElementById('saved-posts-list');
const noSaved = document.getElementById('no-saved');
const clearSavedBtn = document.getElementById('clear-saved-btn');

// Initialize
async function init() {
  const stored = await chrome.storage.local.get(['xthreadToken', 'xthreadUser', 'isPremium']);
  
  if (stored.xthreadToken && stored.xthreadUser) {
    showMainView(stored.xthreadUser, stored.isPremium);
    refreshUserData(stored.xthreadToken);
  } else {
    showAuthView();
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
    statsSection.classList.remove('hidden');
    savedSection.classList.remove('hidden');
  } else {
    premiumStatus.classList.add('hidden');
    freeStatus.classList.remove('hidden');
    statsSection.classList.add('hidden');
    savedSection.classList.add('hidden');
  }
  
  loadStats();
  loadSavedPosts();
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
  const authUrl = `${XTHREAD_URL}/auth/extension?redirect=${encodeURIComponent(chrome.runtime.getURL('auth-callback.html'))}`;
  chrome.tabs.create({ url: authUrl });
});

// Sign out handler
signOutBtn.addEventListener('click', async () => {
  await signOut();
});

// Clear saved handler
clearSavedBtn.addEventListener('click', clearSavedPosts);

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

// Listen for auth callback
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_CALLBACK') {
    handleAuthCallback(message.token);
  }
  if (message.type === 'UPDATE_BADGE') {
    savedCount.textContent = message.count;
    loadSavedPosts();
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
