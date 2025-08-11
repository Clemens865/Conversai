#!/bin/bash

# Railway deployment status checker
echo "🚂 Railway Deployment Status Checker"
echo "===================================="

SERVICE_URL="https://conversai-production.up.railway.app"

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL$endpoint" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo "✅ OK (200)"
        # Get the actual response
        echo "Response:"
        curl -s "$SERVICE_URL$endpoint" | jq '.' 2>/dev/null || curl -s "$SERVICE_URL$endpoint"
        echo ""
    elif [ "$response" = "502" ]; then
        echo "❌ Bad Gateway (502) - Service not responding"
    elif [ "$response" = "503" ]; then
        echo "⏳ Service Unavailable (503) - Deployment in progress"
    elif [ "$response" = "000" ]; then
        echo "❌ Connection failed - Service unreachable"
    else
        echo "⚠️ HTTP $response"
    fi
}

echo "Service URL: $SERVICE_URL"
echo ""

# Check root endpoint
check_endpoint "/" "Root endpoint (/)"

# Check health endpoint
check_endpoint "/health" "Health check (/health)"

# Check if API endpoints are responding (without body, just OPTIONS)
echo -n "Checking API endpoints (OPTIONS)... "
api_response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$SERVICE_URL/api/query" 2>/dev/null)
if [ "$api_response" = "204" ] || [ "$api_response" = "200" ]; then
    echo "✅ CORS configured correctly"
else
    echo "⚠️ CORS may need configuration (HTTP $api_response)"
fi

echo ""
echo "===================================="
echo "Deployment Status Summary:"

if [ "$response" = "200" ]; then
    echo "🎉 Service is RUNNING and ACCESSIBLE!"
    echo ""
    echo "Next steps:"
    echo "1. Add environment variables to Vercel:"
    echo "   NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL=$SERVICE_URL"
    echo "2. Redeploy Vercel application"
    echo "3. Test the RAG System mode in your app"
elif [ "$response" = "502" ]; then
    echo "⚠️ Service build succeeded but runtime issue detected"
    echo "Check Railway logs for runtime errors"
elif [ "$response" = "503" ]; then
    echo "⏳ Deployment in progress - wait a few minutes and check again"
else
    echo "❌ Service is not accessible - check Railway dashboard"
fi