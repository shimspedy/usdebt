#!/usr/bin/env node

// Production-ready proxy server for Treasury APIs
// Bypasses CORS restrictions to provide real data only

const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8000;

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Treasury API proxy endpoints
const TREASURY_ENDPOINTS = {
  '/api/debt': 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny',
  '/api/mts': 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1',
  '/api/dts': 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/dts_table_1'
};

// Fetch data from Treasury API
function fetchTreasuryAPI(apiUrl, query, callback) {
  const fullUrl = `${apiUrl}?${query}`;
  console.log(`📡 Proxying: ${fullUrl}`);
  
  https.get(fullUrl, (res) => {
    let data = '';
    
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log(`✅ Treasury API success: ${jsonData.data?.length || 0} records`);
        callback(null, jsonData);
      } catch (error) {
        console.error(`❌ JSON parse error: ${error.message}`);
        callback(error, null);
      }
    });
  }).on('error', (error) => {
    console.error(`❌ Treasury API error: ${error.message}`);
    callback(error, null);
  });
}

// Serve static files
function serveStaticFile(filePath, res) {
  const extname = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript', 
    '.css': 'text/css',
    '.json': 'application/json'
  }[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, corsHeaders);
      res.end('File not found');
      return;
    }

    res.writeHead(200, { 
      'Content-Type': contentType,
      ...corsHeaders 
    });
    res.end(content);
  });
}

// Main server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.search?.slice(1) || '';

  console.log(`📥 ${req.method} ${pathname}${query ? '?' + query : ''}`);

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Treasury API proxy routes
  if (TREASURY_ENDPOINTS[pathname]) {
    if (req.method !== 'GET') {
      res.writeHead(405, corsHeaders);
      res.end('Method not allowed');
      return;
    }

    fetchTreasuryAPI(TREASURY_ENDPOINTS[pathname], query, (error, data) => {
      if (error) {
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        });
        res.end(JSON.stringify({ error: 'Treasury API unavailable', details: error.message }));
        return;
      }

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      });
      res.end(JSON.stringify(data));
    });
    return;
  }

  // Static file serving
  let filePath = pathname === '/' ? './index.html' : `.${pathname}`;
  
  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(403, corsHeaders);
    res.end('Forbidden');
    return;
  }

  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`📊 Treasury API proxy endpoints:`);
  Object.keys(TREASURY_ENDPOINTS).forEach(endpoint => {
    console.log(`   ${endpoint} -> Treasury ${endpoint.replace('/api/', '').toUpperCase()}`);
  });
  console.log(`🌐 Access your dashboard at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down server gracefully');
  server.close(() => {
    process.exit(0);
  });
});