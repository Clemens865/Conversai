# 🚀 Vercel Environment Variables Setup

## ✅ GREAT NEWS: Railway is Working!

Your Railway service is now accessible at: `https://conversai-production.up.railway.app`

## 🔧 Required Environment Variables for Vercel

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these variables:

### 1. Railway RAG Service URL
```
NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL=https://conversai-production.up.railway.app
```

### 2. Supabase Configuration
```
NEXT_PUBLIC_CONVERSAI_SUPABASE_URL=https://mwhwauqgduxbqgycekri.supabase.co
NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY=[Your Supabase Anon Key]
```

### 3. OpenAI API Key (for fallback)
```
OPENAI_API_KEY=sk-proj-[your-openai-key]
```

### 4. Claude API Key (if using Claude mode)
```
ANTHROPIC_API_KEY=sk-ant-[your-claude-key]
```

## 🔄 After Adding Variables:

1. Click "Save"
2. Redeploy your application (Vercel will prompt you)
3. Wait for deployment to complete (2-3 minutes)

## ✅ Test Your RAG System:

1. Visit your Vercel app
2. Go to Settings → Select "RAG System (Production)"
3. Click the microphone button
4. Say: "What did Clemens do at Yorizon?"
5. The system should retrieve information from your biography and respond!

## 🎯 What's Working Now:

- ✅ Railway service is running and accessible
- ✅ Database is connected
- ✅ Voice recognition is working
- ✅ CORS is being fixed (deploying now)
- ⏳ Just need Vercel environment variables

## 📝 Troubleshooting:

If you still get errors after adding environment variables:
1. Check browser console for specific error messages
2. Ensure all API keys are correct
3. Make sure to redeploy Vercel after adding variables
4. Clear browser cache and try again

Your RAG system is almost ready! Just add these environment variables to Vercel and you're good to go! 🎉