// WebSocket Proxy Server for OpenAI Realtime API
// This proxy allows browser clients to connect without authentication
// and forwards requests to OpenAI with proper headers

const http = require('http');
const WebSocket = require('ws');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const PROXY_PORT = process.env.REALTIME_PROXY_PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment variables');
  console.error('Please set OPENAI_API_KEY in .env.local file');
  process.exit(1);
}

// Create HTTP server for WebSocket upgrade
const server = http.createServer((req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Realtime proxy server is running' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, request) => {
  console.log('🔌 New client connected from:', request.socket.remoteAddress);

  // Extract model from query params (default to gpt-4o-realtime-preview-2024-10-01)
  const url = new URL(request.url, `http://localhost:${PROXY_PORT}`);
  const model = url.searchParams.get('model') || 'gpt-4o-realtime-preview-2024-10-01';

  // Connect to OpenAI Realtime API with authentication
  const openaiUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
  
  const openaiWs = new WebSocket(openaiUrl, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  let isOpenaiConnected = false;

  openaiWs.on('open', () => {
    console.log('✅ Connected to OpenAI Realtime API');
    isOpenaiConnected = true;
  });

  openaiWs.on('message', (data) => {
    // Forward messages from OpenAI to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  openaiWs.on('error', (error) => {
    console.error('❌ OpenAI WebSocket error:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: {
          message: 'Failed to connect to OpenAI Realtime API',
          details: error.message
        }
      }));
    }
  });

  openaiWs.on('close', (code, reason) => {
    console.log(`🔴 OpenAI connection closed. Code: ${code}, Reason: ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });

  // Handle messages from client
  clientWs.on('message', (data) => {
    // Forward messages from client to OpenAI
    if (isOpenaiConnected && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(data);
    } else {
      console.warn('⚠️  OpenAI WebSocket not ready, buffering message');
    }
  });

  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error.message);
  });

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
});

// Start the server
server.listen(PROXY_PORT, () => {
  console.log('🚀 OpenAI Realtime API Proxy Server');
  console.log(`📡 Listening on ws://localhost:${PROXY_PORT}`);
  console.log(`🔑 Using API key: ${OPENAI_API_KEY.slice(0, 7)}...${OPENAI_API_KEY.slice(-4)}`);
  console.log('\n📝 Instructions:');
  console.log('1. Update your client to connect to this proxy instead of OpenAI directly');
  console.log(`2. Use: ws://localhost:${PROXY_PORT}?model=gpt-4o-realtime-preview-2024-10-01`);
  console.log('3. No authentication needed from the client!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down proxy server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});