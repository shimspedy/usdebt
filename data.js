// Data fetching and API management for the U.S. Fiscal Dashboard
class DataManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // Reduced to 2 minutes for more frequent API attempts
    this.useFallbackData = false; // Flag to use fallback when APIs fail
    this.useProxy = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * Get the appropriate API base URL
   * @param {string} endpoint - API endpoint type (debt, mts, dts)
   * @returns {string} Base URL for API calls
   */
  getApiBase(endpoint) {
    if (this.useProxy) {
      // Use proxy server for local development
      const proxyMap = {
        'debt': '/api/debt',
        'mts': '/api/mts', 
        'dts': '/api/dts'
      };
      return proxyMap[endpoint] || '/api/debt';
    } else {
      // Production: use direct Treasury API (CORS-enabled endpoints only)
      return 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
    }
  }

  /**
   * Get fallback fiscal data when APIs are unavailable
   * @returns {Object} Empty data structure - forces API retry
   */
  getFallbackFiscalData() {
    console.warn('API fallback triggered - all data must come from Treasury APIs');
    // Return empty structure to force API retry rather than showing stale data
    return {
      data: [],
      meta: {
        count: 0,
        error: 'Treasury API unavailable - retrying...',
        labels: {}
      }
    };
  }

  /**
   * Force refresh by clearing cache and retrying APIs
   */
  forceRefresh() {
    this.cache.clear();
    this.useFallbackData = false;
    Utils.logError('Cache cleared - will attempt fresh API calls');
  }

  /**
   * Generic JSON fetch with error handling
   * @param {string} url - URL to fetch
   * @returns {Promise<Object>} JSON response
   */
  async fetchJSON(url) {
    const response = await fetch(url, { 
      cache: "no-store", 
      mode: "cors" 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Fetch data from Fiscal Data API with retry logic and proxy support
   * @param {string} path - API path
   * @param {Object} params - Query parameters
   * @param {number} retries - Number of retries
   * @returns {Promise<Object>} API response
   */
  async fetchFiscalData(path, params = {}, retries = 2) {
    const queryString = Utils.createSearchParams(params);
    const fullPath = path + (queryString ? `?${queryString}` : "");
    
    // Check cache first
    const cacheKey = fullPath;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine API type and base URL
    let endpoint = 'debt';
    if (path.includes('/mts/')) endpoint = 'mts';
    if (path.includes('/dts/')) endpoint = 'dts';
    
    const baseUrl = this.getApiBase(endpoint);
    const finalUrl = this.useProxy ? `${baseUrl}${queryString ? '?' + queryString : ''}` : `${baseUrl}${fullPath}`;
    
    try {
      const data = await this.fetchJSON(finalUrl);
      this.setCache(cacheKey, data);
      this.useFallbackData = false;
      return data;
    } catch (error) {
      Utils.logError('Treasury API failed - will retry', error);
      this.useFallbackData = true;
      // Don't cache failed requests, throw error to force proper error handling
      throw new Error(`Treasury API unavailable: ${error.message}`);
    }
  }

  /**
   * Fetch data from World Bank API
   * @param {string} indicator - World Bank indicator code
   * @param {number} perPage - Results per page
   * @returns {Promise<Array>} Filtered data array
   */
  async fetchWorldBank(indicator, perPage = CONFIG.api.worldBank.defaultPerPage) {
    const url = `${CONFIG.api.worldBank.base}/${indicator}?format=json&per_page=${perPage}`;
    
    // Check cache first
    const cached = this.getFromCache(url);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchJSON(url);
      const data = response[1]?.filter?.(record => record?.value != null) || [];
      this.setCache(url, data);
      return data;
    } catch (error) {
      Utils.logError('WorldBank API', error);
      throw error;
    }
  }

  /**
   * Get data from cache if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set data in cache with timestamp
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }
}

// Data processing utilities
class DataProcessor {
  /**
   * Calculate rate per second between two data points
   * @param {number} currentValue - Current value
   * @param {number} previousValue - Previous value
   * @param {number} currentTimestamp - Current timestamp
   * @param {number} previousTimestamp - Previous timestamp
   * @returns {number} Rate per second
   */
  static calculateRatePerSecond(currentValue, previousValue, currentTimestamp, previousTimestamp) {
    const timeDiff = Math.max(1, currentTimestamp - previousTimestamp);
    return (currentValue - previousValue) / timeDiff;
  }

  /**
   * Calculate live value based on base value and rate
   * @param {Object} state - State object with baseValue, baseTs, and ratePerSec
   * @returns {number|null} Live calculated value
   */
  static calculateLiveValue(state) {
    if (!state || Utils.isNullish(state.baseValue)) return null;
    if (Utils.isNullish(state.ratePerSec) || Utils.isNullish(state.baseTs)) {
      return state.baseValue;
    }
    return state.baseValue + state.ratePerSec * (Utils.nowSeconds() - state.baseTs);
  }

  /**
   * Process debt data from Fiscal Data API
   * @param {Array} rows - API response data
   * @returns {Object} Processed state object
   */
  static processDebtData(rows) {
    if (rows.length < 2) throw new Error("Insufficient debt data");
    
    const [current, previous] = rows;
    const currentValue = Utils.toNumber(current.tot_pub_debt_out_amt);
    const previousValue = Utils.toNumber(previous.tot_pub_debt_out_amt);
    const currentTime = Utils.parseDate(current.record_date);
    const previousTime = Utils.parseDate(previous.record_date);
    
    const ratePerSec = this.calculateRatePerSecond(
      currentValue, previousValue, currentTime, previousTime
    );
    
    return {
      baseValue: currentValue,
      baseTs: currentTime,
      ratePerSec,
      meta: `Base ${current.record_date} • Rate ${Utils.formatUSD(ratePerSec, CONFIG.constants.CURRENCY_DECIMAL_PLACES)}/s`
    };
  }

  /**
   * Process MTS data (receipts/outlays) from Fiscal Data API
   * @param {Array} rows - API response data
   * @param {string} field - Field name to extract
   * @returns {Object} Processed state object
   */
  static processMTSData(rows, field) {
    if (rows.length < 2) throw new Error("Insufficient MTS data");
    
    const [current, previous] = rows;
    const currentValue = Utils.toNumber(current[field]);
    const previousValue = Utils.toNumber(previous[field]);
    const currentTime = Utils.parseDate(current.record_date);
    const previousTime = Utils.parseDate(previous.record_date);
    
    const ratePerSec = this.calculateRatePerSecond(
      currentValue, previousValue, currentTime, previousTime
    );
    
    return {
      baseValue: currentValue,
      baseTs: currentTime,
      ratePerSec,
      meta: `As of ${current.record_date}`
    };
  }

  /**
   * Process generic data with two data points for rate calculation
   * @param {Array} rows - API response data
   * @param {string} field - Field name to extract value from
   * @returns {Object} Processed state object
   */
  static processGenericData(rows, field) {
    if (rows.length < 1) throw new Error("Insufficient data");
    
    const [current, previous] = rows;
    const currentValue = Utils.toNumber(current[field]);
    const currentTime = Utils.parseDate(current.record_date);
    
    let ratePerSec = 0;
    if (previous && previous[field]) {
      const previousValue = Utils.toNumber(previous[field]);
      const previousTime = Utils.parseDate(previous.record_date);
      ratePerSec = this.calculateRatePerSecond(currentValue, previousValue, currentTime, previousTime);
    }
    
    return {
      baseValue: currentValue,
      baseTs: currentTime,
      ratePerSec,
      meta: `As of ${current.record_date}`
    };
  }

  /**
   * Process World Bank data with continuous growth calculation
   * @param {Array} rows - World Bank API response data
   * @returns {Object} Processed state object
   */
  static processWorldBankData(rows) {
    const [current, previous] = rows.slice(0, 2);
    if (!current || !previous) throw new Error("Insufficient World Bank data");
    
    const currentValue = Utils.toNumber(current.value);
    const previousValue = Utils.toNumber(previous.value);
    const growthRate = (currentValue - previousValue) / previousValue;
    const ratePerSec = Math.log(1 + growthRate) / CONFIG.constants.SEC_YEAR * currentValue;
    const baseTime = Utils.parseDate(`${current.date}-01-01`, 'T00:00:00Z');
    
    return {
      baseValue: currentValue,
      baseTs: baseTime,
      ratePerSec,
      meta: `WB year ${current.date}`
    };
  }
}

// Make classes globally available
if (typeof window !== 'undefined') {
  window.DataManager = DataManager;
  window.DataProcessor = DataProcessor;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataManager, DataProcessor };
}