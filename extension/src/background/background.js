// xthread Reply Coach - Background Service Worker

const XTHREAD_API = 'https://xthread.io/api';

// Track coaching stats
async function incrementCoachingCount() {
  const today = new Date().toISOString().split('T')[0];
  const stored = await chrome.storage.local.get(['coachingStats']);
  const stats = stored.coachingStats || {};
  
  stats[today] = (stats[today] || 0) + 1;
  
  await chrome.storage.local.set({ coachingStats: stats });
}

// Update extension badge with saved count
async function updateBadge() {
  const stored = await chrome.storage.local.get(['savedPosts']);
  const count = stored.savedPosts?.length || 0;
  
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COACHING_GENERATED') {
    incrementCoachingCount();
  }
  
  if (message.type === 'UPDATE_BADGE') {
    if (message.count > 0) {
      chrome.action.setBadgeText({ text: message.count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
  
  if (message.type === 'AUTH_CALLBACK') {
    // Forward to popup if open
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup not open, handle here
      handleAuthCallback(message.token);
    });
  }
});

// Handle auth callback when popup isn't open
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
    
    // Save to storage
    await chrome.storage.local.set({
      xthreadToken: token,
      xthreadUser: data.user,
      isPremium: data.isPremium
    });
    
    // Notify content scripts
    const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_UPDATE',
          token,
          isPremium: data.isPremium
        });
      } catch (err) {
        // Tab might not have content script loaded
      }
    }
  } catch (err) {
    console.error('Auth callback error:', err);
  }
}

// Clean up old stats (keep last 30 days)
async function cleanupOldStats() {
  const stored = await chrome.storage.local.get(['coachingStats']);
  if (!stored.coachingStats) return;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  
  const stats = stored.coachingStats;
  const cleaned = {};
  
  for (const [date, count] of Object.entries(stats)) {
    if (date >= cutoffStr) {
      cleaned[date] = count;
    }
  }
  
  await chrome.storage.local.set({ coachingStats: cleaned });
}

// Initialize on startup
async function init() {
  await cleanupOldStats();
  await updateBadge();
}

init();

// Run cleanup daily
chrome.alarms.create('statsCleanup', { periodInMinutes: 60 * 24 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'statsCleanup') {
    cleanupOldStats();
  }
});

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.savedPosts) {
    updateBadge();
  }
});

console.log('[xthread] Reply Coach background service worker initialized');
