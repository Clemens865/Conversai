# Supabase Authentication Setup

## ⚠️ Important: Enable Email Auth in Supabase

The authentication is not working because email auth needs to be configured in your Supabase project.

## Steps to Enable Authentication:

### 1. Go to Supabase Dashboard
- Open https://app.supabase.com
- Select your project (mjwztzhdefgfgedyynzc)

### 2. Configure Authentication Settings
1. Go to **Authentication** → **Configuration** → **Auth Providers**
2. Make sure **Email** is enabled
3. Under **Email Auth**, ensure:
   - ✅ Enable Email Signup
   - ✅ Enable Email Login
   - ❌ Confirm Email (disable for testing)
   - ❌ Secure Email Change (disable for testing)

### 3. Configure Email Templates (Optional)
1. Go to **Authentication** → **Configuration** → **Email Templates**
2. You can customize the email templates if needed

### 4. Check SMTP Settings
1. Go to **Authentication** → **Configuration** → **SMTP Settings**
2. For development, you can use Supabase's default SMTP
3. For production, configure your own SMTP provider

### 5. Allowed Email Domains (If Restricted)
If you have email domain restrictions:
1. Go to **Authentication** → **Configuration** → **Auth Settings**
2. Check if there are any email domain restrictions
3. Remove restrictions or add your testing domains

### 6. Rate Limits
1. Go to **Authentication** → **Configuration** → **Auth Settings**
2. Check rate limits for sign-ups
3. For development, you might want to increase these limits

## Testing After Configuration

Once you've enabled email auth, you can test with:

```bash
# Run the test script again
node scripts/test-supabase.js
```

Or try signing up directly in the app at http://localhost:3002

## Common Issues:

1. **"Email address is invalid"** - Email auth is not enabled
2. **"Email rate limit exceeded"** - Too many signups, wait or increase limits
3. **"Email not allowed"** - Domain restrictions are enabled
4. **No confirmation email** - Check SMTP settings or disable email confirmation for testing

## For Local Development

For easier local development, you might want to:
1. Disable email confirmation
2. Use a simple email/password without verification
3. Consider using Supabase Auth UI components for faster setup