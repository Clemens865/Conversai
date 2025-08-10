#!/bin/bash

echo "📄 Testing document ingestion..."
echo "   File: docs/lebensgeschichte_clemens_hoenig.md"
echo ""

# Test the ingestion endpoint
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3030/ingest \
  -F "file=@docs/lebensgeschichte_clemens_hoenig.md" \
  -F "tags=biography,personal,clemens")

# Extract HTTP status code
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
  echo "✅ Document ingested successfully!"
  echo "Response: $body"
else
  echo "❌ Ingestion failed with HTTP $http_code"
  echo "Response body: $body"
  
  # Check if it's a database issue
  echo ""
  echo "🔍 Debugging information:"
  echo "   - Checking service health..."
  curl -s http://localhost:3030/health && echo " [OK]" || echo " [FAILED]"
fi

echo ""
echo "📊 Testing query endpoint..."

# Test a simple query
curl -s -X POST http://localhost:3030/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Wer ist Clemens Hönig?",
    "limit": 3,
    "tags": ["biography"]
  }' | jq '.' 2>/dev/null || echo "Query endpoint not ready yet"