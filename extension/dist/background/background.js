// xthread Reply Coach - Background Service Worker

const XTHREAD_API = 'https://xthread.io/api';
const XTHREAD_URL = 'https://xthread.io';

// Store pending coaching data for sidepanel
let pendingCoaching = null;
let pendingStatsRequest = null;
let pendingVoiceRequest = null;

// ============================================================
// Side Panel Setup - Open when extension icon is clicked
// ============================================================
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[xthread] Side panel setup error:', error));

// ============================================================
// Auto-detect extension auth callback and grab token
// ============================================================
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Check if this is our extension callback page
  if (changeInfo.status === 'complete' && tab.url?.includes('xthread.io/auth/extension-callback')) {
    console.log('[xthread] Detected extension callback page, attempting to grab token...');
    
    // Wait a moment for the page to fully render and get the session
    setTimeout(async () => {
      try {
        // Execute script in the tab to grab the token
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // The page stores the token in a data attribute or we can grab it from the DOM
            const tokenEl = document.querySelector('[data-token]');
            if (tokenEl) {
              return tokenEl.dataset.token;
            }
            // Fallback: look for the token in the code element
            const codeEl = document.querySelector('code');
            if (codeEl && codeEl.textContent) {
              // The token is truncated on display but we need the full one
              // Check if there's a hidden input or data attribute with full token
              const fullTokenEl = document.querySelector('#full-token');
              if (fullTokenEl) {
                return fullTokenEl.value || fullTokenEl.textContent;
              }
            }
            return null;
          }
        });
        
        const token = results?.[0]?.result;
        if (token && token.length > 50) {
          console.log('[xthread] Token captured from callback page!');
          
          // Verify and save the token
          const response = await fetch(`${XTHREAD_API}/extension/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            await chrome.storage.local.set({
              xthreadToken: token,
              xthreadUser: data.user,
              userEmail: data.user?.email || data.email || null,
              isPremium: data.isPremium
            });
            
            console.log('[xthread] Auth successful! Premium:', data.isPremium);
            
            // Close the callback tab
            chrome.tabs.remove(tabId);
            
            // Notify side panel and any open popups
            chrome.runtime.sendMessage({ 
              type: 'AUTH_UPDATE', 
              token,
              email: data.user?.email || data.email,
              isPremium: data.isPremium 
            }).catch(() => {});
            
            // Notify content scripts on X
            const xTabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
            for (const xTab of xTabs) {
              try {
                await chrome.tabs.sendMessage(xTab.id, {
                  type: 'AUTH_UPDATE',
                  token,
                  isPremium: data.isPremium
                });
              } catch (e) {
                // Tab might not have content script
              }
            }
          }
        }
      } catch (err) {
        console.error('[xthread] Error grabbing token:', err);
      }
    }, 1500);
  }
});

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
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COACHING_GENERATED') {
    incrementCoachingCount();
  }
  
  // Store coaching data and open sidepanel
  if (message.type === 'SHOW_COACHING') {
    pendingCoaching = {
      coaching: message.coaching,
      postData: message.postData
    };
    // Forward to sidepanel if it's already open
    chrome.runtime.sendMessage(message).catch(() => {
      // Sidepanel not open yet, data is stored in pendingCoaching
    });
  }
  
  // Open sidepanel when requested
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id }).catch(err => {
          console.error('[xthread] Failed to open side panel:', err);
        });
      }
    });
  }
  
  // Sidepanel requests pending coaching data when it loads
  if (message.type === 'GET_PENDING_COACHING') {
    if (pendingCoaching) {
      sendResponse(pendingCoaching);
      pendingCoaching = null; // Clear after sending
    } else {
      sendResponse(null);
    }
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'UPDATE_BADGE') {
    if (message.count > 0) {
      chrome.action.setBadgeText({ text: message.count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
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
  
  // Watchlist notification handling
  if (message.type === 'WATCHLIST_NOTIFICATION_NEW') {
    updateNotificationBadge();
    // Forward to popup if open
    chrome.runtime.sendMessage({ type: 'WATCHLIST_NOTIFICATION_REFRESH' }).catch(() => {});
  }
  
  if (message.type === 'WATCHLIST_NOTIFICATIONS_READ') {
    updateNotificationBadge();
  }
  
  if (message.type === 'GET_UNREAD_COUNT') {
    getUnreadNotificationCount().then(count => sendResponse({ count }));
    return true; // Keep channel open for async response
  }
  
  // Open Stats tab and fetch top tweets for a profile
  if (message.type === 'OPEN_STATS_TAB') {
    // Store the handle for the sidepanel to pick up
    pendingStatsRequest = { handle: message.handle };
    // Open sidepanel
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id }).catch(err => {
          console.error('[xthread] Failed to open side panel:', err);
        });
        // Forward message to sidepanel
        chrome.runtime.sendMessage({ 
          type: 'SWITCH_TO_STATS', 
          handle: message.handle 
        }).catch(() => {});
      }
    });
  }
  
  // Get pending stats request
  if (message.type === 'GET_PENDING_STATS') {
    if (pendingStatsRequest) {
      sendResponse(pendingStatsRequest);
      pendingStatsRequest = null;
    } else {
      sendResponse(null);
    }
    return true;
  }
  
  // Add to Voice (forward to sidepanel)
  if (message.type === 'ADD_TO_VOICE') {
    // Store the voice request for the sidepanel to pick up
    pendingVoiceRequest = { 
      handle: message.handle,
      displayName: message.displayName,
      avatar: message.avatar
    };
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id }).catch(err => {
          console.error('[xthread] Failed to open side panel:', err);
        });
        // Forward message to sidepanel to handle voice addition
        chrome.runtime.sendMessage({ 
          type: 'ADD_VOICE_PROFILE', 
          handle: message.handle,
          displayName: message.displayName,
          avatar: message.avatar
        }).catch(() => {});
      }
    });
  }
  
  // Get pending voice request
  if (message.type === 'GET_PENDING_VOICE') {
    if (pendingVoiceRequest) {
      sendResponse(pendingVoiceRequest);
      pendingVoiceRequest = null;
    } else {
      sendResponse(null);
    }
    return true;
  }
});

// Update notification badge with unread count
async function updateNotificationBadge() {
  const count = await getUnreadNotificationCount();
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red for notifications
  } else {
    // Fall back to saved posts badge
    await updateBadge();
  }
}

// Get unread notification count
async function getUnreadNotificationCount() {
  const stored = await chrome.storage.local.get(['watchlistNotifications']);
  const notifications = stored.watchlistNotifications || [];
  return notifications.filter(n => !n.read).length;
}

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
