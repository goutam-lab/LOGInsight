#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration - Change this to your deployed URL
const ENDPOINT = process.env.LOGINSIGHT_URL || 'http://localhost:3000/api/ingest';

console.log(`🚀 LogInsight Pipe Active: Streaming to ${ENDPOINT}`);

process.stdin.on('data', (data) => {
  const logLine = data.toString();
  
  // Optional: Print locally so you can still see logs in terminal
  process.stdout.write(logLine);

  const url = new URL(ENDPOINT);
  const client = url.protocol === 'https:' ? https : http;

  const req = client.request(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'X-Stream-Source': 'CLI-Pipe'
    }
  }, (res) => {
    res.on('data', () => {}); // Consume response
  });

  req.on('error', (e) => console.error(`Line dropped: ${e.message}`));
  req.write(logLine);
  req.end();
});