// xthread Watchlist - Storage Module
// Manages the influencer watchlist with categories in chrome.storage.local

const WATCHLIST_MAX_PER_CATEGORY = 50;
const DEFAULT_CATEGORY = 'General';

/**
 * Get all watchlist categories
 * @returns {Promise<string[]>}
 */
async function getWatchlistCategories() {
  try {
    const stored = await chrome.storage.local.get(['watchlistCategories']);
    return stored.watchlistCategories || [DEFAULT_CATEGORY];
  } catch (err) {
    console.debug('[xthread] Error getting categories:', err);
    return [DEFAULT_CATEGORY];
  }
}

/**
 * Get the active watchlist category
 * @returns {Promise<string>}
 */
async function getActiveWatchlist() {
  try {
    const stored = await chrome.storage.local.get(['activeWatchlist', 'watchlistCategories']);
    const categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
    const active = stored.activeWatchlist || DEFAULT_CATEGORY;
    // Ensure active category exists
    return categories.includes(active) ? active : categories[0] || DEFAULT_CATEGORY;
  } catch (err) {
    console.debug('[xthread] Error getting active watchlist:', err);
    return DEFAULT_CATEGORY;
  }
}

/**
 * Set the active watchlist category
 * @param {string} category
 */
async function setActiveWatchlist(category) {
  try {
    await chrome.storage.local.set({ activeWatchlist: category });
  } catch (err) {
    console.debug('[xthread] Error setting active watchlist:', err);
  }
}

/**
 * Get accounts in a specific category
 * @param {string} category
 * @returns {Promise<Array<{handle: string, displayName: string, avatar: string|null, addedAt: string}>>}
 */
async function getWatchlistAccounts(category) {
  try {
    const stored = await chrome.storage.local.get(['watchlistAccounts']);
    const accounts = stored.watchlistAccounts || {};
    return accounts[category] || [];
  } catch (err) {
    console.debug('[xthread] Error getting watchlist accounts:', err);
    return [];
  }
}

/**
 * Get all watchlist accounts across all categories (for backward compatibility)
 * @returns {Promise<Array>}
 */
async function getWatchlist() {
  try {
    const stored = await chrome.storage.local.get(['watchlistAccounts', 'watchlist']);
    
    // Support legacy format
    if (stored.watchlist && !stored.watchlistAccounts) {
      return stored.watchlist;
    }
    
    // Flatten all categories
    const accounts = stored.watchlistAccounts || {};
    const all = [];
    Object.values(accounts).forEach(categoryAccounts => {
      all.push(...categoryAccounts);
    });
    return all;
  } catch (err) {
    console.debug('[xthread] Error getting watchlist:', err);
    return [];
  }
}

