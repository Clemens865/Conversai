#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Phase 2: Enhanced Memory - Migration Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This script will apply the Phase 2 migrations to your Supabase database.

IMPORTANT: This migration requires:
1. pgvector extension to be enabled
2. Appropriate database permissions

If you encounter permission errors, you may need to:
1. Run these migrations directly in the Supabase SQL editor
2. Or use the Supabase CLI with proper authentication

Migration file: supabase/migrations/20240103_vector_search_functions.sql
`);

console.log('\n⚠️  Note: Due to Supabase security restrictions, complex migrations');
console.log('with CREATE FUNCTION statements may need to be run manually in the');
console.log('Supabase dashboard SQL editor.\n');

// Function to display migration content
function displayMigration() {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240103_vector_search_functions.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath);
    return;
  }

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Migration Content:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(migrationContent);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Display the migration
displayMigration();

console.log(`
📋 Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to your Supabase Dashboard: ${supabaseUrl}
2. Navigate to the SQL Editor
3. Copy and paste the migration content above
4. Execute the SQL

Alternative: If you have Supabase CLI installed:
  cd conversai
  supabase db push

✅ Once applied, Phase 2 features will be available:
   - Vector-based semantic search
   - Conversation summarization
   - Topic extraction
   - Enhanced context management
`);

// Simple connectivity test
async function testConnection() {
  console.log('\n🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log(`   Found ${data || 0} conversations in the database.`);
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConnection();