# Supabase Facts Table Setup Guide

This guide will help you set up the facts table in your Supabase project for the fact-based memory system.

## Prerequisites

- Access to your Supabase project dashboard
- Database permissions to create tables and functions

## Setup Steps

### 1. Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (usually in the left sidebar)
3. Click "New query"

### 2. Run the Migration

Copy and paste the entire contents of `/supabase/migrations/20240119_create_facts_table.sql` into the SQL editor and run it.

This migration will:
- Create the `facts` table with all necessary columns
- Set up proper indexes for performance
- Create helper functions for fact management
- Enable Row Level Security (RLS) with proper policies
- Set up automatic timestamp updates

### 3. Verify the Setup

After running the migration, verify everything was created correctly:

```sql
-- Check if the facts table exists
SELECT * FROM facts LIMIT 1;

-- Check if the fact_category enum was created
SELECT enum_range(NULL::fact_category);

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'facts';

-- Check functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%fact%';
```

### 4. Test the System

You can test the fact storage with these queries:

```sql
-- Test inserting a fact (replace with your user ID)
SELECT * FROM upsert_fact(
  'YOUR_USER_ID'::uuid,
  'identity'::fact_category,
  'user.name',
  'Test User',
  'My name is Test User',
  0.95,
  '{}'::jsonb
);

-- Test searching facts
SELECT * FROM search_facts(
  'YOUR_USER_ID'::uuid,
  ARRAY['test'],
  NULL,
  0.0,
  10
);

-- Get fact summary
SELECT * FROM get_fact_summary('YOUR_USER_ID'::uuid);
```

## Features Implemented

### 1. Fact Storage
- Unique facts per user with key-based lookup
- Confidence scoring (0-1)
- Access counting for relevance tracking
- Metadata storage for additional context

### 2. Automatic Updates
- Higher confidence facts automatically replace lower confidence ones
- Updated timestamps tracked automatically
- Previous values stored in metadata

### 3. Search Capabilities
- Keyword search across fact values and raw text
- Category filtering
- Confidence threshold filtering
- Efficient indexing for fast searches

### 4. Security
- Row Level Security (RLS) ensures users can only access their own facts
- Secure functions with SECURITY DEFINER for proper access control
- All policies properly configured for SELECT, INSERT, UPDATE, DELETE

## Troubleshooting

### If the migration fails:

1. **Check for existing objects**: The migration might fail if some objects already exist. Drop them first:
   ```sql
   DROP TABLE IF EXISTS facts CASCADE;
   DROP TYPE IF EXISTS fact_category CASCADE;
   ```

2. **Check user permissions**: Ensure your database user has CREATE permissions

3. **Check for syntax errors**: Make sure you copied the entire SQL file

### Testing the Integration

After setup, test the integration in your app:

1. Start your development server
2. Switch to "Memory Mode (Fact-Based)" in settings
3. Have a conversation mentioning facts like:
   - "My name is [Your Name]"
   - "I have a cat named Holly"
   - "I live in Vienna"
4. Click the brain icon and "View Fact-Based Memory" to see stored facts

## Environment Variables

Ensure these are set in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Next Steps

1. Test fact extraction by having conversations
2. Monitor the facts table in Supabase dashboard
3. Use the fact memory display to view stored facts
4. Check Supabase logs for any errors

The fact-based memory system is now ready to use with persistent storage!