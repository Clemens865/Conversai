# OpenAI Realtime API Proxy Server Setup

This proxy server solves the browser WebSocket authentication issue with OpenAI's Realtime API.

## How It Works

```
Browser → Proxy Server → OpenAI Realtime API
        (No Auth)     (With Auth Headers)
```

## Quick Start

### 1. Start the Proxy Server

You have two options:

#### Option A: Simple Proxy (No Dependencies Required)
```bash
npm run proxy:simple
```

#### Option B: Advanced Proxy (Requires ws package)
```bash
# First install ws package
npm install ws

# Then run the proxy
npm run proxy
```

### 2. Keep the Proxy Running

You should see:
```
🚀 OpenAI Realtime API Proxy Server
📡 Listening on ws://localhost:8080
🔑 Using API key: sk-proj...U28A
```

### 3. Use Markdown Library Mode

1. Keep the proxy server running in its terminal
2. In another terminal, run your Next.js app: `npm run dev`
3. Open http://localhost:3000
4. Select "Markdown Library (Beta)" mode
5. Voice functionality should now work!

## Configuration

The proxy uses these environment variables from `.env.local`:

- `OPENAI_API_KEY`: Your OpenAI API key (for server-side auth)
- `REALTIME_PROXY_PORT`: Port for the proxy server (default: 8080)

The client uses:
- `NEXT_PUBLIC_USE_PROXY`: Set to `true` to use the proxy
- `NEXT_PUBLIC_REALTIME_PROXY_PORT`: Port to connect to (default: 8080)

## Architecture

### Proxy Server (`src/server/realtime-proxy.js`)
- Accepts WebSocket connections from browsers (no auth required)
- Creates authenticated connections to OpenAI Realtime API
- Forwards messages bidirectionally

### Client Updates (`src/lib/services/ai/openai-realtime.ts`)
- Automatically connects to proxy in development
- Falls back to direct connection in production
- No authentication needed from browser

## Troubleshooting

### "Cannot find module 'ws'"
Install the WebSocket package:
```bash
npm install ws
```

### "Connection refused"
Make sure the proxy server is running:
```bash
npm run proxy
```

### "API key not configured"
Check that `OPENAI_API_KEY` is set in `.env.local`

## Security Notes

- **Development Only**: This proxy is for local development
- **Don't Expose**: Never expose the proxy port to the internet
- **Production**: Use a proper authentication system or server-side implementation

## How to Test

1. Start proxy: `npm run proxy`
2. Start app: `npm run dev`
3. Go to Markdown Library mode
4. Click the microphone button
5. Speak and see real-time transcription
6. Get AI responses with voice output

## Benefits

- ✅ Works in all browsers
- ✅ No authentication from client
- ✅ Real-time voice processing
- ✅ Full Realtime API features
- ✅ Easy local development