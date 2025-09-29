// UI components and management for the U.S. Fiscal Dashboard
class FitNum {
  /**
   * Auto-scaling number display component with improved fitting
   * @param {HTMLElement} wrapper - Container element with .fitwrap class
   */
  constructor(wrapper) {
    this.wrap = wrapper;
    this.el = wrapper.querySelector('.fitnum');
    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(this.wrap);
    this.lastText = '';
  }

  /**
   * Set text content and auto-fit to container
   * @param {string} text - Text to display
   */
  set(text) {
    if (this.el.textContent !== text) {
      this.el.textContent = text;
      this.lastText = text;
      this.fit();
    }
  }

  /**
   * Enhanced fit algorithm for full-length numbers
   */
  fit() {
    if (!this.el || !this.wrap) return;
    
    const containerWidth = this.wrap.clientWidth - 32; // More padding for long numbers
    const containerHeight = this.wrap.clientHeight - 16;
    
    // Reset transform and font size
    this.el.style.transform = 'scale(1)';
    this.el.style.fontSize = '';
    
    // Get natural dimensions
    let textWidth = this.el.scrollWidth;
    let textHeight = this.el.scrollHeight;
    
    // If text is too wide, try reducing font size first
    if (textWidth > containerWidth) {
      const baseFontSize = parseFloat(getComputedStyle(this.el).fontSize);
      const minFontSize = Math.max(baseFontSize * 0.6, 12); // Don't go below 12px
      
      let fontSize = baseFontSize;
      while (textWidth > containerWidth && fontSize > minFontSize) {
        fontSize *= 0.9;
        this.el.style.fontSize = fontSize + 'px';
        textWidth = this.el.scrollWidth;
        textHeight = this.el.scrollHeight;
      }
    }
    
    // If still doesn't fit, apply scaling
    if (textWidth > containerWidth || textHeight > containerHeight) {
      const widthScale = containerWidth / textWidth;
      const heightScale = containerHeight / textHeight;
      const scale = Math.min(widthScale, heightScale, 1);
      
      this.el.style.transform = `scale(${scale})`;
    }
    
    // Ensure text stays centered
    this.el.style.transformOrigin = 'center center';
  }

  /**
   * Cleanup resize observer
   */
  destroy() {
    this.ro?.disconnect();
  }
}

class StatusIndicator {
  /**
   * Status indicator management
   * @param {HTMLElement} dotElement - Status dot element
   * @param {HTMLElement} textElement - Status text element
   */
  constructor(dotElement, textElement) {
    this.dot = dotElement;
    this.text = textElement;
  }

  /**
   * Update status indicator
   * @param {string} color - CSS color value
   * @param {string} message - Status message
   */
  setStatus(color, message) {
    this.dot.style.background = color;
    this.dot.style.boxShadow = `0 0 10px ${color}`;
    this.text.textContent = message;
  }

  /**
   * Set loading status
   */
  setLoading() {
    this.setStatus(CONFIG.status.colors.loading, CONFIG.status.messages.syncing);
  }

  /**
   * Set success status
   */
  setSuccess() {
    this.setStatus(CONFIG.status.colors.success, CONFIG.status.messages.live);
  }

  /**
   * Set error status
   */
  setError() {
    this.setStatus(CONFIG.status.colors.error, CONFIG.status.messages.error);
  }

  /**
   * Set fallback data status
   */
  setFallback() {
    this.setStatus(CONFIG.status.colors.fallback, CONFIG.status.messages.fallback);
  }
}

class CardFactory {
  /**
   * Create a professional dashboard card
   * @param {Object} options - Card options
   * @param {string} options.id - Card ID
   * @param {string} options.title - Card title
   * @param {string} options.badge - Badge text (optional)
   * @returns {Object} Card UI elements
   */
  static makeCard({ id, title, badge = 'OFFICIAL' }) {
    const element = document.createElement('article');
    element.className = "card relative rounded-xl shadow-sheet p-6";
    element.innerHTML = this.getCardHTML(title, badge);
    
    const container = Utils.$('#tilesContainer') || Utils.$('#grid') || document.body;
    container.appendChild(element);
    
    const fitNumber = new FitNum(element.querySelector('.fitwrap'));
    const metaElement = element.querySelector('[data-meta]');
    const errorElement = element.querySelector('[data-err]');
    
    // Add click handler for retry functionality
    element.addEventListener('click', () => {
      if (window.app && typeof window.app.reloadTile === 'function') {
        window.app.reloadTile(id);
      }
    });
    
    return {
      element,
      fitNumber,
      meta: metaElement,
      error: errorElement,
      setError: (message) => this.setErrorState(element, errorElement, message),
      clearError: () => this.clearErrorState(element, errorElement),
      setLoading: () => this.setLoadingState(element, metaElement),
      clearLoading: () => this.clearLoadingState(element, metaElement)
    };
  }

