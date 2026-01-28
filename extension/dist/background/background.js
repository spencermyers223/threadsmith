// xthread Reply Assistant - Background Service Worker

const XTHREAD_API = 'https://xthread.io/api';

// Track reply stats
async function incrementReplyCount() {
  const today = new Date().toISOString().split('T')[0];
  const stored = await chrome.storage.local.get(['replyStats']);
  const stats = stored.replyStats || {};
  
  stats[today] = (stats[today] || 0) + 1;
  
  await chrome.storage.local.set({ replyStats: stats });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REPLY_GENERATED') {
    incrementReplyCount();
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
  const stored = await chrome.storage.local.get(['replyStats']);
  if (!stored.replyStats) return;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  
  const stats = stored.replyStats;
  const cleaned = {};
  
  for (const [date, count] of Object.entries(stats)) {
    if (date >= cutoffStr) {
      cleaned[date] = count;
    }
  }
  
  await chrome.storage.local.set({ replyStats: cleaned });
}

// Run cleanup on startup
cleanupOldStats();

// Run cleanup daily
chrome.alarms.create('statsCleanup', { periodInMinutes: 60 * 24 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'statsCleanup') {
    cleanupOldStats();
  }
});

console.log('[xthread] Background service worker initialized');
