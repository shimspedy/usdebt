# 🇺🇸 U.S. National Debt Clock

A real-time U.S. National Debt Clock displaying live Treasury data with an immersive full-screen experience inspired by usdebtclock.org.

![US Debt Clock Preview](https://img.shields.io/badge/Debt-$35+_Trillion-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)

## ✨ Features

- **🔴 Live Debt Counter**: Real-time national debt display that updates every second
- **📈 Interactive Chart**: Historical debt progression with dual-axis visualization  
- **📊 Live Statistics**: Federal revenue, spending, deficit, and key financial metrics
- **🌐 Treasury API Integration**: Official data from U.S. Treasury FiscalData APIs
- **📱 Responsive Design**: Full-screen experience optimized for all devices
- **⚡ Real-time Updates**: Live data refresh every 5 minutes
- **🎨 Professional UI**: Dark theme with animated backgrounds and glowing effects

## 🚀 Quick Start

### Option 1: Quick Deploy (Recommended)
```bash
# Clone and start in one command
git clone <your-repo-url> us-debt-clock
cd us-debt-clock
./deploy.sh
```

### Option 2: Manual Setup
```bash
# Clone the repository
git clone <your-repo-url> us-debt-clock
cd us-debt-clock

# Start the production server
npm start
```

### Option 3: Development Mode
```bash
# For development with logging
npm run dev
```

## 🌐 Access

Once started, open your browser to:
- **Local**: http://localhost:8000
- **Network**: http://YOUR_IP:8000

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser UI    │───▶│   Node.js Proxy  │───▶│  Treasury APIs  │
│  (Full-screen)  │    │    (CORS Fix)    │    │ (FiscalData.gov)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   Live Counter              API Endpoints           Real Gov Data
   Chart Display            /api/debt                Debt to Penny
   Statistics               /api/mts                 Monthly Treasury
```

## 📊 Data Sources

All data is sourced from official U.S. Treasury APIs:

- **National Debt**: [Treasury Debt to the Penny API](https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny)
- **Federal Finances**: [Monthly Treasury Statement API](https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/summary-of-receipts-outlays-and-the-deficit-surplus-of-the-u-s-government)

## 🎯 Key Metrics Displayed

- **Current National Debt** (real-time counter)
- **Debt Per Citizen** (calculated live)
- **Debt Per Taxpayer** (calculated live) 
- **Annual Interest Payments** (estimated)
- **Daily Debt Increase** (calculated)
- **Federal Revenue vs Spending** (from MTS API)
- **Budget Deficit/Surplus** (calculated)
- **Debt-to-GDP Ratio** (estimated)

## 🔧 Configuration

Environment variables:
```bash
PORT=8000                    # Server port (default: 8000)
NODE_ENV=production         # Environment mode
```

## 📱 Device Support

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android tablets)
- ✅ Mobile (iPhone, Android phones)
- ✅ Smart TVs (modern browsers)
- ✅ Kiosks (full-screen mode)

## 🛡️ Security

- ✅ CORS headers configured
- ✅ Directory traversal protection
- ✅ Input validation on API routes
- ✅ Graceful error handling
- ✅ Production-ready server configuration

## 📦 Production Deployment

The application is production-ready with:
- Minimal resource usage (~10MB RAM)
- Efficient API caching
- Graceful error handling
- Clean logging
- Health monitoring ready

## 🔄 Updates

The dashboard automatically:
- Updates debt counter every second
- Refreshes API data every 5 minutes
- Handles API outages gracefully
- Maintains accurate calculations

## 📄 License

This project is for educational and demonstration purposes using publicly available U.S. Treasury data.

---

**🎯 Built for accuracy, designed for impact.**

*Real Treasury data • Live updates • Full-screen experience*