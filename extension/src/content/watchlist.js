// xthread Watchlist - Storage Module
// Manages the influencer watchlist in chrome.storage.local

const WATCHLIST_MAX = 50;

/**
 * Get the current watchlist
 * @returns {Promise<Array<{handle: string, displayName: string, avatar: string|null, addedAt: string, lastChecked: string|null}>>}
 */
async function getWatchlist() {
  try {
    const stored = await chrome.storage.local.get(['watchlist']);
    return stored.watchlist || [];
  } catch (err) {
    console.debug('[xthread] Error getting watchlist:', err);
    return [];
  }
}

/**
 * Add an account to the watchlist
 * @param {Object} account - Account to add
 * @param {string} account.handle - Twitter handle (without @)
 * @param {string} account.displayName - Display name
 * @param {string|null} account.avatar - Avatar URL (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function addToWatchlist(account) {
  try {
    const watchlist = await getWatchlist();
    
    // Check max limit
    if (watchlist.length >= WATCHLIST_MAX) {
      return { 
        success: false, 
        error: `Watchlist is full (max ${WATCHLIST_MAX} accounts). Remove some to add more.` 
      };
    }
    
    // Check if already watching
    const normalizedHandle = account.handle.toLowerCase().replace('@', '');
    const existing = watchlist.find(w => w.handle.toLowerCase() === normalizedHandle);
    if (existing) {
      return { success: false, error: 'Already watching this account' };
    }
    
    // Add to watchlist
    const newEntry = {
      handle: normalizedHandle,
      displayName: account.displayName || normalizedHandle,
      avatar: account.avatar || null,
      addedAt: new Date().toISOString(),
      lastChecked: null
    };
    
    watchlist.unshift(newEntry);
    await chrome.storage.local.set({ watchlist });
    
    console.debug('[xthread] Added to watchlist:', normalizedHandle);
    return { success: true };
    
  } catch (err) {
    console.debug('[xthread] Error adding to watchlist:', err);
    return { success: false, error: 'Failed to save to watchlist' };
  }
}

/**
 * Remove an account from the watchlist
 * @param {string} handle - Twitter handle to remove
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function removeFromWatchlist(handle) {
  try {
    const watchlist = await getWatchlist();
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    
    const index = watchlist.findIndex(w => w.handle.toLowerCase() === normalizedHandle);
    if (index === -1) {
      return { success: false, error: 'Account not in watchlist' };
    }
    
    watchlist.splice(index, 1);
    await chrome.storage.local.set({ watchlist });
    
    console.debug('[xthread] Removed from watchlist:', normalizedHandle);
    return { success: true };
    
  } catch (err) {
    console.debug('[xthread] Error removing from watchlist:', err);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}

/**
 * Check if an account is being watched
 * @param {string} handle - Twitter handle to check
 * @returns {Promise<boolean>}
 */
async function isWatching(handle) {
  try {
    const watchlist = await getWatchlist();
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    return watchlist.some(w => w.handle.toLowerCase() === normalizedHandle);
  } catch (err) {
    console.debug('[xthread] Error checking watchlist:', err);
    return false;
  }
}

/**
 * Update avatar for a watched account
 * @param {string} handle - Twitter handle
 * @param {string} avatar - New avatar URL
 */
async function updateWatchlistAvatar(handle, avatar) {
  try {
    const watchlist = await getWatchlist();
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    const entry = watchlist.find(w => w.handle.toLowerCase() === normalizedHandle);
    
    if (entry && avatar && entry.avatar !== avatar) {
      entry.avatar = avatar;
      await chrome.storage.local.set({ watchlist });
      console.debug('[xthread] Updated avatar for:', normalizedHandle);
    }
  } catch (err) {
    console.debug('[xthread] Error updating avatar:', err);
  }
}

/**
 * Get watchlist count
 * @returns {Promise<number>}
 */
async function getWatchlistCount() {
  const watchlist = await getWatchlist();
  return watchlist.length;
}

// Export for use in other scripts (when loaded as module)
if (typeof window !== 'undefined') {
  window.xthreadWatchlist = {
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isWatching,
    updateWatchlistAvatar,
    getWatchlistCount,
    WATCHLIST_MAX
  };
}
