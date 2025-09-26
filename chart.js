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
   * Generate mock data for demonstration
   */
  generateMockData() {
    console.log('DebtChart: Generating mock data...');
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 20;
    const data = [];
    
    // Start with realistic debt figure from ~2004
    let baseDebt = 7354855000000; // ~7.35 trillion in 2004
    
    for (let year = startYear; year <= currentYear; year++) {
      // Simulate compound growth with varying rates based on economic periods
      let growthRate;
      if (year < 2008) {
        growthRate = 0.055; // Pre-crisis growth
      } else if (year < 2014) {
        growthRate = 0.095; // Financial crisis period
      } else if (year < 2020) {
        growthRate = 0.045; // Recovery period
      } else if (year < 2022) {
        growthRate = 0.12; // COVID period
      } else {
        growthRate = 0.035; // Recent normalization
      }
      
      // Add some random variation
      growthRate += (Math.random() - 0.5) * 0.01;
      baseDebt *= (1 + growthRate);
      
      data.push({
        year,
        debt: Math.round(baseDebt)
      });
    }
    
    console.log('DebtChart: Generated mock data:', data.length, 'records');
    return data;
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