/**
 * Create a new watchlist category
 * @param {string} name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function createCategory(name) {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Category name cannot be empty' };
    }
    if (trimmed.length > 30) {
      return { success: false, error: 'Category name too long (max 30 chars)' };
    }
    
    const categories = await getWatchlistCategories();
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: 'Category already exists' };
    }
    if (categories.length >= 20) {
      return { success: false, error: 'Maximum 20 categories allowed' };
    }
    
    categories.push(trimmed);
    await chrome.storage.local.set({ watchlistCategories: categories });
    
    console.debug('[xthread] Created category:', trimmed);
    return { success: true };
  } catch (err) {
    console.debug('[xthread] Error creating category:', err);
    return { success: false, error: 'Failed to create category' };
  }
}

/**
 * Rename a watchlist category
 * @param {string} oldName
 * @param {string} newName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function renameCategory(oldName, newName) {
  try {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'Category name cannot be empty' };
    }
    
    const stored = await chrome.storage.local.get(['watchlistCategories', 'watchlistAccounts', 'activeWatchlist']);
    const categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
    const accounts = stored.watchlistAccounts || {};
    
    const index = categories.findIndex(c => c === oldName);
    if (index === -1) {
      return { success: false, error: 'Category not found' };
    }
    
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== oldName)) {
      return { success: false, error: 'Category name already exists' };
    }
    
    // Update category name
    categories[index] = trimmed;
    
    // Move accounts to new key
    if (accounts[oldName]) {
      accounts[trimmed] = accounts[oldName];
      delete accounts[oldName];
    }
    
    // Update active if needed
    const updates = { watchlistCategories: categories, watchlistAccounts: accounts };
    if (stored.activeWatchlist === oldName) {
      updates.activeWatchlist = trimmed;
    }
    
    await chrome.storage.local.set(updates);
    console.debug('[xthread] Renamed category:', oldName, '->', trimmed);
    return { success: true };
  } catch (err) {
    console.debug('[xthread] Error renaming category:', err);
    return { success: false, error: 'Failed to rename category' };
  }
}

/**
 * Delete a watchlist category
 * @param {string} name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteCategory(name) {
  try {
    const stored = await chrome.storage.local.get(['watchlistCategories', 'watchlistAccounts', 'activeWatchlist']);
    const categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
    const accounts = stored.watchlistAccounts || {};
    
    if (categories.length <= 1) {
      return { success: false, error: 'Cannot delete the last category' };
    }
    
    const index = categories.findIndex(c => c === name);
    if (index === -1) {
      return { success: false, error: 'Category not found' };
    }
    
    // Remove category
    categories.splice(index, 1);
    delete accounts[name];
    
    // Update active if needed
    const updates = { watchlistCategories: categories, watchlistAccounts: accounts };
    if (stored.activeWatchlist === name) {
      updates.activeWatchlist = categories[0];
    }
    
    await chrome.storage.local.set(updates);
    console.debug('[xthread] Deleted category:', name);
    return { success: true };
  } catch (err) {
    console.debug('[xthread] Error deleting category:', err);
    return { success: false, error: 'Failed to delete category' };
  }
}

/**
 * Add an account to a specific watchlist category
 * @param {Object} account - Account to add
 * @param {string} account.handle - Twitter handle (without @)
 * @param {string} account.displayName - Display name
 * @param {string|null} account.avatar - Avatar URL (optional)
 * @param {string} category - Category to add to
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function addToWatchlist(account, category = null) {
  try {
    const stored = await chrome.storage.local.get(['watchlistCategories', 'watchlistAccounts', 'activeWatchlist']);
    const categories = stored.watchlistCategories || [DEFAULT_CATEGORY];
    const accounts = stored.watchlistAccounts || {};
    
    // Use provided category, active category, or default
    const targetCategory = category || stored.activeWatchlist || DEFAULT_CATEGORY;
    
    // Ensure category exists
    if (!categories.includes(targetCategory)) {
      categories.push(targetCategory);
    }
    
    // Initialize category if needed
    if (!accounts[targetCategory]) {
      accounts[targetCategory] = [];
    }
    
    // Check max limit
    if (accounts[targetCategory].length >= WATCHLIST_MAX_PER_CATEGORY) {
      return { 
        success: false, 
        error: `Category is full (max ${WATCHLIST_MAX_PER_CATEGORY} accounts). Remove some to add more.` 
      };
    }
    
    // Check if already in this category
    const normalizedHandle = account.handle.toLowerCase().replace('@', '');
    const existing = accounts[targetCategory].find(w => w.handle.toLowerCase() === normalizedHandle);
    if (existing) {
      return { success: false, error: `Already watching in "${targetCategory}"` };
    }
    
    // Add to watchlist
    const newEntry = {
      handle: normalizedHandle,
      displayName: account.displayName || normalizedHandle,
      avatar: account.avatar || null,
      addedAt: new Date().toISOString()
    };
    
    accounts[targetCategory].unshift(newEntry);
    await chrome.storage.local.set({ 
      watchlistCategories: categories,
      watchlistAccounts: accounts 
    });
    
    console.debug('[xthread] Added to watchlist:', normalizedHandle, 'in', targetCategory);
    return { success: true, category: targetCategory };
    
  } catch (err) {
    console.debug('[xthread] Error adding to watchlist:', err);
    return { success: false, error: 'Failed to save to watchlist' };
  }
}

/**
 * Remove an account from a specific category
 * @param {string} handle - Twitter handle to remove
 * @param {string} category - Category to remove from
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function removeFromWatchlist(handle, category) {
  try {
    const stored = await chrome.storage.local.get(['watchlistAccounts']);
    const accounts = stored.watchlistAccounts || {};
    
    if (!accounts[category]) {
      return { success: false, error: 'Category not found' };
    }
    
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    const index = accounts[category].findIndex(w => w.handle.toLowerCase() === normalizedHandle);
    
    if (index === -1) {
      return { success: false, error: 'Account not in this watchlist' };
    }
    
    accounts[category].splice(index, 1);
    await chrome.storage.local.set({ watchlistAccounts: accounts });
    
    console.debug('[xthread] Removed from watchlist:', normalizedHandle, 'from', category);
    return { success: true };
    
  } catch (err) {
    console.debug('[xthread] Error removing from watchlist:', err);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}

/**
 * Check if an account is being watched (in any category)
 * @param {string} handle - Twitter handle to check
 * @returns {Promise<{isWatching: boolean, categories: string[]}>}
 */
