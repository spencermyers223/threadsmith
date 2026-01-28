// xthread Reply Assistant - Popup Script

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
const repliesToday = document.getElementById('replies-today');
const repliesTotal = document.getElementById('replies-total');
const statsSection = document.getElementById('stats-section');

// Initialize
async function init() {
  const stored = await chrome.storage.local.get(['xthreadToken', 'xthreadUser', 'isPremium']);
  
  if (stored.xthreadToken && stored.xthreadUser) {
    showMainView(stored.xthreadUser, stored.isPremium);
    // Refresh user data in background
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
  
  // Update user info
  userName.textContent = user.email || user.name || 'User';
  userAvatar.textContent = (user.email || user.name || 'U')[0].toUpperCase();
  userPlan.textContent = isPremium ? 'Premium' : 'Free';
  
  // Update status
  if (isPremium) {
    premiumStatus.classList.remove('hidden');
    freeStatus.classList.add('hidden');
    statsSection.classList.remove('hidden');
  } else {
    premiumStatus.classList.add('hidden');
    freeStatus.classList.remove('hidden');
    statsSection.classList.add('hidden');
  }
  
  // Load stats
  loadStats();
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
        // Token expired, sign out
        await signOut();
        return;
      }
      throw new Error('Failed to fetch user data');
    }
    
    const data = await response.json();
    
    // Update storage
    await chrome.storage.local.set({
      xthreadUser: data.user,
      isPremium: data.isPremium
    });
    
    // Update UI
    showMainView(data.user, data.isPremium);
    
    // Notify content scripts
    notifyContentScripts(token, data.isPremium);
    
  } catch (err) {
    console.error('Failed to refresh user data:', err);
  }
}

// Load usage stats
async function loadStats() {
  try {
    const stored = await chrome.storage.local.get(['xthreadToken', 'replyStats']);
    
    if (stored.replyStats) {
      const today = new Date().toISOString().split('T')[0];
      repliesToday.textContent = stored.replyStats[today] || 0;
      repliesTotal.textContent = Object.values(stored.replyStats).reduce((a, b) => a + b, 0);
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Sign in handler
signInBtn.addEventListener('click', () => {
  // Open xthread auth page
  const authUrl = `${XTHREAD_URL}/auth/extension?redirect=${encodeURIComponent(chrome.runtime.getURL('auth-callback.html'))}`;
  chrome.tabs.create({ url: authUrl });
});

// Sign out handler
signOutBtn.addEventListener('click', async () => {
  await signOut();
});

async function signOut() {
  await chrome.storage.local.remove(['xthreadToken', 'xthreadUser', 'isPremium', 'replyStats']);
  
  // Notify content scripts
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
});

async function handleAuthCallback(token) {
  try {
    // Fetch user data
    const response = await fetch(`${XTHREAD_API}/extension/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
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
    
    // Notify content scripts
    notifyContentScripts(token, data.isPremium);
    
  } catch (err) {
    console.error('Auth callback error:', err);
  }
}

// Start
init();
