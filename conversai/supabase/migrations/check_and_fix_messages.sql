-- First, let's check the current state of the messages table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check if user_id column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'user_id'
) AS user_id_exists;

-- If you see that user_id doesn't exist above, run this part:
-- Add user_id column safely
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update messages to use conversation's user_id
UPDATE messages m
SET user_id = c.user_id
FROM conversations c
WHERE m.conversation_id = c.id
AND m.user_id IS NULL;

-- Check how many messages would be orphaned
SELECT COUNT(*) as orphaned_messages
FROM messages 
WHERE user_id IS NULL;

-- If there are no orphaned messages, make the column NOT NULL
ALTER TABLE messages 
ALTER COLUMN user_id SET NOT NULL;

-- Add the foreign key constraint
ALTER TABLE messages 
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies
CREATE POLICY "messages_select_policy" ON messages FOR SELECT 
    USING (auth.uid() = user_id);
    
CREATE POLICY "messages_insert_policy" ON messages FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "messages_update_policy" ON messages FOR UPDATE 
    USING (auth.uid() = user_id);
    
CREATE POLICY "messages_delete_policy" ON messages FOR DELETE 
    USING (auth.uid() = user_id);

-- Do the same for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_policy" ON conversations FOR SELECT 
    USING (auth.uid() = user_id);
    
CREATE POLICY "conversations_insert_policy" ON conversations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "conversations_update_policy" ON conversations FOR UPDATE 
    USING (auth.uid() = user_id);
    
CREATE POLICY "conversations_delete_policy" ON conversations FOR DELETE 
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON message_embeddings TO authenticated;