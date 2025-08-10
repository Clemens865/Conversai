# 🚀 Railway Setup Guide for ConversAI RAG Service

## 🚨 CRITICAL: Add Environment Variables to Railway

Your Railway service is failing health checks because it can't connect to the database. You need to add these environment variables in the Railway dashboard:

### Step 1: Go to Railway Dashboard
1. Visit [Railway Dashboard](https://railway.app/dashboard)
2. Navigate to your **Conversai_RUST** project
3. Click on the **conversai-production** service

### Step 2: Add Environment Variables
Click on the "Variables" tab and add these:

#### 1. Database Connection (REQUIRED)
```
CONVERSAI_SUPABASE_DB_URL=postgresql://postgres.mwhwauqgduxbqgycekri:[YOUR_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**To get your password:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your **ConversAI_RUST** project
- Go to Settings → Database
- Copy the connection string (URI) - it includes the password

#### 2. OpenAI API Key (REQUIRED)
```
OPENAI_API_KEY=sk-proj-[your-api-key]
```

#### 3. Logging (Optional but helpful)
```
RUST_LOG=info
```

### Step 3: Verify Deployment
After adding the environment variables:
1. Railway will automatically redeploy
2. Check the deployment logs in Railway
3. Look for these success messages:
   - "Attempting to connect to database..."
   - "Successfully connected to database"
   - "RAG service listening on 0.0.0.0:[PORT]"

### Step 4: Test the Health Check
Once deployed, test the health endpoint:
```bash
curl https://conversai-production.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "conversai-rag",
  "version": "1.0.0"
}
```

## 🔍 Debugging Tips

### Check Logs
```bash
# In the rag-service directory with Railway CLI linked
railway logs --service [service-name]
```

### Common Issues

1. **Database Connection Failed**
   - Double-check the database URL format
   - Ensure password is URL-encoded if it contains special characters
   - Try using `DATABASE_URL` instead of `CONVERSAI_SUPABASE_DB_URL`

2. **Port Issues**
   - Railway automatically sets the PORT variable
   - Don't hardcode PORT in railway.json
   - Service listens on the PORT Railway provides

3. **Health Check Timeouts**
   - We've increased timeout to 60 seconds
   - If still failing, database connection is likely the issue

## 📝 What We Fixed

1. **Removed hardcoded PORT** - Railway assigns this dynamically
2. **Fixed Dockerfile paths** - Corrected for Railway's build context
3. **Added database fallback** - Checks both env var names
4. **Better error logging** - Shows exactly what's failing
5. **CORS configuration** - Properly configured for browser access

## ✅ Next Steps

After Railway is working:

1. **Update Vercel Environment**
   - Add `NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL=https://conversai-production.up.railway.app`
   - Redeploy Vercel app

2. **Test Full Integration**
   - Visit your Vercel app
   - Select "RAG System (Production)" mode
   - Test voice input and queries

## 📞 Support

If you're still having issues after adding the environment variables:
1. Check the Railway deployment logs for specific error messages
2. The service now has detailed logging that will show exactly what's failing
3. Most likely issue is the database connection string format

Remember: The service NEEDS the database URL to start properly!