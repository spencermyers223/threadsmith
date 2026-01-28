// xthread Reply Coach - Content Script
// Coaches users on HOW to reply, not what to say

const XTHREAD_API = 'https://xthread.io/api';

// State
let userToken = null;
let isPremium = false;
let isProcessing = false;

// Initialize
async function init() {
  console.log('[xthread] Reply Coach initializing...');
  
  // Get auth from storage
  const stored = await chrome.storage.local.get(['xthreadToken', 'isPremium']);
  userToken = stored.xthreadToken;
  isPremium = stored.isPremium || false;
  
  if (!userToken) {
    console.log('[xthread] Not authenticated. Click extension icon to sign in.');
    return;
  }
  
  // Start observing for new posts
  observePosts();
  
  // Process existing posts
  processExistingPosts();
}

// Observe DOM for new posts (X uses infinite scroll)
function observePosts() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const posts = node.querySelectorAll ? 
              node.querySelectorAll('article[data-testid="tweet"]') : [];
            posts.forEach(injectButtons);
            
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              injectButtons(node);
            }
          }
        });
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Process posts already on page
function processExistingPosts() {
  const posts = document.querySelectorAll('article[data-testid="tweet"]');
  posts.forEach(injectButtons);
}

// Inject buttons into a post
function injectButtons(post) {
  if (post.dataset.xthreadProcessed) return;
  post.dataset.xthreadProcessed = 'true';
  
  const actionBar = post.querySelector('[role="group"]');
  if (!actionBar) return;
  
  // Create button container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'xthread-btn-container';
  btnContainer.innerHTML = `
    <button class="xthread-coach-btn" title="Get reply coaching">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
      <span class="xthread-btn-text">Coach</span>
    </button>
    <button class="xthread-save-btn" title="Save for later">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
  `;
  
  // Coach button handler
  const coachBtn = btnContainer.querySelector('.xthread-coach-btn');
  coachBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleGetCoaching(post, coachBtn);
  });
  
  // Save button handler
  const saveBtn = btnContainer.querySelector('.xthread-save-btn');
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSavePost(post, saveBtn);
  });
  
  // Check if already saved
  checkIfSaved(post, saveBtn);
  
  const lastAction = actionBar.lastElementChild;
  actionBar.insertBefore(btnContainer, lastAction);
}

// Get coaching for a post
async function handleGetCoaching(post, btn) {
  if (isProcessing) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  if (!isPremium) {
    showToast('Reply Coach is a premium feature. Upgrade at xthread.io');
    return;
  }
  
  isProcessing = true;
  btn.classList.add('xthread-loading');
  
  try {
    const postData = extractPostData(post);
    const coaching = await generateCoaching(postData);
    showCoachingPanel(post, coaching, postData);
  } catch (err) {
    console.error('[xthread] Error getting coaching:', err);
    showToast('Failed to get coaching. Please try again.');
  } finally {
    isProcessing = false;
    btn.classList.remove('xthread-loading');
  }
}

// Extract data from a post
function extractPostData(post) {
  const authorEl = post.querySelector('[data-testid="User-Name"]');
  const author = authorEl?.textContent || '';
  
  const textEl = post.querySelector('[data-testid="tweetText"]');
  const text = textEl?.textContent || '';
  
  const metrics = {};
  const replyCount = post.querySelector('[data-testid="reply"]')?.textContent;
  const retweetCount = post.querySelector('[data-testid="retweet"]')?.textContent;
  const likeCount = post.querySelector('[data-testid="like"]')?.textContent;
  
  if (replyCount) metrics.replies = replyCount;
  if (retweetCount) metrics.retweets = retweetCount;
  if (likeCount) metrics.likes = likeCount;
  
  // Get post age
  const timeEl = post.querySelector('time');
  const postAge = timeEl?.textContent || '';
  
  const postLink = timeEl?.closest('a')?.href || window.location.href;
  
  // Try to extract follower count from author info (if visible)
  let authorFollowers = '';
  const followerEl = post.querySelector('[data-testid="UserFollowers"]');
  if (followerEl) {
    authorFollowers = followerEl.textContent;
  }
  
  return {
    author,
    text,
    metrics,
    url: postLink,
    postAge,
    authorFollowers
  };
}

