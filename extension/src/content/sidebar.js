// xthread Sidebar Component
// Persistent sidebar panel (like Claude's extension)

let sidebarElement = null;
let isSidebarOpen = false;

// Sidebar configuration
const SIDEBAR_WIDTH = 380;

/**
 * Initialize the sidebar - call once when content script loads
 */
function initSidebar() {
  if (sidebarElement) return;
  
  // Create sidebar container
  sidebarElement = document.createElement('div');
  sidebarElement.id = 'xthread-sidebar';
  sidebarElement.className = 'xthread-sidebar';
  sidebarElement.innerHTML = `
    <div class="xthread-sidebar-header">
      <div class="xthread-sidebar-brand">
        <svg class="xthread-sidebar-logo" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span class="xthread-sidebar-title">xthread</span>
      </div>
      <div class="xthread-sidebar-actions">
        <button class="xthread-sidebar-close" title="Close sidebar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="xthread-sidebar-content">
      <div class="xthread-sidebar-empty">
        <div class="xthread-sidebar-empty-icon">✨</div>
        <div class="xthread-sidebar-empty-text">Click "Coach" on any tweet to get personalized reply coaching</div>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(sidebarElement);
  
  // Close button handler
  sidebarElement.querySelector('.xthread-sidebar-close').addEventListener('click', closeSidebar);
  
  // Prevent clicks inside sidebar from bubbling
  sidebarElement.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  console.debug('[xthread] Sidebar initialized');
}

/**
 * Open the sidebar
 */
function openSidebar() {
  if (!sidebarElement) initSidebar();
  
  sidebarElement.classList.add('xthread-sidebar-open');
  isSidebarOpen = true;
  
  // Adjust page layout to make room for sidebar
  adjustPageLayout(true);
}

/**
 * Close the sidebar
 */
function closeSidebar() {
  if (!sidebarElement) return;
  
  sidebarElement.classList.remove('xthread-sidebar-open');
  isSidebarOpen = false;
  
  // Reset page layout
  adjustPageLayout(false);
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  if (isSidebarOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/**
 * Check if sidebar is currently open
 */
function isSidebarVisible() {
  return isSidebarOpen;
}

/**
 * Adjust the main page layout when sidebar opens/closes
 */
function adjustPageLayout(sidebarOpen) {
  // X has a specific layout structure - we want to shift the main content
  const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
  const sidebarColumn = document.querySelector('[data-testid="sidebarColumn"]');
  
  if (sidebarOpen) {
    // Add class to body for global styling adjustments
    document.body.classList.add('xthread-sidebar-active');
    
    // Hide X's sidebar to make room (optional - can be toggled)
    if (sidebarColumn) {
      sidebarColumn.style.display = 'none';
    }
  } else {
    document.body.classList.remove('xthread-sidebar-active');
    
    // Restore X's sidebar
    if (sidebarColumn) {
      sidebarColumn.style.display = '';
    }
  }
}

/**
 * Set sidebar content - main function for updating what's shown
 * @param {string} type - Content type: 'coach', 'empty', 'loading'
 * @param {object} data - Content data (varies by type)
 */
function setSidebarContent(type, data = {}) {
  if (!sidebarElement) initSidebar();
  
  const contentArea = sidebarElement.querySelector('.xthread-sidebar-content');
  if (!contentArea) return;
  
  switch (type) {
    case 'loading':
      contentArea.innerHTML = renderLoadingContent(data.message || 'Analyzing...');
      break;
    
    case 'coach':
      contentArea.innerHTML = renderCoachContent(data.coaching, data.postData);
      attachCoachEventHandlers(contentArea, data.post);
      break;
    
    case 'error':
      contentArea.innerHTML = renderErrorContent(data.message || 'Something went wrong');
      break;
    
    case 'empty':
    default:
      contentArea.innerHTML = renderEmptyContent();
      break;
  }
}

/**
 * Render loading state
 */
function renderLoadingContent(message) {
  return `
    <div class="xthread-sidebar-loading">
      <div class="xthread-loading-spinner"></div>
      <div class="xthread-loading-text">${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Render empty state
 */
function renderEmptyContent() {
  return `
    <div class="xthread-sidebar-empty">
      <div class="xthread-sidebar-empty-icon">✨</div>
      <div class="xthread-sidebar-empty-text">Click "Coach" on any tweet to get personalized reply coaching</div>
    </div>
  `;
}

/**
 * Render error state
 */
function renderErrorContent(message) {
  return `
    <div class="xthread-sidebar-error">
      <div class="xthread-error-icon">⚠️</div>
      <div class="xthread-error-text">${escapeHtml(message)}</div>
      <button class="xthread-error-retry">Try Again</button>
    </div>
  `;
}

/**
 * Render coach content (main coaching panel)
 */
function renderCoachContent(coaching, postData) {
  // Score styling
  const scoreClass = coaching.postScore.score >= 7 ? 'high' : 
                     coaching.postScore.score >= 4 ? 'medium' : 'low';
  const urgencyEmoji = coaching.postScore.timeUrgency === 'high' ? '🔥' :
                       coaching.postScore.timeUrgency === 'medium' ? '⏰' : '📋';
  
  return `
    <!-- Post Context -->
    <div class="xthread-coach-context">
      <div class="xthread-context-label">Coaching for reply to:</div>
      <div class="xthread-context-author">@${escapeHtml(extractHandle(postData.author))}</div>
      <div class="xthread-context-text">${escapeHtml(truncateText(postData.text, 100))}</div>
    </div>
    
    <!-- Worth Replying Score -->
    <div class="xthread-score-card ${scoreClass}">
      <div class="xthread-score-left">
        <div class="xthread-score-number">${coaching.postScore.score}</div>
        <div class="xthread-score-label">/10</div>
      </div>
      <div class="xthread-score-right">
        <div class="xthread-score-title">
          ${coaching.postScore.worthReplying ? 'Worth Replying' : 'Consider Skipping'}
          <span class="xthread-urgency-badge">${urgencyEmoji} ${coaching.postScore.timeUrgency} urgency</span>
        </div>
        <div class="xthread-score-reason">${escapeHtml(coaching.postScore.reasoning)}</div>
      </div>
    </div>
    
    <!-- Algorithm Tip -->
    <div class="xthread-algo-tip-banner">
      <span class="xthread-tip-icon">💡</span>
      <span class="xthread-tip-text">Replies are weighted <strong>75x</strong> in the algorithm!</span>
    </div>
    
    <!-- Recommended Tone -->
    <div class="xthread-section">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">🎯</span>
        <span class="xthread-section-title">Recommended Tone</span>
      </div>
      <div class="xthread-tone-pill">${escapeHtml(coaching.toneRecommendation.primary)}</div>
      <div class="xthread-tone-reason">${escapeHtml(coaching.toneRecommendation.why)}</div>
    </div>
    
    <!-- Strategic Angles -->
    <div class="xthread-section">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">💡</span>
        <span class="xthread-section-title">Strategic Angles</span>
      </div>
      <div class="xthread-angles-list">
        ${coaching.angles.map((angle, i) => `
          <div class="xthread-angle-item" data-index="${i}">
            <div class="xthread-angle-header">
              <span class="xthread-angle-name">${escapeHtml(angle.title)}</span>
              <span class="xthread-angle-tone-badge">${escapeHtml(angle.tone)}</span>
            </div>
            <div class="xthread-angle-desc">${escapeHtml(angle.description)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- Hook Starters -->
    <div class="xthread-section">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">🪝</span>
        <span class="xthread-section-title">Hook Starters</span>
        <span class="xthread-section-hint">(click to copy)</span>
      </div>
      <div class="xthread-hooks-list">
        ${coaching.hookStarters.map(hook => `
          <div class="xthread-hook-item" data-text="${escapeHtml(hook.text)}">
            <span class="xthread-hook-text">"${escapeHtml(hook.text)}"</span>
            <span class="xthread-hook-source">${escapeHtml(hook.angle)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- What to Avoid -->
    <div class="xthread-section xthread-section-warning">
      <div class="xthread-section-header">
        <span class="xthread-section-icon">⚠️</span>
        <span class="xthread-section-title">What to Avoid</span>
      </div>
      <ul class="xthread-avoid-list">
        ${coaching.pitfalls.map(pitfall => `
          <li>${escapeHtml(pitfall)}</li>
        `).join('')}
      </ul>
    </div>
    
    <!-- Start Reply CTA -->
    <div class="xthread-cta-section">
      <button class="xthread-start-reply-btn">
        Start Writing Reply
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Attach event handlers for coach content
 */
function attachCoachEventHandlers(contentArea, post) {
  // Hook click to copy
  contentArea.querySelectorAll('.xthread-hook-item').forEach(hook => {
    hook.addEventListener('click', () => {
      const text = hook.dataset.text;
      navigator.clipboard.writeText(text);
      hook.classList.add('xthread-copied');
      showToast('Hook copied to clipboard!');
      setTimeout(() => hook.classList.remove('xthread-copied'), 1500);
    });
  });
  
  // Start reply button
  const startReplyBtn = contentArea.querySelector('.xthread-start-reply-btn');
  if (startReplyBtn && post) {
    startReplyBtn.addEventListener('click', () => {
      const replyBtn = post.querySelector('[data-testid="reply"]');
      if (replyBtn) {
        replyBtn.click();
      }
    });
  }
}

/**
 * Helper: Extract handle from author string
 */
function extractHandle(author) {
  const match = author.match(/@(\w+)/);
  return match ? match[1] : author;
}

/**
 * Helper: Truncate text with ellipsis
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Helper: Show toast (uses main content script's toast function)
 */
function showToast(message) {
  // This will be overwritten by the main content script
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

// Export functions for use in content.js
window.xthreadSidebar = {
  init: initSidebar,
  open: openSidebar,
  close: closeSidebar,
  toggle: toggleSidebar,
  isOpen: isSidebarVisible,
  setContent: setSidebarContent
};
