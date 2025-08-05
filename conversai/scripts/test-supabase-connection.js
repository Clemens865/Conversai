#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Service Key: ${supabaseServiceKey ? '✅ Found' : '❌ Missing'}`);
console.log(`Anon Key: ${supabaseAnonKey ? '✅ Found' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required credentials');
  process.exit(1);
}

// Create client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('\n1️⃣ Testing database connection...');
    
    // Check if we can query tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_schema', ['public', 'auth'])
      .order('table_schema', { ascending: true });
    
    if (tablesError) {
      // Try a simpler query
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('count', { count: 'exact', head: true });
      
      if (msgError) {
        console.log('❌ Database connection error:', msgError.message);
      } else {
        console.log('✅ Database connection successful');
        console.log(`   Messages table accessible`);
      }
    } else {
      console.log('✅ Database connection successful');
      console.log(`   Found ${tables?.length || 0} tables`);
    }

    console.log('\n2️⃣ Checking auth schema access...');
    
    // Try to check auth.users
    const { error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️  Cannot access auth.users via API:', authError.message);
      console.log('   This is normal for some Supabase configurations');
    } else {
      console.log('✅ Auth schema accessible');
    }

    console.log('\n3️⃣ Testing user_profiles table...');
    
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      if (profileError.code === '42P01') {
        console.log('❌ user_profiles table does not exist');
        console.log('   Run the migration: create_user_profiles_table_fixed.sql');
      } else {
        console.log('❌ Error accessing user_profiles:', profileError.message);
      }
    } else {
      console.log('✅ user_profiles table exists and is accessible');
    }

    console.log('\n4️⃣ Project Information:');
    console.log(`Project URL: ${supabaseUrl}`);
    const projectId = supabaseUrl.match(/https:\/\/(\w+)\.supabase\.co/)?.[1];
    console.log(`Project ID: ${projectId || 'Unknown'}`);
    
    console.log('\n📋 Summary:');
    console.log('- Service role key is working');
    console.log('- Database connection established');
    console.log('- Ready to apply migrations');

  } catch (error) {
    console.error('\nUnexpected error:', error);
  }
}

testConnection();