// Test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL;
const supabaseKey = process.env.CONVERSAI_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('documents')
      .select('count')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('⚠️  Tables not created yet. Please run the SQL migrations.');
      console.log('Go to: https://supabase.com/dashboard/project/mjwztzhdefgfgedyynzc/sql/new');
      console.log('And paste the contents of: supabase/migrations/001_setup_rag_tables.sql');
    } else if (error) {
      console.error('❌ Connection error:', error.message);
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log('✅ Database tables are ready');
    }
    
    // Test storage bucket
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();
    
    if (!storageError) {
      const hasConversAIBucket = buckets.some(b => b.name === 'conversai-documents');
      if (hasConversAIBucket) {
        console.log('✅ Storage bucket "conversai-documents" exists');
      } else {
        console.log('⚠️  Storage bucket "conversai-documents" not found');
        console.log('Create it at: https://supabase.com/dashboard/project/mjwztzhdefgfgedyynzc/storage/buckets');
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();