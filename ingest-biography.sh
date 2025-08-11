#!/bin/bash

# Script to ingest Clemens's biography into the RAG database
# This populates the chunks table with searchable content

echo "📚 Ingesting Biography into RAG Database"
echo "========================================"

# Your biographical markdown file
BIOGRAPHY_FILE="conversai/docs/lebensgeschichte_clemens_hoenig.md"

# Railway service URL (will use proxy if direct access fails)
RAG_SERVICE="https://conversai-production.up.railway.app"

# Try Railway first, then fallback to proxy
echo "Attempting to ingest via Railway service..."

# Read the biography content
CONTENT=$(cat "$BIOGRAPHY_FILE")

# Escape the content for JSON
ESCAPED_CONTENT=$(echo "$CONTENT" | jq -Rs .)

# Create the ingestion payload
PAYLOAD=$(cat <<EOF
{
  "source_type": "md",
  "source_uri": "lebensgeschichte_clemens_hoenig.md",
  "content": $ESCAPED_CONTENT,
  "metadata": {
    "title": "Biography of Clemens Hoenig",
    "author": "Clemens Hoenig",
    "topic": "Personal Biography",
    "keywords": ["Clemens", "Yorizon", "Robotic Eyes", "computer vision", "robotics"]
  }
}
EOF
)

# Try Railway service first
echo "Trying Railway service directly..."
RESPONSE=$(curl -s -X POST "$RAG_SERVICE/api/ingest" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>/dev/null)

if [ $? -eq 0 ] && [[ ! "$RESPONSE" =~ "502" ]]; then
  echo "✅ Successfully ingested via Railway!"
  echo "Response: $RESPONSE"
else
  echo "Railway unavailable, trying Vercel proxy..."
  
  # Use the proxy endpoint
  PROXY_PAYLOAD=$(cat <<EOF
{
  "endpoint": "ingest",
  "data": $PAYLOAD
}
EOF
)
  
  RESPONSE=$(curl -s -X POST "https://conversai-tau.vercel.app/api/rag-proxy" \
    -H "Content-Type: application/json" \
    -d "$PROXY_PAYLOAD")
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully ingested via proxy!"
    echo "Response: $RESPONSE"
  else
    echo "❌ Failed to ingest. Please check your configuration."
    exit 1
  fi
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Go to https://conversai-tau.vercel.app"
echo "2. Select 'RAG System (Production)'"
echo "3. Ask: 'What did Clemens do at Yorizon?'"
echo "4. You should now get specific information from the biography!"