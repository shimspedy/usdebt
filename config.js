// Configuration for the U.S. Fiscal Dashboard
const CONFIG = {
  // Tailwind configuration
  tailwind: {
    theme: {
      extend: {
        colors: {
          paper: '#f7fafc',
          ink: '#0f172a',
          subtle: '#475569',
          line: '#e2e8f0',
          accent: '#0a6c4f',
          accent2: '#14532d',
          warning: '#b45309',
          error: '#b91c1c'
        },
        fontFamily: {
          ui: ['"Source Sans 3"', 'Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
          mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
          serif: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'serif']
        },
        boxShadow: {
          sheet: '0 1px 2px rgba(2,6,23,.05), 0 16px 40px rgba(2,6,23,.06)'
        }
      }
    }
  },

  // API endpoints
  api: {
    fiscalData: {
      bases: [
        "https://api.fiscaldata.treasury.gov/services/api/fiscal_service"
        // Note: Only using main API - alternative endpoint blocks CORS
      ],
      retries: 2
    },
    worldBank: {
      base: "https://api.worldbank.org/v2/country/US/indicator",
      defaultPerPage: 8
    }
  },

  // Application settings
  app: {
    refreshInterval: 30000, // 30 seconds
    animationDuration: 1100, // shimmer animation duration
    maxRetryDelay: 1000
  },

  // Constants
  constants: {
    SEC_YEAR: 365 * 24 * 3600,
    DEFAULT_DECIMAL_PLACES: 0,
    CURRENCY_DECIMAL_PLACES: 2
  },

  // Status indicators
  status: {
    colors: {
      loading: '#f59e0b',
      success: '#15803d',
      error: '#b91c1c',
      warning: '#b45309',
      fallback: '#8b5cf6' // Purple for fallback data
    },
    messages: {
      initializing: 'initializing…',
      syncing: 'connecting to treasury apis…',
      live: 'live data • mixed sources',
      error: 'error - tap to retry',
      fallback: 'mixed data • some treasury apis block browser access'
    }
  }
};

// Make config globally available
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}