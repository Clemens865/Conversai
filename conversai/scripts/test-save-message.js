#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSaveMessage() {
  console.log('🧪 Testing message save functionality\n');

  try {
    // Try to sign in as test user
    console.log('1️⃣ Attempting authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'clemens@focuspulleratwork.com',
      password: 'test123' // You'll need to use your actual password
    });

    if (authError) {
      console.log('Could not authenticate. Let\'s try with anonymous auth...');
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found. Messages might not save without authentication.');
        console.log('\nTo fix this:');
        console.log('1. Make sure you\'re logged in through the app UI');
        console.log('2. Or update this script with your actual password');
        return;
      }
    } else {
      console.log(`✅ Authenticated as: ${authData.user?.email}`);
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }

    console.log(`\nUser ID: ${user.id}`);
    console.log(`Email: ${user.email}`);

    // Create a test conversation
    console.log('\n2️⃣ Creating test conversation...');
    const conversationId = 'test-' + Date.now();
    
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: user.id,
        title: 'Test Name Memory',
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      // Try to use existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (existing) {
        conversationId = existing.id;
        console.log(`Using existing conversation: ${conversationId}`);
      } else {
        return;
      }
    } else {
      console.log(`✅ Created conversation: ${conversationId}`);
    }

    // Insert test messages
    console.log('\n3️⃣ Inserting test messages...');
    const testMessages = [
      {
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: 'Hello, my name is Clemens',
      },
      {
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: 'Nice to meet you, Clemens! I\'ll remember that.',
      }
    ];

    for (const msg of testMessages) {
      const { data, error } = await supabase
        .from('messages')
        .insert(msg)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error inserting message:`, error);
      } else {
        console.log(`✅ Inserted: ${msg.role} - "${msg.content}"`);
        console.log(`   Message ID: ${data.id}`);
      }
    }

    // Check if messages were saved
    console.log('\n4️⃣ Verifying messages were saved...');
    const { data: savedMessages, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`\n✅ Total messages for user: ${count || 0}`);
    if (savedMessages && savedMessages.length > 0) {
      console.log('\nRecent messages:');
      savedMessages.forEach((msg, idx) => {
        console.log(`[${idx + 1}] ${msg.role}: "${msg.content}"`);
      });
    }

    console.log('\n✅ Test complete!');
    console.log('Now try asking "Do you know my name?" in the app.');
    
  } catch (error) {
    console.error('Test error:', error);
  }

  process.exit(0);
}

testSaveMessage();