#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials (need service role key for this script)');
  console.log('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertTestMessage() {
  console.log('📝 Inserting test message with name...\n');

  try {
    // Get or create a test user
    console.log('1️⃣ Getting test user...');
    const testEmail = 'test@example.com';
    
    // First, try to get existing user
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    let userId;
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`Using existing user: ${userId}`);
    } else {
      // Create a test user ID
      userId = 'a0000000-0000-0000-0000-000000000001';
      console.log(`Using test user ID: ${userId}`);
    }

    // Create or get a conversation
    console.log('\n2️⃣ Creating test conversation...');
    const conversationId = 'test-' + Date.now();
    
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        title: 'Test Conversation with Name',
      })
      .select()
      .single();
    
    if (convError) {
      console.error('Error creating conversation:', convError);
      // Try to use an existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .limit(1)
        .single();
      
      if (existing) {
        conversationId = existing.id;
        console.log(`Using existing conversation: ${conversationId}`);
      } else {
        throw convError;
      }
    } else {
      console.log(`Created conversation: ${conversationId}`);
    }

    // Insert test messages
    console.log('\n3️⃣ Inserting test messages...');
    const messages = [
      {
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: 'Hello, my name is Clemens',
      },
      {
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: 'Nice to meet you, Clemens! I\'ll remember your name.',
      },
      {
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: 'Do you remember my name?',
      }
    ];

    for (const msg of messages) {
      const { data, error } = await supabase
        .from('messages')
        .insert(msg)
        .select()
        .single();
      
      if (error) {
        console.error(`Error inserting message:`, error);
      } else {
        console.log(`✅ Inserted ${msg.role} message: "${msg.content.substring(0, 50)}..."`);
        console.log(`   Message ID: ${data.id}`);
      }
    }

    // Check if embeddings are being generated
    console.log('\n4️⃣ Waiting for embeddings to generate...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    const { data: embeddings, error: embError } = await supabase
      .from('message_embeddings')
      .select('message_id')
      .limit(10);
    
    console.log(`\n✅ Embeddings in database: ${embeddings?.length || 0}`);

    console.log('\n📋 Test data inserted successfully!');
    console.log('Now you can:');
    console.log('1. Go to the app and ask "Do you know my name?"');
    console.log('2. The AI should remember "Clemens" from the test data');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if we have service role key
if (!supabaseServiceKey) {
  console.log('⚠️  This script needs the service role key to bypass RLS policies.');
  console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  console.log('You can find it in your Supabase dashboard under Settings > API');
} else {
  insertTestMessage();
}