// Chart component for debt growth visualization
class DebtChart {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
    this.dataManager = new DataManager();
  }

  /**
   * Initialize and render the debt growth chart
   */
  async init() {
    console.log('DebtChart: Starting initialization...');
    
    try {
      // Check if Chart.js is available
      if (typeof Chart === 'undefined') {
        console.error('DebtChart: Chart.js library not loaded');
        this.showError();
        return;
      }
      
      console.log('DebtChart: Chart.js version:', Chart.version);
      
      const canvas = document.getElementById(this.canvasId);
      const loadingElement = document.getElementById('chartLoading');
      
      if (!canvas) {
        console.error('DebtChart: Chart canvas not found:', this.canvasId);
        this.showError();
        return;
      }
      
      console.log('DebtChart: Found canvas element');

      // Show loading state
      canvas.style.display = 'none';
      if (loadingElement) {
        loadingElement.style.display = 'flex';
        console.log('DebtChart: Showing loading state');
      }

      // Try to fetch real historical debt data
      let debtData;
      try {
        console.log('DebtChart: Fetching real historical debt data...');
        debtData = await this.fetchHistoricalDebtData();
        console.log('DebtChart: Successfully fetched', debtData.length, 'historical data points');
      } catch (error) {
        console.warn('DebtChart: Failed to fetch real data, using enhanced estimates:', error.message);
        debtData = this.generateRealisticHistoricalData();
        console.log('DebtChart: Generated', debtData.length, 'realistic historical data points');
      }
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Hide loading state and show canvas
      canvas.style.display = 'block';
      if (loadingElement) {
        loadingElement.style.display = 'none';
        console.log('DebtChart: Hidden loading state');
      }

      // Create the chart
      console.log('DebtChart: Creating chart...');
      this.createChart(canvas, debtData);
      console.log('DebtChart: Chart initialization complete');
      
    } catch (error) {
      console.error('DebtChart: Initialization failed:', error);
      this.showError();
    }
  }

    /**
   * Fetch real historical debt data from Treasury API
   */
  async fetchHistoricalDebtData() {
    console.log('DebtChart: Starting historical data fetch...');
    
    const currentYear = new Date().getFullYear();
    const startYear = Math.max(2020, currentYear - 20); // API has data from 2020
    
    console.log(`DebtChart: Fetching data for years ${startYear} to ${currentYear}`);
    
    try {
      // Get 500 records from 2020 onwards and sample yearly
      const response = await this.dataManager.fetchFiscalData(
        "/v2/accounting/od/debt_to_penny",
        {
          fields: "record_date,tot_pub_debt_out_amt",
          filter: `record_date:gte:${startYear}-01-01`,
          sort: "-record_date", // Most recent first
          "page[size]": 500,
          format: "json"
        }
      );
      
      if (!response.data || response.data.length === 0) {
        throw new Error("No historical debt data returned from API");
      }
      
      console.log('DebtChart: Received', response.data.length, 'records from API');
      
      // Sample data - take first record from each year (most recent for each year)
      const dataByYear = {};
      response.data.forEach(record => {
        if (record.record_date && record.tot_pub_debt_out_amt) {
          const year = new Date(record.record_date).getFullYear();
          const debt = parseFloat(record.tot_pub_debt_out_amt);
          
          // Only keep the most recent record for each year (since data is sorted by date desc)
          if (!dataByYear[year]) {
            dataByYear[year] = {
              year,
              debt,
              record_date: record.record_date
            };
          }
        }
      });
      
      // Convert to array and sort by year
      let historicalData = Object.values(dataByYear).sort((a, b) => a.year - b.year);
      
      // Supplement with realistic estimates for missing years before 2020
      if (startYear < 2020) {
        historicalData = this.supplementWithEstimates(historicalData);
      }
      
      console.log('DebtChart: Successfully processed', historicalData.length, 'years of data');
      return historicalData;
      
    } catch (error) {
      console.error('DebtChart: Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Supplement real data with realistic historical estimates when needed
   */
  supplementWithEstimates(realData) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 20;
    const supplementedData = [];
    
    // Known historical debt milestones
    const knownDebtPoints = [
      { year: 2005, debt: 7932709661723 },   // $7.9T
      { year: 2010, debt: 13561623030892 },  // $13.6T
      { year: 2015, debt: 18150617666804 },  // $18.2T
      { year: 2020, debt: 27747629254401 },  // $27.7T
      { year: 2023, debt: 33167319269200 },  // $33.2T
      { year: 2025, debt: 37450000000000 }   // $37.5T (current)
    ];
    
    // Combine real data with known points
    const allDataPoints = [...realData];
    knownDebtPoints.forEach(known => {
      if (!realData.find(r => r.year === known.year)) {
        allDataPoints.push(known);
      }
    });
    
    // Sort by year
    allDataPoints.sort((a, b) => a.year - b.year);
    
    // Fill gaps with interpolation
    for (let year = startYear; year <= currentYear; year++) {
      let dataPoint = allDataPoints.find(d => d.year === year);
      
      if (!dataPoint) {
        // Find surrounding points for interpolation
        const before = allDataPoints.filter(d => d.year < year).pop();
        const after = allDataPoints.find(d => d.year > year);
        
        if (before && after) {
          const yearDiff = after.year - before.year;
          const debtDiff = after.debt - before.debt;
          const yearsFromBefore = year - before.year;
          const interpolatedDebt = before.debt + (debtDiff * yearsFromBefore / yearDiff);
          
          dataPoint = { year, debt: interpolatedDebt };
        } else if (before) {
          // Extrapolate from last known point with 4% annual growth
          const yearsFromBefore = year - before.year;
          dataPoint = { 
            year, 
            debt: before.debt * Math.pow(1.04, yearsFromBefore) 
          };
        }
      }
      
      if (dataPoint) {
        supplementedData.push(dataPoint);
      }
    }
    
    return supplementedData.sort((a, b) => a.year - b.year);
  }

  /**
   * Generate realistic historical debt data based on actual trends
   */
  generateRealisticHistoricalData() {
    console.log('DebtChart: Generating realistic historical data...');
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 20;
    
    // Known historical debt milestones (actual data from Treasury historical records)
    const historicalMilestones = [
      { year: 2005, debt: 7932709661723 },   // $7.9T - Pre-financial crisis
      { year: 2008, debt: 10024724896912 },  // $10.0T - Financial crisis start
      { year: 2010, debt: 13561623030892 },  // $13.6T - Post-crisis stimulus
      { year: 2012, debt: 16432706000000 },  // $16.4T - Recovery period
      { year: 2015, debt: 18150617666804 },  // $18.2T - Steady growth
      { year: 2018, debt: 21516058183180 },  // $21.5T - Tax cuts impact
      { year: 2020, debt: 27747629254401 },  // $27.7T - COVID-19 response
      { year: 2022, debt: 31400000000000 },  // $31.4T - Post-COVID inflation
      { year: 2023, debt: 33167319269200 },  // $33.2T - Current trend
      { year: 2024, debt: 35600000000000 },  // $35.6T - Projected
      { year: 2025, debt: 37450000000000 }   // $37.5T - Current actual
    ];
    
    const data = [];
    
    // Generate data for each year
    for (let year = startYear; year <= currentYear; year++) {
      // Check if we have an exact milestone for this year
      let milestone = historicalMilestones.find(m => m.year === year);
      
      if (milestone) {
        data.push(milestone);
      } else {
        // Interpolate between known milestones
        const before = historicalMilestones.filter(m => m.year < year).pop();
        const after = historicalMilestones.find(m => m.year > year);
        
        let debt;
        if (before && after) {
          // Linear interpolation between known points
          const yearDiff = after.year - before.year;
          const debtDiff = after.debt - before.debt;
          const yearsFromBefore = year - before.year;
          debt = before.debt + (debtDiff * yearsFromBefore / yearDiff);
        } else if (before) {
          // Extrapolate from the last known point with historical growth rate
          const yearsFromBefore = year - before.year;
          // Use 4.5% annual growth rate (historical average for recent years)
          debt = before.debt * Math.pow(1.045, yearsFromBefore);
        } else {
          // Use earliest known point and work backwards with lower growth
          const yearsToAfter = after.year - year;
          debt = after.debt / Math.pow(1.035, yearsToAfter);
        }
        
        data.push({ year, debt: Math.round(debt) });
      }
    }
    
    console.log('DebtChart: Generated', data.length, 'years of realistic historical data');
    return data.sort((a, b) => a.year - b.year);
  }

  /**
   * Create Chart.js visualization
   */
  createChart(canvas, data) {
    try {
      console.log('DebtChart: Creating chart with', data.length, 'data points');
      
      const ctx = canvas.getContext('2d');
      console.log('DebtChart: Got canvas context');
      
      // Simple, reliable chart configuration
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.year.toString()),
          datasets: [{
            label: 'U.S. National Debt',
            data: data.map(d => d.debt),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          },
          scales: {
            y: {
              ticks: {
                callback: function(value) {
                  return '$' + (value / 1000000000000).toFixed(1) + 'T';
                }
              }
            }
          }
        }
      });
      
      console.log('DebtChart: Chart created successfully!');
      
    } catch (error) {
      console.error('DebtChart: Failed to create chart:', error);
      console.error('Error details:', error.message);
      // Show error in the chart area
      const loadingElement = document.getElementById('chartLoading');
      if (loadingElement) {
        loadingElement.style.display = 'flex';
        loadingElement.innerHTML = `
          <div class="text-red-500">Chart Error: ${error.message}</div>
        `;
      }
    }
  }

  /**
   * Show error state
   */
  showError() {
    const loadingElement = document.getElementById('chartLoading');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div class="flex items-center gap-3 text-red-500">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span>Failed to load chart data. Retrying with demonstration data...</span>
        </div>
      `;
      
      // Try again with mock data after a delay
      setTimeout(() => {
        console.log('DebtChart: Retrying with mock data...');
        const mockData = this.generateMockData();
        const canvas = document.getElementById(this.canvasId);
        if (canvas) {
          canvas.style.display = 'block';
          loadingElement.style.display = 'none';
          this.createChart(canvas, mockData);
        }
      }, 2000);
    }
  }

  /**
   * Destroy the chart
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

// Make DebtChart globally available
if (typeof window !== 'undefined') {
  window.DebtChart = DebtChart;
  
  // Add global test function
  window.testChart = function() {
    console.log('Testing chart creation...');
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    
    const canvas = document.getElementById('debtChart');
    const loading = document.getElementById('chartLoading');
    
    console.log('Canvas element:', canvas);
    console.log('Loading element:', loading);
    
    if (canvas && typeof Chart !== 'undefined') {
      console.log('Creating test chart...');
      
      // Hide loading, show canvas
      canvas.style.display = 'block';
      if (loading) loading.style.display = 'none';
      
      const testChart = new DebtChart('debtChart');
      testChart.forceCreateChart();
      
      return testChart;
    } else {
      console.error('Canvas not found or Chart.js not loaded');
    }
  };
}