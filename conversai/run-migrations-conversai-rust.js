#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
  process.env.CONVERSAI_SUPABASE_SERVICE_KEY
);

async function runMigrations() {
  console.log('🚀 Running migrations on ConversAI_RUST Supabase project...');
  console.log('   Project URL:', process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL);
  
  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_setup_rag_tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('\n📝 Migration file loaded:', migrationPath);
  
  // Split the SQL into individual statements (Supabase SQL editor handles this better)
  // For programmatic execution, we'll execute key parts separately
  
  try {
    // First, enable pgvector extension
    console.log('\n1️⃣ Enabling pgvector extension...');
    const { error: extError } = await supabase.rpc('query', {
      query: "CREATE EXTENSION IF NOT EXISTS vector;"
    }).single();
    
    if (extError) {
      console.log('   Note: Extension might already exist or needs to be enabled via dashboard');
    }
    
    // We'll use the Supabase SQL editor for the full migration
    console.log('\n⚠️  IMPORTANT: The full migration needs to be run via the Supabase SQL Editor');
    console.log('\n📋 Instructions:');
    console.log('1. Go to: https://supabase.com/dashboard/project/bqbiqondlbufofgmwfri/sql/new');
    console.log('2. Copy the contents of: conversai/supabase/migrations/001_setup_rag_tables.sql');
    console.log('3. Paste into the SQL editor');
    console.log('4. Click "Run" to execute the migration');
    console.log('\n✅ After running the migration, you will have:');
    console.log('   - documents table with pgvector support');
    console.log('   - chunks table with HNSW index');
    console.log('   - facts table for extracted knowledge');
    console.log('   - hybrid_search function for similarity + keyword search');
    
  } catch (error) {
    console.error('❌ Error during migration setup:', error.message);
    return false;
  }
  
  return true;
}

runMigrations();