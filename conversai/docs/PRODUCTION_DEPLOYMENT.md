# ConversAI Production Deployment Guide

## Deployment to Vercel

### Quick Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

### Environment Variables

Add these in Vercel's project settings:

```env
# Supabase (for Memory Mode)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Deepgram (for voice transcription)
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key

# OpenAI (for AI responses)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key

# ElevenLabs (for text-to-speech)
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key

# Anthropic (for Claude mode)
ANTHROPIC_API_KEY=your_anthropic_key
```

## Feature Availability

### ✅ Works in Production

1. **Memory Mode**
   - Full fact-based memory with Supabase
   - Voice input via Deepgram
   - AI responses via OpenAI
   - Text-to-speech via ElevenLabs

2. **Claude Local-First Mode**
   - Browser-based storage with IndexedDB
   - Privacy-focused, no cloud sync
   - Uses Anthropic's Claude API

3. **Basic Features**
   - All text-based interactions
   - Memory persistence
   - Conversation history
   - Import/export functionality

### ❌ Does NOT Work in Production

1. **Markdown Library Mode (with Realtime API)**
   - OpenAI's Realtime API requires WebSocket authentication headers
   - Browsers cannot send custom headers with WebSocket connections
   - This is a fundamental browser limitation, not a code issue

2. **WebSocket Proxy Server**
   - The proxy server is for local development only
   - Cannot be deployed with the frontend on Vercel
   - Would require a separate backend deployment

### 🔧 Production Workarounds

For Markdown Library mode in production, consider:

1. **Use Standard API Mode**
   - The mode already falls back to standard OpenAI API
   - Voice input can use Web Speech API (browser built-in)
   - Responses use regular OpenAI chat completions

2. **Deploy a Separate Backend**
   - Deploy the proxy server on a platform like:
     - Heroku
     - Railway
     - Render
     - AWS EC2
   - Update the WebSocket URL to point to your backend

3. **Wait for OpenAI Updates**
   - OpenAI is aware of the browser limitation
   - They may add browser-friendly authentication in the future

## Deployment Steps

### 1. Prepare Your Code

```bash
# Commit all changes
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts
```

#### Option B: Via Web Interface
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure environment variables
4. Click "Deploy"

### 3. Post-Deployment

1. Test all modes to ensure they work
2. Check that API keys are properly configured
3. Monitor usage in Vercel dashboard

## Security Considerations

1. **API Keys**
   - All keys starting with `NEXT_PUBLIC_` are visible to users
   - Only use these for client-side APIs with proper CORS/domain restrictions
   - Server-only keys (like `SUPABASE_SERVICE_KEY`) are kept secret

2. **Domain Restrictions**
   - Configure API key restrictions in each service:
     - OpenAI: Limit to your Vercel domain
     - Deepgram: Add allowed domains
     - ElevenLabs: Set referrer restrictions

3. **Rate Limiting**
   - Consider implementing rate limiting for API routes
   - Monitor usage to prevent abuse

## Recommended Production Setup

For the best production experience:

1. **Use Memory Mode** as the primary mode
   - Most feature-complete
   - Reliable voice and AI integration
   - Persistent memory with Supabase

2. **Offer Claude Local-First** for privacy-conscious users
   - No cloud storage
   - All data stays in the browser

3. **Disable or Hide** Markdown Library mode in production
   - Or clearly mark it as "Development Only"
   - Or implement Web Speech API fallback

## Monitoring

After deployment:

1. **Check Vercel Functions logs** for API errors
2. **Monitor Supabase dashboard** for database usage
3. **Track API usage** in respective dashboards
4. **Set up alerts** for errors or high usage

## Troubleshooting

### "API key not configured"
- Double-check environment variables in Vercel
- Ensure variable names match exactly
- Redeploy after adding variables

### "Cannot connect to Realtime API"
- This is expected in production
- The mode should fall back to standard API
- Consider hiding this mode in production

### "Supabase connection failed"
- Verify Supabase URL and keys
- Check Row Level Security policies
- Ensure tables are properly set up

## Questions?

For issues specific to:
- **Deployment**: Check Vercel docs
- **APIs**: Refer to respective service docs
- **Code**: Review the codebase documentation