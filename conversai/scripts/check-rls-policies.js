#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Use service role key if available, otherwise anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS and testing message insertion\n');

  try {
    // Test 1: Try to insert without authentication
    console.log('1️⃣ Testing INSERT without authentication...');
    const testId1 = 'test-no-auth-' + Date.now();
    const { data: noAuthInsert, error: noAuthError } = await supabase
      .from('messages')
      .insert({
        conversation_id: testId1,
        user_id: '00000000-0000-0000-0000-000000000000',
        role: 'user',
        content: 'Test without auth'
      })
      .select();

    if (noAuthError) {
      console.log(`❌ Cannot insert without auth: ${noAuthError.message}`);
      console.log('   This is expected if RLS is enabled');
    } else {
      console.log('✅ Inserted without auth (RLS might be disabled)');
    }

    // Test 2: Check if we have service role access
    console.log('\n2️⃣ Checking database access level...');
    const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ? true : false;
    console.log(`Using: ${isServiceRole ? 'Service Role Key (bypasses RLS)' : 'Anon Key (subject to RLS)'}`);

    // Test 3: Insert with service role (if available)
    if (isServiceRole) {
      console.log('\n3️⃣ Testing INSERT with service role key...');
      const testConvId = 'test-service-' + Date.now();
      const testUserId = 'a0000000-0000-0000-0000-000000000001';
      
      // Create conversation first
      const { error: convError } = await supabase
        .from('conversations')
        .insert({
          id: testConvId,
          user_id: testUserId,
          title: 'Service Role Test'
        });

      if (convError) {
        console.log('Could not create conversation:', convError.message);
      }

      // Insert test message
      const { data: serviceInsert, error: serviceError } = await supabase
        .from('messages')
        .insert({
          conversation_id: testConvId,
          user_id: testUserId,
          role: 'user',
          content: 'My name is Clemens'
        })
        .select()
        .single();

      if (serviceError) {
        console.log(`❌ Service role insert failed: ${serviceError.message}`);
      } else {
        console.log('✅ Service role insert successful!');
        console.log(`   Message ID: ${serviceInsert.id}`);
        console.log(`   Content: "${serviceInsert.content}"`);
      }
    }

    // Test 4: Count total messages
    console.log('\n4️⃣ Counting messages in database...');
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('Error counting messages:', countError.message);
    } else {
      console.log(`Total messages in database: ${count || 0}`);
    }

    // Test 5: Check for any messages with "Clemens"
    console.log('\n5️⃣ Searching for messages with "Clemens"...');
    const { data: clemensMessages, error: searchError } = await supabase
      .from('messages')
      .select('id, content, user_id, created_at')
      .ilike('content', '%clemens%');

    if (searchError) {
      console.log('Error searching:', searchError.message);
    } else {
      console.log(`Found ${clemensMessages?.length || 0} messages mentioning "Clemens"`);
      if (clemensMessages && clemensMessages.length > 0) {
        clemensMessages.forEach(msg => {
          console.log(`- "${msg.content}" (User: ${msg.user_id})`);
        });
      }
    }

    // Summary
    console.log('\n📋 Summary:');
    console.log(`- RLS appears to be: ${noAuthError ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
    console.log(`- Database access: ${isServiceRole ? 'Service Role (full access)' : 'Anon Key (limited by RLS)'}`);
    console.log(`- Total messages: ${count || 0}`);
    
    if (!isServiceRole && noAuthError) {
      console.log('\n💡 To insert test data, you need to:');
      console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
      console.log('2. Or authenticate properly in the app before saving messages');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRLSPolicies();