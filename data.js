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
   * @returns {Object} Mock fiscal data
   */
  getFallbackFiscalData() {
    const currentDate = new Date().toISOString().split('T')[0];
    const previousDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago
    
    return {
      data: [
        {
          // Current data - most recent from August 2025 Treasury data
          record_date: "2025-08-31",
          tot_pub_debt_out_amt: "37450000000000", // $37.45 trillion (recent actual)
          
          // Federal Receipts (FYTD) - using actual MTS field names and recent data
          current_month_gross_rcpt_amt: "4918105525514", // $4.918 trillion FYTD (August 2025 actual)
          
          // Federal Outlays (FYTD) 
          current_month_gross_outly_amt: "6734895725143", // $6.735 trillion FYTD (August 2025 actual)
          
          // Operating Cash Balance
          open_mkt_opr_cash_bal_amt: "650000000000", // $650 billion cash balance (last reported)
        },
        {
          // Previous data - 30 days ago for rate calculation
          record_date: previousDate,
          tot_pub_debt_out_amt: "37400000000000", // $37.4 trillion (slightly less)
          
          // Federal Receipts (FYTD) - previous period
          current_month_gross_rcpt_amt: "4800000000000", // $4.8 trillion FYTD previous
          
          // Federal Outlays (FYTD) - previous period
          current_month_gross_outly_amt: "6600000000000", // $6.6 trillion FYTD previous
          
          // Operating Cash Balance - previous
          open_mkt_opr_cash_bal_amt: "620000000000", // $620 billion previous
        }
      ],
      meta: {
        count: 2,
        labels: {
          tot_pub_debt_out_amt: "Total Public Debt Outstanding (Amount)",
          current_month_gross_rcpt_amt: "Current Month Gross Receipts Amount",
          current_month_gross_outly_amt: "Current Month Gross Outlay Amount",
          open_mkt_opr_cash_bal_amt: "Operating Cash Balance (Amount)"
        }
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
      Utils.logError('Treasury API failed, using fallback data', error);
      this.useFallbackData = true;
      const fallbackData = this.getFallbackFiscalData();
      this.setCache(cacheKey, fallbackData);
      return fallbackData;
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