async function isWatching(handle) {
  try {
    const stored = await chrome.storage.local.get(['watchlistAccounts']);
    const accounts = stored.watchlistAccounts || {};
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    
    const categories = [];
    for (const [category, list] of Object.entries(accounts)) {
      if (list.some(w => w.handle.toLowerCase() === normalizedHandle)) {
        categories.push(category);
      }
    }
    
    return { isWatching: categories.length > 0, categories };
  } catch (err) {
    console.debug('[xthread] Error checking watchlist:', err);
    return { isWatching: false, categories: [] };
  }
}

/**
 * Update avatar for a watched account across all categories
 * @param {string} handle - Twitter handle
 * @param {string} avatar - New avatar URL
 */
async function updateWatchlistAvatar(handle, avatar) {
  try {
    const stored = await chrome.storage.local.get(['watchlistAccounts']);
    const accounts = stored.watchlistAccounts || {};
    const normalizedHandle = handle.toLowerCase().replace('@', '');
    let updated = false;
    
    for (const category of Object.keys(accounts)) {
      const entry = accounts[category].find(w => w.handle.toLowerCase() === normalizedHandle);
      if (entry && avatar && entry.avatar !== avatar) {
        entry.avatar = avatar;
        updated = true;
      }
    }
    
    if (updated) {
      await chrome.storage.local.set({ watchlistAccounts: accounts });
      console.debug('[xthread] Updated avatar for:', normalizedHandle);
    }
  } catch (err) {
    console.debug('[xthread] Error updating avatar:', err);
  }
}

/**
 * Get total watchlist count across all categories
 * @returns {Promise<number>}
 */
async function getWatchlistCount() {
  const stored = await chrome.storage.local.get(['watchlistAccounts']);
  const accounts = stored.watchlistAccounts || {};
  let count = 0;
  Object.values(accounts).forEach(list => {
    count += list.length;
  });
  return count;
}

/**
 * Migrate from old flat watchlist to new category structure
 */
async function migrateWatchlist() {
  try {
    const stored = await chrome.storage.local.get(['watchlist', 'watchlistCategories', 'watchlistAccounts']);
    
    // Already migrated or no old data
    if (stored.watchlistAccounts || !stored.watchlist || stored.watchlist.length === 0) {
      return;
    }
    
    console.debug('[xthread] Migrating watchlist to category structure...');
    
    // Migrate old flat list to General category
    await chrome.storage.local.set({
      watchlistCategories: [DEFAULT_CATEGORY],
      watchlistAccounts: {
        [DEFAULT_CATEGORY]: stored.watchlist
      },
      activeWatchlist: DEFAULT_CATEGORY
    });
    
    console.debug('[xthread] Migration complete, moved', stored.watchlist.length, 'accounts to General');
  } catch (err) {
    console.debug('[xthread] Error migrating watchlist:', err);
  }
}

// Run migration on load
migrateWatchlist();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.xthreadWatchlist = {
    // Category management
    getWatchlistCategories,
    getActiveWatchlist,
    setActiveWatchlist,
    createCategory,
    renameCategory,
    deleteCategory,
    
    // Account management
    getWatchlist,
    getWatchlistAccounts,
    addToWatchlist,
    removeFromWatchlist,
    isWatching,
    updateWatchlistAvatar,
    getWatchlistCount,
    
    // Constants
    WATCHLIST_MAX_PER_CATEGORY,
    DEFAULT_CATEGORY
  };
}
