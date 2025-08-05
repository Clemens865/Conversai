# Fix Database Issue - Missing user_id Column

## Problem Found
The `messages` table is missing the `user_id` column, which is preventing messages from being saved to the database. This is why the AI can't remember your name - no messages are being stored!

## Solution
Apply the migration that adds the missing column and sets up proper RLS policies.

## Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard/project/xlvltsseqcnjlaxrtiaj

2. **Go to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**
   - Copy the entire contents of: `supabase/migrations/fix_messages_user_id.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Cmd+Enter

4. **Verify the Fix**
   - The output should show:
     - "Added user_id column to messages table" (or "already exists")
     - "Messages table now has X columns"

## After Applying the Fix

1. **Refresh your ConversAI app** in the browser
2. **Start a new conversation**
3. **Say "My name is Clemens"**
4. **Start another conversation** (or refresh)
5. **Ask "Do you know my name?"**

The AI should now remember your name!

## Verify It's Working

Run this command to check if messages are being saved:
```bash
node scripts/check-messages-simple.js
```

You should see messages in the database after having a conversation.