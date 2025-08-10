#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function executeMigrations() {
  console.log('🚀 Executing RAG migrations on ConversAI_RUST project...');
  console.log('   URL:', process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
    process.env.CONVERSAI_SUPABASE_SERVICE_KEY
  );
  
  // Read migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_setup_rag_tables.sql');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  
  // Output instructions for manual execution
  console.log('\n📋 INSTRUCTIONS FOR MANUAL EXECUTION:\n');
  console.log('Since Supabase requires certain operations to be run via the dashboard SQL editor,');
  console.log('please follow these steps:\n');
  console.log('1. Open the SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/bqbiqondlbufofgmwfri/sql/new\n');
  console.log('2. Copy and paste the following SQL:\n');
  console.log('========== COPY FROM HERE ==========\n');
  console.log(migrationContent);
  console.log('\n========== COPY UNTIL HERE ==========\n');
  console.log('3. Click the "Run" button in the SQL editor\n');
  console.log('4. You should see success messages for:');
  console.log('   ✅ pgvector extension enabled');
  console.log('   ✅ documents table created');
  console.log('   ✅ chunks table created with HNSW index');
  console.log('   ✅ facts table created');
  console.log('   ✅ hybrid_search function created');
  console.log('\n5. After successful migration, the Rust RAG service will be able to:');
  console.log('   - Ingest documents');
  console.log('   - Store embeddings');
  console.log('   - Perform hybrid search\n');
  
  // Test if tables already exist
  console.log('🔍 Checking current database state...\n');
  
  try {
    const { data: tables, error } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log('✅ Tables appear to already exist!');
      console.log('   You may skip the migration if tables are already set up.\n');
    } else if (error.code === '42P01') {
      console.log('⚠️  Tables do not exist yet.');
      console.log('   Please run the migration SQL above.\n');
    } else {
      console.log('⚠️  Could not determine table status:', error.message);
    }
  } catch (e) {
    console.log('   Note: Table check requires running the migration first.\n');
  }
  
  console.log('📌 Quick link to SQL editor:');
  console.log('   https://supabase.com/dashboard/project/bqbiqondlbufofgmwfri/sql/new');
}

executeMigrations();