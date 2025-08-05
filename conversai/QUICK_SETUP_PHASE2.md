# 🚀 Quick Setup: Phase 2 Enhanced Memory

## The Issue
You're seeing a 500 error because the Phase 2 database functions haven't been created yet. This is expected - we just need to apply the migrations!

## Quick Fix (2 minutes)

### Step 1: Enable pgvector Extension
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Database → Extensions**
3. Search for "vector" 
4. Click "Enable" on the `vector` extension

### Step 2: Apply Migration
1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy ALL the content from this file: `supabase/migrations/20240103_vector_search_functions.sql`
4. Paste it into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)

### Step 3: Apply User Profile Migration (if not already done)
1. Still in SQL Editor, create another new query
2. Copy content from: `supabase/migrations/add_user_profile_data.sql`
3. Paste and run it

## Verify Setup
Visit http://localhost:3000/memory-demo - you should see a green success banner!

## What This Enables
- 🔍 **Semantic Search**: Find conversations by meaning, not keywords
- 📝 **Auto Summarization**: AI summaries every 10 messages
- 🏷️ **Topic Extraction**: Automatic conversation tagging
- 🧠 **Smart Context**: Better AI responses with relevant history

## Troubleshooting

### Still seeing errors?
1. Check if pgvector is enabled (Dashboard → Extensions)
2. Make sure you ran the ENTIRE migration file
3. Try refreshing the page after migrations

### "Permission denied" errors?
- Make sure you're using the Supabase Dashboard SQL editor (it has admin privileges)
- Don't use the Supabase CLI for these complex migrations

### Want to test quickly?
After setup, try these searches in the memory demo:
- Search for a topic you've discussed
- Switch between "Semantic" and "Text" search modes
- Notice how semantic search finds related concepts!

---

**Need help?** The full deployment guide is at `/docs/PHASE2_DEPLOYMENT.md`