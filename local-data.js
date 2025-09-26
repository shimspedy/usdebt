/**
 * Local Data Manager
 * Loads debt data from local JSON files instead of making API calls
 */

class LocalDataManager {
  constructor() {
    this.dataCache = {
      historical: null,
      summary: null
    };
  }

  /**
   * Load data from local JSON file
   */
  async loadLocalData(filename) {
    try {
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }
      const data = await response.json();
      console.log(`📊 LocalDataManager: Loaded ${filename}`, data.records_count || 'records');
      return data;
    } catch (error) {
      console.error(`❌ LocalDataManager: Failed to load ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Get historical debt data from local JSON
   */
  async getHistoricalDebtData() {
    if (this.dataCache.historical) {
      console.log('📊 LocalDataManager: Using cached historical data');
      return this.dataCache.historical;
    }

    try {
      console.log('📊 LocalDataManager: Loading historical debt data...');
      this.dataCache.historical = await this.loadLocalData('historical-debt.json');
      return this.dataCache.historical;
    } catch (error) {
      console.error('❌ LocalDataManager: Historical data unavailable, using fallback');
      return this.getFallbackData();
    }
  }

  /**
   * Get summary data
   */
  async getSummaryData() {
    if (this.dataCache.summary) {
      return this.dataCache.summary;
    }

    try {
      this.dataCache.summary = await this.loadLocalData('summary.json');
      return this.dataCache.summary;
    } catch (error) {
      console.error('❌ LocalDataManager: Summary data unavailable');
      return null;
    }
  }

  /**
   * Fallback data if local files aren't available
   */
  getFallbackData() {
    console.log('📊 LocalDataManager: Using fallback historical data');
    
    const fallbackData = [
      { year: 2005, debt: 7932709661723.5, formatted_debt: '$7.9T' },
      { year: 2006, debt: 8506973899215.23, formatted_debt: '$8.5T' },
      { year: 2007, debt: 9007653372262.48, formatted_debt: '$9.0T' },
      { year: 2008, debt: 10024724896912.49, formatted_debt: '$10.0T' },
      { year: 2009, debt: 11909829003511.75, formatted_debt: '$11.9T' },
      { year: 2010, debt: 13560761898207.07, formatted_debt: '$13.6T' },
      { year: 2011, debt: 15222940045451.09, formatted_debt: '$15.2T' },
      { year: 2012, debt: 16432706949636.73, formatted_debt: '$16.4T' },
      { year: 2013, debt: 16719434218058.19, formatted_debt: '$16.7T' },
      { year: 2014, debt: 17824071380733.82, formatted_debt: '$17.8T' },
      { year: 2015, debt: 18150617666751.68, formatted_debt: '$18.2T' },
      { year: 2016, debt: 19573444713936.79, formatted_debt: '$19.6T' },
      { year: 2017, debt: 20244900016053.51, formatted_debt: '$20.2T' },
      { year: 2018, debt: 21516058183180.23, formatted_debt: '$21.5T' },
      { year: 2019, debt: 22719896808919.20, formatted_debt: '$22.7T' },
      { year: 2020, debt: 27747715826332.14, formatted_debt: '$27.7T' },
      { year: 2021, debt: 29617214856051.75, formatted_debt: '$29.6T' },
      { year: 2022, debt: 31419689421557.90, formatted_debt: '$31.4T' },
      { year: 2023, debt: 34001493655565.48, formatted_debt: '$34.0T' },
      { year: 2024, debt: 36218605311689.91, formatted_debt: '$36.2T' },
      { year: 2025, debt: 37454537246248.71, formatted_debt: '$37.5T' }
    ];

    // Calculate annual increases
    for (let i = 1; i < fallbackData.length; i++) {
      const current = fallbackData[i];
      const previous = fallbackData[i - 1];
      current.annual_increase = current.debt - previous.debt;
      current.formatted_increase = this.formatCurrency(current.annual_increase);
      current.percentage_increase = ((current.annual_increase / previous.debt) * 100).toFixed(2);
    }

    return {
      last_updated: new Date().toISOString(),
      data_source: 'Fallback Data',
      records_count: fallbackData.length,
      data: fallbackData
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    if (amount >= 1e12) {
      return `$${(amount / 1e12).toFixed(1)}T`;
    } else if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(1)}B`;
    } else if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(1)}M`;
    }
    return `$${amount.toLocaleString()}`;
  }

  /**
   * Clear cache to force reload
   */
  clearCache() {
    this.dataCache = {
      historical: null,
      summary: null
    };
    console.log('🗑️ LocalDataManager: Cache cleared');
  }

  /**
   * Get data age in hours
   */
  async getDataAge() {
    try {
      const summary = await this.getSummaryData();
      if (!summary || !summary.last_crawled) {
        return null;
      }
      
      const crawlTime = new Date(summary.last_crawled);
      const now = new Date();
      const ageHours = (now - crawlTime) / (1000 * 60 * 60);
      
      return {
        hours: ageHours.toFixed(1),
        isStale: ageHours > 24,
        lastCrawled: summary.last_crawled
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * API compatibility method for existing chart code
   */
  async fetchFiscalData(endpoint, params = {}) {
    console.log('📊 LocalDataManager: fetchFiscalData called - redirecting to local data');
    
    if (endpoint.includes('debt_to_penny')) {
      const data = await this.getHistoricalDebtData();
      return {
        data: data.data || [],
        meta: {
          count: data.records_count,
          last_updated: data.last_updated
        }
      };
    }

    // For other endpoints, return empty data
    return {
      data: [],
      meta: { count: 0 }
    };
  }
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.LocalDataManager = LocalDataManager;
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalDataManager;
}