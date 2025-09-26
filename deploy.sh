#!/bin/bash

# Production deployment script for US Debt Clock
# This script prepares and starts the production server

echo "🚀 Starting US Debt Clock production deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found. Please run this script from the project root."
    exit 1
fi

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "⚠️  Data directory not found. Creating..."
    mkdir data
fi

# Set production environment
export NODE_ENV=production
export PORT=${PORT:-8000}

echo "✅ Environment configured"
echo "   - NODE_ENV: $NODE_ENV"
echo "   - PORT: $PORT"

# Start the production server
echo "🌐 Starting US Debt Clock server on port $PORT..."
echo "📊 Access dashboard at: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"

npm start