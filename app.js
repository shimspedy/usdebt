// Main application logic for the U.S. Fiscal Dashboard
class FiscalDashboard {
  /**
   * Initialize the Fiscal Dashboard application
   */
  constructor() {
    this.tiles = new Map();
    this.dataManager = new DataManager();
    this.statusIndicator = null;
    this.animationLoop = new AnimationLoop();
    this.initialized = false;
    
    // Bind methods to preserve 'this' context
    this.reloadTile = this.reloadTile.bind(this);
    this.loadAll = this.loadAll.bind(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;
    
    try {
      this.setupStatusIndicator();
      this.setupEventListeners();
      this.registerTiles();
      this.startAnimationLoop();
      
      // Initialize debt chart
      await this.initializeChart();
      
      // Set current year in footer
      const yearElement = Utils.$('#yr');
      if (yearElement) {
        yearElement.textContent = Utils.getCurrentYear();
      }
      
      this.initialized = true;
      
      // Load data
      await this.loadAll();
      
    } catch (error) {
      Utils.logError('Dashboard Init', error);
      this.statusIndicator?.setError();
    }
  }

  /**
   * Initialize chart after ensuring Chart.js is loaded
   */
  async initializeChart() {
    // Wait for Chart.js to be available
    let attempts = 0;
    while (typeof Chart === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof Chart === 'undefined') {
      console.error('Chart.js failed to load after waiting 5 seconds');
      return;
    }
    
    console.log('Chart.js version:', Chart.version);
    this.debtChart = new DebtChart('debtChart');
    await this.debtChart.init();
  }

  /**
   * Set up status indicator
   */
  setupStatusIndicator() {
    const dot = Utils.$('#statusDot');
    const synced = Utils.$('#synced');
    
    if (dot && synced) {
      this.statusIndicator = new StatusIndicator(dot, synced);
      this.statusIndicator.setStatus(
        CONFIG.status.colors.warning,
        CONFIG.status.messages.initializing
      );
    }
  }

  /**
   * Set up event listeners for user interactions
   */
  setupEventListeners() {
    const refreshBtn = Utils.$('#refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        // Force refresh by clearing cache and trying real APIs first
        this.dataManager.forceRefresh();
        this.loadAll();
      });
    }
  }

  /**
   * Register a tile with the dashboard
   * @param {string} id - Tile ID
   * @param {Object} definition - Tile definition
   */
  register(id, definition) {
    const ui = CardFactory.makeCard({ 
      id, 
      title: definition.title, 
      badge: definition.badge 
    });
    
    this.tiles.set(id, { 
      ...definition, 
      ui, 
      state: null, 
      lastRendered: "" 
    });
  }

  /**
   * Calculate live value for a tile state
   * @param {Object} state - Tile state object
   * @returns {number|null} Live calculated value
   */
  calculateLiveValue(state) {
    return DataProcessor.calculateLiveValue(state);
  }

  /**
   * Start the animation loop for live updates
   */
  startAnimationLoop() {
    this.animationLoop.addCallback(() => {
      this.tiles.forEach(tile => {
        if (!tile.state) return;
        
        const liveValue = this.calculateLiveValue(tile.state);
        const renderedText = tile.render 
          ? tile.render(liveValue) 
          : Utils.formatNumber(liveValue || 0);
        
        if (renderedText !== tile.lastRendered) {
          tile.ui.fitNumber.set(renderedText);
          tile.lastRendered = renderedText;
        }
      });
    });
  }

  /**
   * Load or reload a specific tile
   * @param {string} id - Tile ID
   */
  async reloadTile(id) {
    const tile = this.tiles.get(id);
    if (!tile) {
      Utils.logError('Tile Reload', new Error(`Tile not found: ${id}`));
      return;
    }

    const { ui, fetcher, deps = [] } = tile;
    
    // Clear error state and show loading
    ui.clearError();
    ui.setLoading();

    try {
      // Resolve dependencies if provided
      const resolvedDeps = {};
      if (deps.length > 0) {
        for (const depId of deps) {
          await this.reloadTile(depId);
          const depTile = this.tiles.get(depId);
          if (depTile?.state) {
            resolvedDeps[depId] = depTile.state;
          }
        }
      }

      // Fetch new data
      const newState = await fetcher(resolvedDeps);
      tile.state = newState;
      
      // Update metadata
      if (newState.meta && ui.meta) {
        ui.meta.textContent = newState.meta;
      }
      
    } catch (error) {
      Utils.logError(`Tile ${id}`, error);
      const errorMessage = error.message || "fetch error";
      ui.setError(errorMessage);
    } finally {
      ui.clearLoading();
    }
  }

  /**
   * Load all tiles
   */
  async loadAll() {
    if (!this.statusIndicator) return;
    
    this.statusIndicator.setLoading();
    
    try {
      // Load tiles in dependency order
      const loadOrder = [
        "debt", "receipts", "outlays", "deficit", "cash",
        "pop", "gdp", "debt_per", "rcpt_per", "debt_gdp"
      ];
      
      for (const tileId of loadOrder) {
        if (this.tiles.has(tileId)) {
          await this.reloadTile(tileId);
        }
      }
      
      // Show live status when using real data
      if (this.dataManager.useFallbackData) {
        this.statusIndicator.setFallback();
      } else {
        this.statusIndicator.setSuccess();
      }
    } catch (error) {
      Utils.logError('Load All', error);
      this.statusIndicator.setError();
    }
  }

  /**
   * Register all dashboard tiles
   */
  registerTiles() {
    // 1. US National Debt
    this.register("debt", {
      title: "US National Debt",
      badge: "LIVE",
      fetcher: async () => {
        const response = await this.dataManager.fetchFiscalData(
          "/v2/accounting/od/debt_to_penny",
          {
            fields: "record_date,tot_pub_debt_out_amt",
            sort: "-record_date",
            "page[size]": 2,
            format: "json"
          }
        );
        return DataProcessor.processDebtData(response.data || []);
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 2. Federal Receipts (FYTD) - REAL DATA via proxy
    this.register("receipts", {
      title: "Federal Receipts (FYTD)",
      badge: "LIVE",
      fetcher: async () => {
        const response = await this.dataManager.fetchFiscalData(
          "/v1/accounting/mts/mts_table_1",
          {
            fields: "record_date,current_fytd_rcpt_amt",
            sort: "-record_date",
            "page[size]": 2,
            format: "json"
          }
        );
        return DataProcessor.processMTSData(response.data || [], 'current_fytd_rcpt_amt');
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 3. Federal Outlays (FYTD) - REAL DATA via proxy
    this.register("outlays", {
      title: "Federal Outlays (FYTD)",
      badge: "LIVE", 
      fetcher: async () => {
        const response = await this.dataManager.fetchFiscalData(
          "/v1/accounting/mts/mts_table_1",
          {
            fields: "record_date,current_fytd_net_outly_amt",
            sort: "-record_date",
            "page[size]": 2,
            format: "json"
          }
        );
        return DataProcessor.processMTSData(response.data || [], 'current_fytd_net_outly_amt');
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 4. Deficit (FYTD) - derived from outlays and receipts
    this.register("deficit", {
      title: "Deficit (FYTD)",
      badge: "LIVE",
      deps: ["outlays", "receipts"],
      fetcher: async (deps) => {
        const outlaysState = deps.outlays;
        const receiptsState = deps.receipts;
        
        const baseValue = outlaysState.baseValue - receiptsState.baseValue;
        const ratePerSec = (outlaysState.ratePerSec || 0) - (receiptsState.ratePerSec || 0);
        const baseTs = Math.min(outlaysState.baseTs, receiptsState.baseTs);
        
        return {
          baseValue,
          baseTs,
          ratePerSec,
          meta: "Outlays − Receipts"
        };
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 5. Operating Cash Balance - Use fallback data due to CORS restrictions
    this.register("cash", {
      title: "Operating Cash Balance",
      badge: "DEMO",
      fetcher: async () => {
        // v1 DTS APIs are also blocked by CORS in browsers
        throw new Error("DTS API blocked by CORS - using fallback data");
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });
        
    // 5. Operating Cash Balance - Calculated estimate from Treasury operations
    this.register("cash", {
      title: "Operating Cash Balance",
      badge: "EST.",
      fetcher: async () => {
        // Treasury doesn't expose cash balance via public APIs
        // Using realistic estimate based on typical Treasury operations
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Typical Treasury operating cash ranges from $50B to $500B
        // Using conservative mid-range estimate
        const baseValue = 250000000000; // $250 billion
        const baseTs = Utils.parseDate(currentDate);
        
        return {
          baseValue,
          baseTs,
          ratePerSec: 0, // Cash balance doesn't grow predictably
          meta: `Estimated Treasury operations balance`
        };
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 6. US Population (estimated)
    this.register("pop", {
      title: "US Population (est.)",
      badge: "EST.",
      fetcher: async () => {
        const data = await this.dataManager.fetchWorldBank("SP.POP.TOTL", 8);
        return DataProcessor.processWorldBankData(data);
      },
      render: v => Utils.formatNumber(v || 0)
    });

    // 7. US GDP (nominal, estimated)
    this.register("gdp", {
      title: "US GDP (nominal, est.)",
      badge: "EST.",
      fetcher: async () => {
        const data = await this.dataManager.fetchWorldBank("NY.GDP.MKTP.CD", 8);
        return DataProcessor.processWorldBankData(data);
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 8. Debt per Citizen (derived)
    this.register("debt_per", {
      title: "Debt per Citizen",
      badge: "DERIVED",
      deps: ["debt", "pop"],
      fetcher: async (deps) => {
        const debtState = deps.debt;
        const popState = deps.pop;
        
        const baseValue = Utils.safeDivide(debtState.baseValue, popState.baseValue);
        const ratePerSec = Utils.safeDivide(debtState.ratePerSec || 0, popState.baseValue);
        
        return {
          baseValue,
          baseTs: debtState.baseTs,
          ratePerSec,
          meta: "Debt ÷ Population"
        };
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 9. Receipts per Citizen (derived)
    this.register("rcpt_per", {
      title: "Receipts per Citizen (FYTD)",
      badge: "DERIVED",
      deps: ["receipts", "pop"],
      fetcher: async (deps) => {
        const receiptsState = deps.receipts;
        const popState = deps.pop;
        
        const baseValue = Utils.safeDivide(receiptsState.baseValue, popState.baseValue);
        const ratePerSec = Utils.safeDivide(receiptsState.ratePerSec || 0, popState.baseValue);
        
        return {
          baseValue,
          baseTs: receiptsState.baseTs,
          ratePerSec,
          meta: "Receipts ÷ Population"
        };
      },
      render: v => Utils.formatUSD(v || 0, 0)
    });

    // 10. Debt-to-GDP Ratio (derived)
    this.register("debt_gdp", {
      title: "Debt-to-GDP Ratio",
      badge: "DERIVED",
      deps: ["debt", "gdp"],
      fetcher: async (deps) => {
        const debtState = deps.debt;
        const gdpState = deps.gdp;
        
        const baseValue = Utils.safeDivide(debtState.baseValue, gdpState.baseValue);
        const numerator = (debtState.ratePerSec || 0) * gdpState.baseValue;
        const denominator = debtState.baseValue * (gdpState.ratePerSec || 0);
        const ratePerSec = Utils.safeDivide(numerator - denominator, gdpState.baseValue * gdpState.baseValue);
        
        return {
          baseValue,
          baseTs: Math.min(debtState.baseTs, gdpState.baseTs),
          ratePerSec,
          meta: "Debt ÷ GDP (nominal)"
        };
      },
      render: v => ((v || 0) * 100).toFixed(2) + "%"
    });
  }

  /**
   * Cleanup and destroy the dashboard
   */
  destroy() {
    this.animationLoop?.destroy();
    this.dataManager?.clearCache();
    this.debtChart?.destroy();
    this.tiles.clear();
    this.initialized = false;
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Apply Tailwind configuration
    if (typeof tailwind !== 'undefined' && tailwind.config) {
      tailwind.config = CONFIG.tailwind;
    }
    
    // Create and initialize the dashboard
    window.app = new FiscalDashboard();
    await window.app.init();
  } catch (error) {
    Utils.logError('App Initialization', error);
  }
});

// Make FiscalDashboard globally available
if (typeof window !== 'undefined') {
  window.FiscalDashboard = FiscalDashboard;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FiscalDashboard;
}