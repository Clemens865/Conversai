// Simple WebSocket Proxy Server for OpenAI Realtime API
// Uses only Node.js built-in modules (no external dependencies)

const http = require('http');
const https = require('https');
const crypto = require('crypto');
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

// WebSocket GUID (defined in RFC 6455)
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Generate WebSocket accept key
function generateAcceptKey(key) {
  return crypto
    .createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');
}

// Parse WebSocket frames
function parseFrame(buffer) {
  if (buffer.length < 2) return null;
  
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  
  const fin = !!(firstByte & 0x80);
  const opcode = firstByte & 0x0f;
  const masked = !!(secondByte & 0x80);
  let payloadLength = secondByte & 0x7f;
  
  let offset = 2;
  
  if (payloadLength === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) return null;
    payloadLength = buffer.readBigUInt64BE(offset);
    offset += 8;
  }
  
  if (masked) {
    if (buffer.length < offset + 4) return null;
    const maskKey = buffer.slice(offset, offset + 4);
    offset += 4;
    
    if (buffer.length < offset + payloadLength) return null;
    const payload = buffer.slice(offset, offset + Number(payloadLength));
    
    // Unmask payload
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }
    
    return { fin, opcode, payload, totalLength: offset + Number(payloadLength) };
  }
  
  if (buffer.length < offset + payloadLength) return null;
  const payload = buffer.slice(offset, offset + Number(payloadLength));
  
  return { fin, opcode, payload, totalLength: offset + Number(payloadLength) };
}

// Create WebSocket frame
function createFrame(opcode, payload) {
  const payloadLength = payload.length;
  
  let frame;
  if (payloadLength < 126) {
    frame = Buffer.allocUnsafe(2);
    frame[0] = 0x80 | opcode; // FIN = 1
    frame[1] = payloadLength;
  } else if (payloadLength < 65536) {
    frame = Buffer.allocUnsafe(4);
    frame[0] = 0x80 | opcode;
    frame[1] = 126;
    frame.writeUInt16BE(payloadLength, 2);
  } else {
    frame = Buffer.allocUnsafe(10);
    frame[0] = 0x80 | opcode;
    frame[1] = 127;
    frame.writeBigUInt64BE(BigInt(payloadLength), 2);
  }
  
  return Buffer.concat([frame, payload]);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Simple proxy server running' }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

// Handle WebSocket upgrade
server.on('upgrade', (request, clientSocket, head) => {
  const key = request.headers['sec-websocket-key'];
  const acceptKey = generateAcceptKey(key);
  
  // Extract model from URL
  const url = new URL(request.url, `http://localhost:${PROXY_PORT}`);
  const model = url.searchParams.get('model') || 'gpt-4o-realtime-preview-2024-10-01';
  
  // Send upgrade response to client
  clientSocket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
    '\r\n'
  );
  
  console.log('🔌 Client connected, establishing connection to OpenAI...');
  
  // Connect to OpenAI
  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: `/v1/realtime?model=${model}`,
    method: 'GET',
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
      'Sec-WebSocket-Version': '13',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  };
  
  const openaiReq = https.request(options);
  openaiReq.end();
  
  openaiReq.on('upgrade', (response, openaiSocket, upgradeHead) => {
    console.log('✅ Connected to OpenAI Realtime API');
    
    // Handle client -> OpenAI
    let clientBuffer = Buffer.alloc(0);
    clientSocket.on('data', (data) => {
      clientBuffer = Buffer.concat([clientBuffer, data]);
      
      let frame;
      while ((frame = parseFrame(clientBuffer))) {
        clientBuffer = clientBuffer.slice(frame.totalLength);
        
        if (frame.opcode === 0x8) { // Close frame
          console.log('🔌 Client sent close frame');
          openaiSocket.end();
          clientSocket.end();
        } else if (frame.opcode === 0x1 || frame.opcode === 0x2) { // Text or binary
          // Forward to OpenAI with masking
          const maskKey = crypto.randomBytes(4);
          const maskedPayload = Buffer.from(frame.payload);
          for (let i = 0; i < maskedPayload.length; i++) {
            maskedPayload[i] ^= maskKey[i % 4];
          }
          
          const maskedFrame = createFrame(frame.opcode, maskedPayload);
          maskedFrame[1] |= 0x80; // Set mask bit
          const finalFrame = Buffer.concat([
            maskedFrame.slice(0, 2),
            maskKey,
            maskedPayload
          ]);
          
          openaiSocket.write(finalFrame);
        }
      }
    });
    
    // Handle OpenAI -> client
    let openaiBuffer = Buffer.alloc(0);
    openaiSocket.on('data', (data) => {
      openaiBuffer = Buffer.concat([openaiBuffer, data]);
      
      let frame;
      while ((frame = parseFrame(openaiBuffer))) {
        openaiBuffer = openaiBuffer.slice(frame.totalLength);
        
        if (frame.opcode === 0x8) { // Close frame
          console.log('🔴 OpenAI sent close frame');
          clientSocket.end();
          openaiSocket.end();
        } else if (frame.opcode === 0x1 || frame.opcode === 0x2) { // Text or binary
          // Forward to client (unmasked)
          const responseFrame = createFrame(frame.opcode, frame.payload);
          clientSocket.write(responseFrame);
        }
      }
    });
    
    // Handle disconnections
    clientSocket.on('close', () => {
      console.log('🔌 Client disconnected');
      openaiSocket.end();
    });
    
    openaiSocket.on('close', () => {
      console.log('🔴 OpenAI connection closed');
      clientSocket.end();
    });
    
    clientSocket.on('error', (err) => {
      console.error('❌ Client socket error:', err.message);
      openaiSocket.end();
    });
    
    openaiSocket.on('error', (err) => {
      console.error('❌ OpenAI socket error:', err.message);
      clientSocket.end();
    });
  });
  
  openaiReq.on('error', (err) => {
    console.error('❌ Failed to connect to OpenAI:', err.message);
    clientSocket.end();
  });
});

// Start server
server.listen(PROXY_PORT, () => {
  console.log('🚀 Simple WebSocket Proxy Server (No External Dependencies)');
  console.log(`📡 Listening on ws://localhost:${PROXY_PORT}`);
  console.log(`🔑 Using API key: ${OPENAI_API_KEY.slice(0, 7)}...${OPENAI_API_KEY.slice(-4)}`);
  console.log('\n📝 Instructions:');
  console.log('1. This server works with only Node.js built-in modules');
  console.log('2. No need to install ws package');
  console.log(`3. Connect your client to: ws://localhost:${PROXY_PORT}`);
  console.log('4. The proxy handles all authentication with OpenAI\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});