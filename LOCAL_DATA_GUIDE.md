# US Debt Dashboard - Local Data System

This dashboard now supports crawling debt data from Treasury APIs and storing it locally as JSON files for faster loading and offline capability.

## 🚀 Quick Start

### 1. Crawl Fresh Data
Run the data crawler to fetch the latest debt information:

```bash
node crawler.js
```

This will:
- Fetch historical debt data from Treasury APIs
- Calculate year-over-year debt increases
- Save data to `data/historical-debt.json`
- Create a summary file at `data/summary.json`

### 2. Start the Dashboard
```bash
node server.js
```

The dashboard will automatically use the local JSON data for faster loading.

## 📁 Data Files

The crawler creates these files in the `data/` directory:

- **`historical-debt.json`** - Complete historical debt data with year-over-year calculations
- **`summary.json`** - Summary information and data freshness indicators

## 📊 Chart Features

The enhanced chart displays:
- **Total Debt** (green line) - Complete debt amount per year
- **Annual Increases** (red bars) - How much debt was added each year
- **Dual-axis visualization** - Optimized for comparing totals vs. increases

## 🔄 Data Flow

```
Treasury APIs → crawler.js → JSON files → local-data.js → chart.js
```

1. **crawler.js** fetches data from official Treasury APIs
2. **local-data.js** loads JSON files with fallback to realistic historical data
3. **chart.js** uses local data for instant loading

## ⚡ Performance Benefits

- **Instant loading** - No API calls during page load
- **Offline capability** - Works without internet connection
- **Reduced API load** - Respectful usage of Treasury APIs
- **Data persistence** - Survives server restarts

## 🗓️ Data Freshness

The system tracks when data was last crawled:
- Shows warnings if data is over 24 hours old
- Displays last update time in console logs
- Recommends running crawler for fresh data

## 🛠️ Technical Details

### File Structure
```
usdebt/
├── crawler.js           # Data fetching and processing
├── local-data.js        # Local JSON data loader
├── data/
│   ├── historical-debt.json  # Main debt data
│   └── summary.json          # Metadata and freshness
├── chart.js            # Enhanced chart with local data support
└── server.js           # Serves static files and JSON data
```

### API Endpoints Used
- **Debt to the Penny**: `/v2/accounting/od/debt_to_penny`
- **Monthly Treasury Statement**: `/v1/accounting/mts/mts_table_1`

### Data Processing
The crawler:
1. Fetches raw Treasury data
2. Samples yearly data points
3. Calculates annual debt increases
4. Formats currency displays
5. Adds percentage change calculations

## 📝 Usage Examples

### Manual Data Refresh
```bash
# Fetch fresh data
node crawler.js

# Start dashboard
node server.js
```

### Check Data Age
Open browser console to see data freshness warnings:
```
⚠️ DebtChart: Data is 25.3 hours old - consider running crawler.js
```

### Fallback Behavior
If JSON files aren't available, the chart automatically falls back to:
1. Cached local data
2. Realistic historical estimates
3. Graceful error handling

## 🎯 Benefits Summary

✅ **Fast loading** - JSON files load instantly  
✅ **Real data** - Fetched from official Treasury APIs  
✅ **Historical analysis** - 20+ years of debt data  
✅ **Year-over-year insights** - See annual debt increases  
✅ **Offline capable** - Works without internet  
✅ **Auto-fallback** - Graceful degradation if data unavailable  

Run `node crawler.js` to get started with fresh local data!