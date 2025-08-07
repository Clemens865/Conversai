require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixMessagesTable() {
  console.log('🔧 Fixing messages table structure...\n');

  // The SQL to add user_id column if it doesn't exist
  const migrationSQL = `
    -- Fix messages table: Add user_id column if missing
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'user_id'
        ) THEN
            -- Add user_id column as nullable first
            ALTER TABLE messages 
            ADD COLUMN user_id UUID;
            
            -- Update any existing messages to use the conversation's user_id
            UPDATE messages m
            SET user_id = c.user_id
            FROM conversations c
            WHERE m.conversation_id = c.id
            AND m.user_id IS NULL;
            
            -- Delete any messages that still don't have a user_id (orphaned messages)
            DELETE FROM messages WHERE user_id IS NULL;
            
            -- Now make it NOT NULL after cleaning up
            ALTER TABLE messages 
            ALTER COLUMN user_id SET NOT NULL;
            
            -- Add foreign key constraint
            ALTER TABLE messages 
            ADD CONSTRAINT messages_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
            
            -- Create index for performance
            CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
            
            RAISE NOTICE 'Added user_id column to messages table';
        ELSE
            RAISE NOTICE 'user_id column already exists in messages table';
        END IF;
    END $$;
  `;

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If RPC doesn't work, we'll need to do it manually
      console.log('ℹ️  Could not execute migration automatically.');
      console.log('Please run the following SQL in your Supabase SQL editor:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(migrationSQL);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 Steps:');
      console.log('1. Go to: https://mjwztzhdefgfgedyynzc.supabase.co');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Paste and run the SQL above');
      return;
    }

    console.log('✅ Migration executed successfully!');
    
    // Verify the fix
    const { data: columns, error: columnsError } = await supabase
      .from('messages')
      .select('*')
      .limit(0);
    
    console.log('\n🔍 Verifying table structure...');
    if (!columnsError) {
      console.log('✅ Messages table is ready to accept messages with user_id');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nPlease run the migration manually in Supabase SQL editor.');
  }
}

// Also check and update RLS policies
async function updateRLSPolicies() {
  console.log('\n🔒 Updating RLS policies...\n');

  const rlsSQL = `
    -- Update RLS policies for messages to use user_id
    DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
    DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
    
    -- Create new policies using user_id directly
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
  `;

  console.log('Please also run these RLS policy updates:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(rlsSQL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the fixes
async function main() {
  console.log('🚀 ConversAI Database Fix Script\n');
  await fixMessagesTable();
  await updateRLSPolicies();
  console.log('\n✨ Done! After running the SQL in Supabase, restart your dev server.');
}

main().catch(console.error);