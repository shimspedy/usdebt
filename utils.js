// Utility functions for the U.S. Fiscal Dashboard
class Utils {
  /**
   * Shorthand for document.querySelector
   * @param {string} selector - CSS selector
   * @returns {Element|null}
   */
  static $ = (selector) => document.querySelector(selector);

  /**
   * Shorthand for document.querySelectorAll
   * @param {string} selector - CSS selector
   * @returns {NodeList}
   */
  static $$ = (selector) => document.querySelectorAll(selector);

  /**
   * Format number as USD currency with full precision
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted currency string
   */
  static formatUSD(value, decimals = CONFIG.constants.DEFAULT_DECIMAL_PLACES) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Format number with locale-specific formatting - full numbers
   * @param {number} value - Value to format
   * @returns {string} Formatted number string
   */
  static formatNumber(value) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Convert string or number to number, removing commas
   * @param {string|number} value - Value to convert
   * @returns {number} Numeric value
   */
  static toNumber(value) {
    return typeof value === "number" 
      ? value 
      : parseFloat(String(value).replace(/,/g, ''));
  }

  /**
   * Get current timestamp in seconds
   * @returns {number} Current timestamp in seconds
   */
  static nowSeconds() {
    return Date.now() / 1000;
  }

  /**
   * Parse date string to timestamp in seconds
   * @param {string} dateString - Date string to parse
   * @param {string} suffix - Optional suffix to append (e.g., 'T23:59:59Z')
   * @returns {number} Timestamp in seconds
   */
  static parseDate(dateString, suffix = 'T23:59:59Z') {
    return Date.parse(dateString + suffix) / 1000;
  }

  /**
   * Create a delay promise
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Debounce a function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle a function
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Check if a value is null or undefined
   * @param {any} value - Value to check
   * @returns {boolean} True if null or undefined
   */
  static isNullish(value) {
    return value === null || value === undefined;
  }

  /**
   * Safe division that returns 0 for division by zero
   * @param {number} numerator - Numerator
   * @param {number} denominator - Denominator
   * @returns {number} Result of division or 0
   */
  static safeDivide(numerator, denominator) {
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get current year
   * @returns {number} Current year
   */
  static getCurrentYear() {
    return new Date().getFullYear();
  }

  /**
   * Log error with context
   * @param {string} context - Error context
   * @param {Error} error - Error object
   */
  static logError(context, error) {
    console.error(`[${context}]`, error);
  }

  /**
   * Create URL search params string
   * @param {Object} params - Parameters object
   * @returns {string} URL search params string
   */
  static createSearchParams(params) {
    return new URLSearchParams(params || {}).toString();
  }
}

// Make Utils globally available
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}