const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect
    console.log('\n1. Testing connection...');
    const { data, error } = await supabase.from('conversations').select('count');
    
    if (error) {
      console.error('❌ Connection error:', error.message);
    } else {
      console.log('✅ Connected to Supabase successfully!');
    }

    // Test 2: Try to sign up a test user
    console.log('\n2. Testing auth signup...');
    const testEmail = `test${Date.now()}@gmail.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123',
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      console.error('Details:', authError);
    } else {
      console.log('✅ Auth seems to be working!');
      console.log('User created:', authData.user?.email);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();