// Call API for coaching
async function generateCoaching(postData) {
  const response = await fetch(`${XTHREAD_API}/extension/generate-replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ post: postData })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }
  
  const data = await response.json();
  return data.coaching;
}

// Show coaching panel UI
function showCoachingPanel(post, coaching, postData) {
  // Remove existing panel
  const existing = post.querySelector('.xthread-coach-panel');
  if (existing) existing.remove();
  
  const panel = document.createElement('div');
  panel.className = 'xthread-coach-panel';
  
  // Header with post score
  const scoreClass = coaching.postScore.score >= 7 ? 'high' : 
                     coaching.postScore.score >= 4 ? 'medium' : 'low';
  const urgencyEmoji = coaching.postScore.timeUrgency === 'high' ? '🔥' :
                       coaching.postScore.timeUrgency === 'medium' ? '⏰' : '📋';
  
  panel.innerHTML = `
    <div class="xthread-panel-header">
      <div class="xthread-header-left">
        <span class="xthread-logo">✨ Reply Coach</span>
        <span class="xthread-tip">Replies are weighted 75x in the algorithm!</span>
      </div>
      <button class="xthread-close-btn">×</button>
    </div>
    
    <!-- Post Score -->
    <div class="xthread-score-section">
      <div class="xthread-score-badge ${scoreClass}">
        <span class="xthread-score-number">${coaching.postScore.score}</span>
        <span class="xthread-score-label">/10</span>
      </div>
      <div class="xthread-score-info">
        <div class="xthread-score-title">
          ${coaching.postScore.worthReplying ? 'Worth Replying' : 'Consider Skipping'}
          <span class="xthread-urgency">${urgencyEmoji} ${coaching.postScore.timeUrgency} urgency</span>
        </div>
        <div class="xthread-score-reasoning">${escapeHtml(coaching.postScore.reasoning)}</div>
      </div>
    </div>
    
    <!-- Recommended Tone -->
    <div class="xthread-tone-section">
      <div class="xthread-section-title">🎯 Recommended Tone</div>
      <div class="xthread-tone-badge">${coaching.toneRecommendation.primary}</div>
      <div class="xthread-tone-why">${escapeHtml(coaching.toneRecommendation.why)}</div>
    </div>
    
    <!-- Strategic Angles -->
    <div class="xthread-angles-section">
      <div class="xthread-section-title">💡 Strategic Angles</div>
      <div class="xthread-angles">
        ${coaching.angles.map((angle, i) => `
          <div class="xthread-angle-card" data-index="${i}">
            <div class="xthread-angle-header">
              <span class="xthread-angle-title">${escapeHtml(angle.title)}</span>
              <span class="xthread-angle-tone">${angle.tone}</span>
            </div>
            <div class="xthread-angle-desc">${escapeHtml(angle.description)}</div>
            ${angle.example ? `<div class="xthread-angle-example">"${escapeHtml(angle.example)}"</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Hook Starters -->
    <div class="xthread-hooks-section">
      <div class="xthread-section-title">🪝 Hook Starters <span class="xthread-hint">(click to copy)</span></div>
      <div class="xthread-hooks">
        ${coaching.hookStarters.map(hook => `
          <div class="xthread-hook" data-text="${escapeHtml(hook.text)}">
            <span class="xthread-hook-text">"${escapeHtml(hook.text)}"</span>
            <span class="xthread-hook-angle">${escapeHtml(hook.angle)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Pitfalls -->
    <div class="xthread-pitfalls-section">
      <div class="xthread-section-title">⚠️ What to Avoid</div>
      <ul class="xthread-pitfalls">
        ${coaching.pitfalls.map(pitfall => `
          <li>${escapeHtml(pitfall)}</li>
        `).join('')}
      </ul>
    </div>
    
    <!-- Action Bar -->
    <div class="xthread-action-bar">
      <button class="xthread-start-reply-btn">Start Writing Reply →</button>
    </div>
  `;
  
  // Insert after action bar
  const actionBar = post.querySelector('[role="group"]');
  actionBar.parentNode.insertBefore(panel, actionBar.nextSibling);
  
  // Event handlers
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  // Hook click to copy
  panel.querySelectorAll('.xthread-hook').forEach(hook => {
    hook.addEventListener('click', () => {
      const text = hook.dataset.text;
      navigator.clipboard.writeText(text);
      hook.classList.add('xthread-copied');
      setTimeout(() => hook.classList.remove('xthread-copied'), 1500);
      showToast('Hook copied to clipboard!');
    });
  });
  
  // Start reply button
  panel.querySelector('.xthread-start-reply-btn').addEventListener('click', () => {
    openReplyComposer(post);
  });
  
  // Angle card expansion
  panel.querySelectorAll('.xthread-angle-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('xthread-expanded');
    });
  });
}

// Open X's reply composer
function openReplyComposer(post) {
  const replyBtn = post.querySelector('[data-testid="reply"]');
  if (replyBtn) {
    replyBtn.click();
  }
}

// Save post for later
async function handleSavePost(post, btn) {
  const postData = extractPostData(post);
  
  // Get current saved posts
  const stored = await chrome.storage.local.get(['savedPosts']);
  const savedPosts = stored.savedPosts || [];
  
  // Check if already saved
  const existingIndex = savedPosts.findIndex(p => p.url === postData.url);
  
  if (existingIndex >= 0) {
    // Remove from saved
    savedPosts.splice(existingIndex, 1);
    btn.classList.remove('xthread-saved');
    showToast('Removed from saved posts');
  } else {
    // Add to saved
    savedPosts.unshift({
      ...postData,
      savedAt: new Date().toISOString()
    });
    btn.classList.add('xthread-saved');
    showToast('Saved for later! 📌');
  }
  
  // Keep only last 100 posts
  if (savedPosts.length > 100) {
    savedPosts.splice(100);
  }
  
  await chrome.storage.local.set({ savedPosts });
  
  // Update popup badge
  updateSavedCount(savedPosts.length);
}

// Check if post is already saved
async function checkIfSaved(post, btn) {
  const postData = extractPostData(post);
  const stored = await chrome.storage.local.get(['savedPosts']);
  const savedPosts = stored.savedPosts || [];
  
  if (savedPosts.some(p => p.url === postData.url)) {
    btn.classList.add('xthread-saved');
  }
}

// Update saved count in extension badge
function updateSavedCount(count) {
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    count: count
  });
}

// Show toast notification
function showToast(message) {
  const existing = document.querySelector('.xthread-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'xthread-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('xthread-toast-visible'), 10);
  setTimeout(() => {
    toast.classList.remove('xthread-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for auth updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_UPDATE') {
    userToken = message.token;
    isPremium = message.isPremium;
    console.log('[xthread] Auth updated:', { isPremium });
  }
});

// Start
init();