  /**
   * Generate professional card HTML template - compact version
   * @param {string} title - Card title
   * @param {string} badge - Badge text
   * @returns {string} HTML string
   */
  static getCardHTML(title, badge) {
    const badgeClass = this.getBadgeClass(badge);
    
    return `
      <div class="flex items-start justify-between gap-2 mb-3">
        <h3 class="card-title flex-1 text-sm font-medium text-slate-700 leading-tight">${title}</h3>
        <span class="badge ${badgeClass} text-xs">
          ${badge}
        </span>
      </div>
      <div class="fitwrap">
        <span class="fitnum text-slate-900">—</span>
      </div>
      <p class="card-meta text-xs text-slate-500 mt-2 leading-relaxed" data-meta>&nbsp;</p>
      <p class="mt-2 hidden text-xs font-medium text-red-600 bg-red-50 px-2 py-1.5 rounded-md" data-err>&nbsp;</p>
    `;
  }

  /**
   * Get appropriate badge styling class
   * @param {string} badge - Badge text
   * @returns {string} CSS classes
   */
  static getBadgeClass(badge) {
    switch (badge.toUpperCase()) {
      case 'LIVE':
        return 'badge-live';
      case 'DERIVED':
        return 'badge-derived';
      case 'DAILY':
        return 'badge-daily';
      case 'EST.':
        return 'badge-est';
      default:
        return 'badge-official';
    }
  }

  /**
   * Set error state for a card
   * @param {HTMLElement} cardElement - Card element
   * @param {HTMLElement} errorElement - Error message element
   * @param {string} message - Error message
   */
  static setErrorState(cardElement, errorElement, message) {
    cardElement.classList.add('error-state');
    errorElement.innerHTML = `
      <span class="flex items-center gap-2">
        <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>Tap to retry — ${message}</span>
      </span>
    `;
    errorElement.classList.remove('hidden');
  }

  /**
   * Clear error state for a card
   * @param {HTMLElement} cardElement - Card element
   * @param {HTMLElement} errorElement - Error message element
   */
  static clearErrorState(cardElement, errorElement) {
    cardElement.classList.remove('error-state');
    errorElement.classList.add('hidden');
  }

  /**
   * Set loading state for a card
   * @param {HTMLElement} cardElement - Card element
   * @param {HTMLElement} metaElement - Metadata element
   */
  static setLoadingState(cardElement, metaElement) {
    cardElement.classList.add('loading');
    metaElement.classList.add('skel');
  }

  /**
   * Clear loading state for a card
   * @param {HTMLElement} cardElement - Card element
   * @param {HTMLElement} metaElement - Metadata element
   */
  static clearLoadingState(cardElement, metaElement) {
    cardElement.classList.remove('loading');
    metaElement.classList.remove('skel');
  }
}

class AnimationLoop {
  /**
   * Manages the main animation loop for live updates
   */
  constructor() {
    this.callbacks = new Set();
    this.isRunning = false;
  }

  /**
   * Add a callback to the animation loop
   * @param {Function} callback - Function to call on each frame
   */
  addCallback(callback) {
    this.callbacks.add(callback);
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Remove a callback from the animation loop
   * @param {Function} callback - Function to remove
   */
  removeCallback(callback) {
    this.callbacks.delete(callback);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  /**
   * Start the animation loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  /**
   * Stop the animation loop
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Animation loop implementation
   */
  loop() {
    if (!this.isRunning) return;
    
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        Utils.logError('Animation Loop', error);
      }
    });
    
    requestAnimationFrame(() => this.loop());
  }

  /**
   * Clear all callbacks and stop the loop
   */
  destroy() {
    this.callbacks.clear();
    this.stop();
  }
}

// Make classes globally available
if (typeof window !== 'undefined') {
  window.FitNum = FitNum;
  window.StatusIndicator = StatusIndicator;
  window.CardFactory = CardFactory;
  window.AnimationLoop = AnimationLoop;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FitNum, StatusIndicator, CardFactory, AnimationLoop };
}