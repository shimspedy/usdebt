// Chart component for debt growth visualization
class DebtChart {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
    
    console.log('🎯 DebtChart: Constructor called with canvasId:', canvasId);
    
    // REMOVE POTENTIALLY FAILING DEPENDENCIES FOR NOW
    this.dataManager = null;
    this.localDataManager = null;
    
    console.log('✅ DebtChart: Constructor completed successfully');
  }

  /**
   * Initialize and render the debt growth chart
   */
  async init() {
    console.log('🚀 DebtChart: Starting initialization...');
    
    try {
      // Check Chart.js availability
      if (typeof Chart === 'undefined') {
        throw new Error('Chart.js library not loaded');
      }
      
      console.log('✅ DebtChart: Chart.js version:', Chart.version);
      
      const canvas = document.getElementById(this.canvasId);
      const loadingElement = document.getElementById('chartLoading');
      
      if (!canvas) {
        console.error('❌ DebtChart: Chart canvas not found:', this.canvasId);
        this.showError();
        return;
      }
      
      console.log('✅ DebtChart: Found canvas element');

      // Show loading state
      canvas.style.display = 'none';
      if (loadingElement) {
        loadingElement.style.display = 'flex';
        console.log('✅ DebtChart: Showing loading state');
      }

      // SIMPLE FIX: Use hardcoded data to test chart display
      console.log('🧪 DebtChart: Using hardcoded test data...');
      const debtData = [
        { year: 2021, debt: 29617214856051.75, annual_increase: 0, formatted_debt: '$29.6T' },
        { year: 2022, debt: 31419689421557.9, annual_increase: 1802474565506, formatted_debt: '$31.4T' },
        { year: 2023, debt: 34001493655565.48, annual_increase: 2581804234007, formatted_debt: '$34.0T' },
        { year: 2024, debt: 36218605311689.91, annual_increase: 2217111656124, formatted_debt: '$36.2T' },
        { year: 2025, debt: 37454537246248.71, annual_increase: 1235931934558, formatted_debt: '$37.5T' }
      ];
      
      console.log('📊 DebtChart: Test data ready:', debtData.length, 'years');
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Hide loading state and show canvas
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      canvas.style.display = 'block';
      
      // Create the chart
      console.log('🎯 DebtChart: About to create chart...');
      this.createChart(canvas, debtData);
      
    } catch (error) {
      console.error('❌ DebtChart: Init failed:', error);
      console.error('❌ Error stack:', error.stack);
      this.showError();
    }
  }  /**
   * Fetch historical debt data - TEMPORARILY using fallback for debugging
   */
  async fetchHistoricalDebtData() {
    console.log('DebtChart: TEMPORARILY using fallback data for debugging...');
    
    // TEMPORARY: Use fallback data to test chart display
    return this.generateRealisticHistoricalData();
    
    /* ORIGINAL LOCAL DATA CODE - commented out for debugging
    console.log('DebtChart: Loading historical data from local JSON...');
    
    // Debug: Check if LocalDataManager is available
    console.log('DebtChart: LocalDataManager available?', typeof LocalDataManager);
    console.log('DebtChart: this.localDataManager exists?', !!this.localDataManager);
    
    try {
      // Try to load from local JSON first
      console.log('DebtChart: Calling localDataManager.getHistoricalDebtData()...');
      const localData = await this.localDataManager.getHistoricalDebtData();
      
      if (localData?.data?.length > 0) {
        console.log(`✅ DebtChart: Loaded ${localData.records_count} years from local data`);
        console.log('DebtChart: Data source:', localData.data_source);
        console.log('DebtChart: Last updated:', localData.last_updated);
        
        // Check data age
        const dataAge = await this.localDataManager.getDataAge();
        if (dataAge?.isStale) {
          console.warn(`⚠️ DebtChart: Data is ${dataAge.hours} hours old - consider running crawler.js`);
        }
        
        return localData.data;
      }
      
      throw new Error('No local data available');
      
    } catch (error) {
      console.error('❌ DebtChart: Local data failed:', error.message);
      console.log('DebtChart: Falling back to generated realistic data...');
      return this.generateRealisticHistoricalData();
    }
    */
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
   * Calculate year-over-year debt increases
   * @param {Array} data - Array of debt data by year
   * @returns {Array} Array of annual debt increases
   */
  calculateDebtIncreases(data) {
    const increases = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        // First year - no previous data, set to 0
        increases.push(0);
      } else {
        const currentYear = data[i];
        const previousYear = data[i - 1];
        const increase = currentYear.debt - previousYear.debt;
        increases.push(increase);
      }
    }
    
    // Log some interesting statistics
    const maxIncrease = Math.max(...increases.slice(1)); // Skip first year (0)
    const maxIncreaseIndex = increases.indexOf(maxIncrease);
    const maxIncreaseYear = data[maxIncreaseIndex]?.year;
    
    console.log(`DebtChart: Largest debt increase was $${(maxIncrease / 1000000000000).toFixed(2)}T in ${maxIncreaseYear}`);
    
    return increases;
  }

  /**
   * Create Chart.js visualization with debt totals and annual increases
   */
  /**
   * Create a simple test chart
   */
  createSimpleChart(canvas, data) {
    try {
      console.log('🎯 DebtChart: Creating SIMPLE chart with', data.length, 'data points');
      
      const ctx = canvas.getContext('2d');
      console.log('🎯 DebtChart: Got canvas context');
      
      console.log('🎯 DebtChart: About to create Chart.js instance...');
      
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.year.toString()),
          datasets: [{
            label: 'US National Debt',
            data: data.map(d => d.debt),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            borderWidth: 2,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'US National Debt (Test Chart)'
            }
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
      
      console.log('🎉 DebtChart: SIMPLE chart created successfully!');
      console.log('🎉 DebtChart: Chart instance:', this.chart);
      
    } catch (error) {
      console.error('❌ DebtChart: Failed to create SIMPLE chart:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Stack trace:', error.stack);
      this.showError();
    }
  }

  createChart(canvas, data) {
    try {
      console.log('🎯 DebtChart: Creating chart with', data.length, 'data points');
      console.log('🎯 DebtChart: Sample data:', data.slice(0, 2));
      
      const ctx = canvas.getContext('2d');
      console.log('🎯 DebtChart: Got canvas context');
      
      // Calculate year-over-year debt increases
      const debtIncreases = this.calculateDebtIncreases(data);
      console.log('🎯 DebtChart: Calculated', debtIncreases.length, 'debt increase data points');
      
      // Enhanced chart configuration with dual datasets
      console.log('🎯 DebtChart: About to create Chart.js instance...');
      
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.year.toString()),
          datasets: [
            {
              label: 'Total National Debt',
              data: data.map(d => d.debt),
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.3,
              yAxisID: 'y'
            },
            {
              label: 'Annual Debt Increase',
              data: debtIncreases,
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.2,
              yAxisID: 'y1',
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { 
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.parsed.y;
                  const label = context.dataset.label;
                  
                  if (label === 'Total National Debt') {
                    return `${label}: $${(value / 1000000000000).toFixed(2)}T`;
                  } else {
                    const sign = value >= 0 ? '+' : '';
                    return `${label}: ${sign}$${(value / 1000000000000).toFixed(2)}T`;
                  }
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Fiscal Year'
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Total Debt (Trillions $)',
                color: '#059669'
              },
              ticks: {
                callback: function(value) {
                  return '$' + (value / 1000000000000).toFixed(1) + 'T';
                },
                color: '#059669'
              },
              grid: {
                drawOnChartArea: true
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Annual Increase (Trillions $)',
                color: '#dc2626'
              },
              ticks: {
                callback: function(value) {
                  const sign = value >= 0 ? '+' : '';
                  return sign + '$' + (value / 1000000000000).toFixed(1) + 'T';
                },
                color: '#dc2626'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
      
      console.log('🎉 DebtChart: Chart created successfully!');
      console.log('🎉 DebtChart: Chart instance:', this.chart);
      console.log('🎉 DebtChart: Chart type:', this.chart.config.type);
      
    } catch (error) {
      console.error('❌ DebtChart: Failed to create chart:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Stack trace:', error.stack);
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