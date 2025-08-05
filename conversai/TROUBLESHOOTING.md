# Troubleshooting Guide

## Authentication Issues

### Problem: Cannot sign in or sign up

**1. Check Debug Page**
Visit http://localhost:3002/debug to see the status of:
- Environment variables
- Supabase client creation
- Database connection
- Auth session

**2. Check Browser Console**
Open Developer Tools (F12) and look for errors in the Console tab.

**3. Common Fixes:**

#### Email Confirmation Required
If Supabase requires email confirmation:
1. Go to Supabase Dashboard → Authentication → Configuration
2. Under Email Auth, temporarily disable "Confirm email"
3. Or check your email for confirmation link

#### Invalid Email Format
Supabase might reject certain email formats. Try:
- Use a real email address
- Use common domains like @gmail.com, @outlook.com
- Avoid special characters in the email

#### Rate Limiting
If you see "Email rate limit exceeded":
1. Wait a few minutes
2. Or increase rate limits in Supabase Dashboard

### Problem: "Supabase client not initialized"

This means environment variables are not loaded:

1. **Check .env.local file exists** in the root of `/conversai/`
2. **Restart the dev server** after changing .env.local:
   ```bash
   # Stop the server (Ctrl+C)
   pnpm run dev
   ```
3. **Verify variable names** start with `NEXT_PUBLIC_`

### Problem: API Keys Not Working

**For Development:**
1. The current keys in .env.local should work
2. If not, get your own free API keys:
   - Deepgram: https://console.deepgram.com/
   - OpenAI: https://platform.openai.com/
   - ElevenLabs: https://elevenlabs.io/

## Voice Issues

### Problem: Microphone not working

1. **Check browser permissions**
   - Click the lock icon in the address bar
   - Ensure microphone access is allowed

2. **Use HTTPS or localhost**
   - Microphone only works on secure contexts
   - localhost is considered secure

3. **Check browser compatibility**
   - Use Chrome, Edge, or Firefox
   - Safari may have issues with some features

### Problem: No AI response

1. **Check API keys** in .env.local
2. **Check browser console** for errors
3. **Verify OpenAI API key** is valid and has credits

### Problem: No voice output

1. **Check browser audio**
   - Ensure volume is not muted
   - Test with other audio sources

2. **Check ElevenLabs API key**
   - Verify it's valid
   - Check if you have credits

## Quick Test Checklist

1. ✅ Visit http://localhost:3002/debug
2. ✅ All status indicators should be green
3. ✅ Try signing up with a simple email like test@gmail.com
4. ✅ Check browser console for errors
5. ✅ Ensure microphone permissions are granted

## Still Having Issues?

1. **Clear browser data** for localhost:3002
2. **Try incognito/private mode**
3. **Check Supabase Dashboard** for any issues
4. **Restart everything**:
   ```bash
   # Stop server
   Ctrl+C
   
   # Clear Next.js cache
   rm -rf .next
   
   # Restart
   pnpm run dev
   ```