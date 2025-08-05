-- Fix messages table: Add user_id column if missing
-- This migration ensures the messages table has the user_id column needed for RLS

-- First, check if user_id column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id column
        ALTER TABLE messages 
        ADD COLUMN user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        
        -- Add foreign key constraint if auth.users exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'auth' 
            AND table_name = 'users'
        ) THEN
            ALTER TABLE messages 
            ADD CONSTRAINT messages_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
        END IF;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
        
        RAISE NOTICE 'Added user_id column to messages table';
    ELSE
        RAISE NOTICE 'user_id column already exists in messages table';
    END IF;
END $$;

-- Update existing messages to use the conversation's user_id
UPDATE messages m
SET user_id = c.user_id
FROM conversations c
WHERE m.conversation_id = c.id
AND m.user_id = '00000000-0000-0000-0000-000000000000';

-- Ensure RLS is enabled on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create RLS policies for messages
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (auth.uid() = user_id);

-- Also ensure conversations table has proper RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing conversation policies if they exist
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- Create RLS policies for conversations
CREATE POLICY "Users can view their own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON conversations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON message_embeddings TO authenticated;

-- Show current table structure for debugging
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages';
    
    RAISE NOTICE 'Messages table now has % columns', col_count;
END $$;