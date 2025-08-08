#!/bin/bash

# Start both the proxy server and dev server for ConversAI

echo "🚀 Starting ConversAI with Realtime API Proxy..."
echo ""

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $PROXY_PID $DEV_PID 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start proxy server in background
echo "📡 Starting proxy server..."
npm run proxy:simple &
PROXY_PID=$!

# Wait a bit for proxy to start
sleep 3

# Start dev server in background
echo ""
echo "🌐 Starting development server..."
npm run dev &
DEV_PID=$!

echo ""
echo "✅ Both services are starting up!"
echo ""
echo "📡 Proxy Server: ws://localhost:8080"
echo "🌐 Dev Server: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait