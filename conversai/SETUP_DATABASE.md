# Database Setup Instructions

Since the Supabase MCP server is not configured yet, please follow these steps to set up your database:

## Option 1: Use Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project (URL: https://mjwztzhdefgfgedyynzc.supabase.co)
3. Click on **SQL Editor** in the left sidebar
4. Copy the entire contents of `/conversai/supabase/schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the schema

## Option 2: Configure Supabase MCP

Follow the instructions in `SUPABASE_MCP_SETUP.md`:

1. Get your Supabase access token from the dashboard
2. Add it to Claude's MCP configuration
3. Restart Claude
4. The database operations will be available through MCP

## What the Schema Creates

The schema.sql file will create:

- **Extensions**: UUID generation and pgvector for embeddings
- **Tables**:
  - `user_profiles`: Extended user information
  - `user_preferences`: Voice and other preferences
  - `conversations`: Conversation metadata
  - `messages`: Individual messages in conversations
  - `message_embeddings`: Vector embeddings for semantic search (Phase 2)
- **Indexes**: For performance optimization
- **Row Level Security**: Ensures users can only access their own data
- **Triggers**: Automatic timestamp updates

## After Running the Schema

Once the database is set up:

1. Ensure your `.env.local` file has the correct Supabase credentials
2. The application will automatically use the new tables
3. User authentication and data storage will work properly

## Verification

To verify the schema was applied correctly, run this query in the SQL editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- conversations
- message_embeddings
- messages
- user_preferences
- user_profiles