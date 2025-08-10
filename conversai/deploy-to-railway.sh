#!/bin/bash

echo "
==============================================
🚀 CONVERSAI RAG SERVICE - RAILWAY DEPLOYMENT
==============================================

This script will deploy your RAG service to Railway.

📋 Prerequisites:
- Railway CLI installed ✅
- Logged in to Railway (railway login)
- Environment variables ready

==============================================
"

# Check if logged in
if ! railway whoami >/dev/null 2>&1; then
    echo "❌ You need to login to Railway first!"
    echo "   Run: railway login"
    echo ""
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Logged in to Railway as: $(railway whoami)"
echo ""

# Navigate to rag-service directory
cd rag-service

echo "📦 Step 1: Initialize Railway project"
echo "=========================================="
railway init

echo ""
echo "🔗 Step 2: Link to Railway project (if using GitHub)"
echo "=========================================="
echo "Do you want to link to a GitHub repo? (optional)"
echo "If yes, Railway will auto-deploy on git push."
echo "Press Enter to skip, or type 'yes' to link:"
read LINK_GITHUB

if [ "$LINK_GITHUB" = "yes" ]; then
    railway link
fi

echo ""
echo "🔐 Step 3: Set Environment Variables"
echo "=========================================="
echo "Setting required environment variables..."

# Database URL (with URL-encoded password)
DB_URL="postgresql://postgres.bqbiqondlbufofgmwfri:%23Kirchengasse1@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

echo "Setting CONVERSAI_SUPABASE_DB_URL..."
railway variables set CONVERSAI_SUPABASE_DB_URL="$DB_URL"

echo "Setting OPENAI_API_KEY..."
echo "Enter your OpenAI API key (starts with sk-proj-):"
read -s OPENAI_KEY
railway variables set OPENAI_API_KEY="$OPENAI_KEY"

echo "Setting RUST_LOG..."
railway variables set RUST_LOG="info"

echo "Setting EMBEDDING_MODEL_NAME..."
railway variables set EMBEDDING_MODEL_NAME="text-embedding-ada-002"

echo ""
echo "✅ Environment variables set!"

echo ""
echo "🚀 Step 4: Deploy to Railway"
echo "=========================================="
echo "Deploying your Rust RAG service..."
railway up

echo ""
echo "⏳ Deployment in progress..."
echo "   This may take 5-10 minutes for the first deployment."
echo "   Railway will build your Docker container and deploy it."

echo ""
echo "📊 Step 5: Get your deployment URL"
echo "=========================================="
railway open

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Check the Railway dashboard for your service URL"
echo "2. Test the health endpoint: https://your-app.up.railway.app/health"
echo "3. Update your Vercel environment with the Railway URL"
echo "4. Test queries against your deployed service"
echo ""
echo "💡 Useful Railway commands:"
echo "   railway logs    - View deployment logs"
echo "   railway open    - Open Railway dashboard"
echo "   railway status  - Check deployment status"
echo "   railway down    - Remove deployment (careful!)"
echo ""
echo "🎉 Your RAG service is now live on Railway!"
echo "=============================================="
"