#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  console.log('🔍 Checking Table Structures\n');

  try {
    // 1. Check messages table structure
    console.log('1️⃣ Messages table columns:');
    const { data: messageColumns, error: msgColError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages'
        ORDER BY ordinal_position
      `
    });
    
    if (msgColError) {
      // Try direct query
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(0);
      
      console.log('Messages table exists:', !error);
      if (error) console.log('Error:', error.message);
    } else {
      console.log(messageColumns);
    }

    // 2. Check user_profiles table structure
    console.log('\n2️⃣ User_profiles table columns:');
    const { data: profileColumns, error: profColError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_profiles'
        ORDER BY ordinal_position
      `
    });
    
    if (profColError) {
      // Check if table exists at all
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log('✅ user_profiles table exists');
        console.log('Sample data:', data);
      } else {
        console.log('❌ Error:', error.message);
      }
    } else {
      console.log(profileColumns);
    }

    // 3. Test inserting into user_profiles
    console.log('\n3️⃣ Testing user_profiles insert...');
    const testUserId = 'a0000000-0000-0000-0000-000000000001';
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: testUserId,
        name: 'Test User',
        preferences: { theme: 'dark' },
        facts: { test: true }
      }, {
        onConflict: 'user_id'
      })
      .select();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('Error details:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up test data
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', testUserId);
    }

    // 4. Check for column name issues
    console.log('\n4️⃣ Checking exact column names...');
    
    // Get exact structure using service role
    const { data: exactStructure, error: structError } = await supabase
      .from('user_profiles')
      .select()
      .limit(0);
    
    if (structError) {
      console.log('Structure check error:', structError);
    } else {
      console.log('Table is accessible, checking for user_id column...');
      
      // Try to select specifically user_id
      const { error: userIdError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .limit(1);
      
      if (userIdError) {
        console.log('❌ user_id column error:', userIdError.message);
        
        // Try other potential column names
        const columnTests = ['userid', 'user', 'id'];
        for (const col of columnTests) {
          const { error } = await supabase
            .from('user_profiles')
            .select(col)
            .limit(1);
          
          if (!error) {
            console.log(`✅ Found column: ${col}`);
          }
        }
      } else {
        console.log('✅ user_id column exists and is accessible');
      }
    }

  } catch (error) {
    console.error('Check error:', error);
  }
}

checkTableStructure();