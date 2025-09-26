#!/usr/bin/env node

/**
 * US Debt Data Crawler
 * Fetches debt data from Treasury APIs and saves to local JSON files
 */

const fs = require('fs').promises;
const path = require('path');

class DebtDataCrawler {
  constructor() {
    this.endpoints = {
      debt: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny',
      mts: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1'
    };
    this.dataDir = path.join(__dirname, 'data');
  }

  /**
   * Ensure data directory exists
   */
  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      console.log('📁 Creating data directory...');
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Make API request with error handling
   */
  async fetchFromAPI(fullUrl, params = {}) {
    const url = new URL(fullUrl);
    
    // Add parameters to URL
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });

    console.log(`🌐 Fetching: ${url.toString()}`);

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Success: ${data.data?.length || 0} records received`);
      
      return data;
    } catch (error) {
      console.error(`❌ API Error for ${fullUrl}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch historical debt data (debt to the penny)
   */
  async fetchHistoricalDebt() {
    console.log('\n📈 Fetching Historical Debt Data...');
    
    const currentYear = new Date().getFullYear();
    const startYear = 2005; // Get 20 years of data
    
    try {
      const response = await this.fetchFromAPI(this.endpoints.debt, {
        fields: 'record_date,tot_pub_debt_out_amt',
        filter: `record_date:gte:${startYear}-01-01`,
        sort: '-record_date',
        'page[size]': '1000',
        format: 'json'
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No debt data received');
      }

      // Process data by year - get end of year data
      const dataByYear = {};
      response.data.forEach(record => {
        if (record.record_date && record.tot_pub_debt_out_amt) {
          const date = new Date(record.record_date);
          const year = date.getFullYear();
          const debt = parseFloat(record.tot_pub_debt_out_amt);
          
          // Keep the latest record for each year
          if (!dataByYear[year] || date > new Date(dataByYear[year].record_date)) {
            dataByYear[year] = {
              year,
              debt,
              record_date: record.record_date,
              formatted_debt: this.formatCurrency(debt)
            };
          }
        }
      });

      // Convert to sorted array
      const sortedData = Object.values(dataByYear).sort((a, b) => a.year - b.year);

      // Calculate year-over-year increases
      for (let i = 1; i < sortedData.length; i++) {
        const current = sortedData[i];
        const previous = sortedData[i - 1];
        current.annual_increase = current.debt - previous.debt;
        current.formatted_increase = this.formatCurrency(current.annual_increase);
        current.percentage_increase = ((current.annual_increase / previous.debt) * 100).toFixed(2);
      }

      console.log(`📊 Processed ${sortedData.length} years of debt data (${startYear}-${currentYear})`);
      
      return {
        last_updated: new Date().toISOString(),
        data_source: 'Treasury API - Debt to the Penny',
        records_count: sortedData.length,
        data: sortedData
      };

    } catch (error) {
      console.error('❌ Failed to fetch historical debt data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch current fiscal year data
   */
  async fetchCurrentFiscalData() {
    console.log('\n💰 Fetching Current Fiscal Year Data...');
    
    const currentDate = new Date();
    const fiscalYear = currentDate.getMonth() >= 9 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    
    try {
      const response = await this.fetchFromAPI(this.endpoints.mts, {
        fields: 'record_date,current_month_gross_rcpt_amt,current_month_gross_outly_amt,fytd_gross_rcpt_amt,fytd_gross_outly_amt',
        filter: `record_type_cd:eq:SL,classification_desc:eq:Year-to-Date,record_fiscal_year:eq:${fiscalYear}`,
        sort: '-record_date',
        'page[size]': '12',
        format: 'json'
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No current fiscal data received');
      }

      const processedData = response.data.map(record => ({
        record_date: record.record_date,
        fiscal_year: fiscalYear,
        monthly_receipts: parseFloat(record.current_month_gross_rcpt_amt || 0),
        monthly_outlays: parseFloat(record.current_month_gross_outly_amt || 0),
        ytd_receipts: parseFloat(record.fytd_gross_rcpt_amt || 0),
        ytd_outlays: parseFloat(record.fytd_gross_outly_amt || 0),
        monthly_surplus_deficit: parseFloat(record.current_month_gross_rcpt_amt || 0) - parseFloat(record.current_month_gross_outly_amt || 0),
        ytd_surplus_deficit: parseFloat(record.fytd_gross_rcpt_amt || 0) - parseFloat(record.fytd_gross_outly_amt || 0)
      }));

      console.log(`💼 Processed ${processedData.length} months of fiscal data for FY ${fiscalYear}`);

      return {
        last_updated: new Date().toISOString(),
        data_source: 'Treasury API - Monthly Treasury Statement',
        fiscal_year: fiscalYear,
        records_count: processedData.length,
        data: processedData
      };

    } catch (error) {
      console.error('❌ Failed to fetch current fiscal data:', error.message);
      throw error;
    }
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
   * Save data to JSON file
   */
  async saveToFile(filename, data) {
    const filePath = path.join(this.dataDir, filename);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`💾 Saved: ${filePath}`);
      console.log(`📝 File size: ${(JSON.stringify(data).length / 1024).toFixed(1)}KB`);
    } catch (error) {
      console.error(`❌ Failed to save ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Run the complete crawl process
   */
  async crawl() {
    console.log('🚀 Starting US Debt Data Crawler...\n');
    
    try {
      // Ensure data directory exists
      await this.ensureDataDirectory();

      // Fetch and save historical debt data
      const historicalDebt = await this.fetchHistoricalDebt();
      await this.saveToFile('historical-debt.json', historicalDebt);

      // Try to fetch current fiscal data (optional)
      let currentFiscal = null;
      try {
        currentFiscal = await this.fetchCurrentFiscalData();
        await this.saveToFile('current-fiscal.json', currentFiscal);
      } catch (error) {
        console.log('⚠️  Fiscal data fetch failed, continuing without it:', error.message);
      }

      // Create a combined summary file
      const summary = {
        last_crawled: new Date().toISOString(),
        files_created: currentFiscal ? [
          'historical-debt.json',
          'current-fiscal.json'
        ] : ['historical-debt.json'],
        summary: {
          historical_years: historicalDebt.records_count,
          latest_debt: historicalDebt.data[historicalDebt.data.length - 1],
          current_fiscal_year: currentFiscal?.fiscal_year || null,
          latest_monthly_data: currentFiscal?.data[0] || null
        }
      };

      await this.saveToFile('summary.json', summary);

      console.log('\n✅ Crawl completed successfully!');
      console.log(`📁 Data saved to: ${this.dataDir}`);
      console.log(`🗓️  Historical data: ${historicalDebt.records_count} years`);
      console.log(`💰 Latest debt: ${historicalDebt.data[historicalDebt.data.length - 1]?.formatted_debt}`);

    } catch (error) {
      console.error('\n❌ Crawl failed:', error.message);
      process.exit(1);
    }
  }
}

// Run crawler if called directly
if (require.main === module) {
  const crawler = new DebtDataCrawler();
  crawler.crawl();
}

module.exports = DebtDataCrawler;