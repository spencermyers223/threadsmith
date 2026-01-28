// xthread Reply Assistant - Content Script
// Injects "Craft Reply" button into X.com posts

const XTHREAD_API = 'https://xthread.io/api';

// State
let userToken = null;
let isPremium = false;
let isProcessing = false;

// Initialize
async function init() {
  console.log('[xthread] Reply Assistant initializing...');
  
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
            posts.forEach(injectReplyButton);
            
            // Check if the node itself is a post
            if (node.matches && node.matches('article[data-testid="tweet"]')) {
              injectReplyButton(node);
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
  posts.forEach(injectReplyButton);
}

// Inject the "Craft Reply" button into a post
function injectReplyButton(post) {
  // Skip if already processed
  if (post.dataset.xthreadProcessed) return;
  post.dataset.xthreadProcessed = 'true';
  
  // Find the action bar (reply, retweet, like, etc.)
  const actionBar = post.querySelector('[role="group"]');
  if (!actionBar) return;
  
  // Create our button container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'xthread-reply-btn-container';
  btnContainer.innerHTML = `
    <button class="xthread-craft-reply-btn" title="Craft Reply with xthread">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
      <span class="xthread-btn-text">Reply</span>
    </button>
  `;
  
  // Add click handler
  const btn = btnContainer.querySelector('.xthread-craft-reply-btn');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleCraftReply(post, btn);
  });
  
  // Insert before the last action (share button)
  const lastAction = actionBar.lastElementChild;
  actionBar.insertBefore(btnContainer, lastAction);
}

// Handle craft reply click
async function handleCraftReply(post, btn) {
  if (isProcessing) return;
  
  if (!userToken) {
    showToast('Please sign in to xthread first. Click the extension icon.');
    return;
  }
  
  if (!isPremium) {
    showToast('Reply Assistant is a premium feature. Upgrade at xthread.io');
    return;
  }
  
  isProcessing = true;
  btn.classList.add('xthread-loading');
  
  try {
    // Extract post content
    const postData = extractPostData(post);
    
    // Call xthread API
    const replies = await generateReplies(postData);
    
    // Show reply options
    showReplyOptions(post, replies);
    
  } catch (err) {
    console.error('[xthread] Error generating replies:', err);
    showToast('Failed to generate replies. Please try again.');
  } finally {
    isProcessing = false;
    btn.classList.remove('xthread-loading');
  }
}

// Extract data from a post
function extractPostData(post) {
  // Get author
  const authorEl = post.querySelector('[data-testid="User-Name"]');
  const author = authorEl?.textContent || '';
  
  // Get post text
  const textEl = post.querySelector('[data-testid="tweetText"]');
  const text = textEl?.textContent || '';
  
  // Get metrics if visible
  const metrics = {};
  const replyCount = post.querySelector('[data-testid="reply"]')?.textContent;
  const retweetCount = post.querySelector('[data-testid="retweet"]')?.textContent;
  const likeCount = post.querySelector('[data-testid="like"]')?.textContent;
  
  if (replyCount) metrics.replies = replyCount;
  if (retweetCount) metrics.retweets = retweetCount;
  if (likeCount) metrics.likes = likeCount;
  
  // Get post URL
  const timeEl = post.querySelector('time');
  const postLink = timeEl?.closest('a')?.href || window.location.href;
  
  return {
    author,
    text,
    metrics,
    url: postLink
  };
}

// Call xthread API to generate replies
async function generateReplies(postData) {
  const response = await fetch(`${XTHREAD_API}/extension/generate-replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      post: postData
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }
  
  const data = await response.json();
  return data.replies || [];
}

// Show reply options UI
function showReplyOptions(post, replies) {
  // Remove existing panel if any
  const existing = post.querySelector('.xthread-reply-panel');
  if (existing) existing.remove();
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'xthread-reply-panel';
  
  const header = document.createElement('div');
  header.className = 'xthread-panel-header';
  header.innerHTML = `
    <span>✨ Reply Options</span>
    <button class="xthread-close-btn">×</button>
  `;
  panel.appendChild(header);
  
  // Add reply options
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'xthread-options';
  
  replies.forEach((reply, index) => {
    const option = document.createElement('div');
    option.className = 'xthread-reply-option';
    option.innerHTML = `
      <div class="xthread-reply-text">${escapeHtml(reply.text)}</div>
      <div class="xthread-reply-meta">
        <span class="xthread-reply-tone">${reply.tone || 'witty'}</span>
        <button class="xthread-use-btn" data-index="${index}">Use this →</button>
      </div>
    `;
    optionsContainer.appendChild(option);
  });
  
  panel.appendChild(optionsContainer);
  
  // Insert panel after action bar
  const actionBar = post.querySelector('[role="group"]');
  actionBar.parentNode.insertBefore(panel, actionBar.nextSibling);
  
  // Event handlers
  panel.querySelector('.xthread-close-btn').addEventListener('click', () => {
    panel.remove();
  });
  
  panel.querySelectorAll('.xthread-use-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      insertReply(post, replies[idx].text);
      panel.remove();
    });
  });
}

// Insert reply into X's reply box
function insertReply(post, replyText) {
  // Click the reply button to open reply composer
  const replyBtn = post.querySelector('[data-testid="reply"]');
  if (replyBtn) {
    replyBtn.click();
    
    // Wait for reply box to appear
    setTimeout(() => {
      const replyBox = document.querySelector('[data-testid="tweetTextarea_0"]');
      if (replyBox) {
        // Focus and insert text
        replyBox.focus();
        document.execCommand('insertText', false, replyText);
      }
    }, 300);
  }
}

// Show toast notification
function showToast(message) {
  // Remove existing toast
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

// Listen for auth updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_UPDATE') {
    userToken = message.token;
    isPremium = message.isPremium;
    console.log('[xthread] Auth updated:', { isPremium });
  }
});

// Start
init();
