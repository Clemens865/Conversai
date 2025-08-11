# 🔧 Railway Deployment Troubleshooting Guide

## Current Status
- **Build**: ✅ Successful
- **Health Check**: ✅ Passes during deployment
- **External Access**: ❌ 502 Bad Gateway

## Changes Made
1. ✅ Removed conflicting `railway.json` from rag-service directory
2. ✅ Added root endpoint (`/`) for better compatibility
3. ✅ Optimized health check timeout settings
4. ✅ Fixed CORS configuration
5. ✅ Fixed Docker build paths

## Deployment is Currently Building
The latest changes have been pushed and Railway should be rebuilding. This typically takes 2-3 minutes.

## How to Check Railway Logs

### Option 1: Railway Dashboard
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your project
3. Click on the service
4. Navigate to "Logs" tab
5. Look for:
   - Runtime errors after "Server successfully bound"
   - Database connection errors
   - Port binding issues

### Option 2: Railway CLI
```bash
# If you haven't logged in yet
railway login

# Link to your project (if not already linked)
railway link

# View logs
railway logs

# View logs with follow mode
railway logs -f
```

## Common Issues and Solutions

### 1. Environment Variables Not Set
Check that these are set in Railway:
```bash
CONVERSAI_SUPABASE_DB_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
RUST_LOG=info
```

### 2. Port Binding Issue
Railway dynamically assigns PORT. The service should use:
```rust
let port = env::var("PORT").unwrap_or("3030".to_string());
```

### 3. Database Connection Timeout
The service now handles missing database gracefully and will start in health-check-only mode.

### 4. Docker Build Context
Railway builds from repo root, so all paths in Dockerfile must be relative to root:
```dockerfile
COPY conversai/rag-service/Cargo.toml conversai/rag-service/Cargo.lock ./
```

## Temporary Fallback Solution

While we debug Railway, you can use the OpenAI API directly in Vercel:

### 1. Update Vercel Environment Variables
Go to Vercel Dashboard → Settings → Environment Variables:

```bash
# Fallback to OpenAI API
NEXT_PUBLIC_USE_FALLBACK_API=true
OPENAI_API_KEY=sk-proj-[your-key]

# Keep Railway URL for when it's fixed
NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL=https://conversai-production.up.railway.app
```

### 2. The Frontend Will Automatically:
- Try Railway first
- Fall back to OpenAI API if Railway fails
- Still provide voice recognition and responses

## Quick Status Check Script
Run this to check deployment status:
```bash
./check_railway_deployment.sh
```

## Next Steps

1. **Wait 2-3 minutes** for the current deployment to complete
2. **Run the status check script** to see if it's accessible
3. **Check Railway logs** if still getting 502 errors
4. **Enable fallback mode** in Vercel while debugging

## Alternative: Local Testing with Railway CLI

Test the service locally with Railway environment:
```bash
cd conversai/rag-service
railway run cargo run
```

This will use Railway's environment variables locally to verify the configuration works.

## Contact Support

If the issue persists after trying these solutions:
1. Check [Railway Status](https://railway.app/status)
2. Join [Railway Discord](https://discord.gg/railway)
3. Contact Railway support with:
   - Project ID
   - Service logs
   - This troubleshooting guide

## Success Indicators

When the deployment is successful, you should see:
- ✅ Health check returns 200 OK
- ✅ Root endpoint returns service info
- ✅ No 502 errors
- ✅ Voice queries work in the app

Keep checking every few minutes - Railway deployments can take time to fully propagate.