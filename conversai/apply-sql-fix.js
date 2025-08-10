#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('🔧 SQL FIX FOR HYBRID_SEARCH FUNCTION');
console.log('========================================\n');

console.log('The hybrid_search function needs to be updated to fix type mismatches.\n');

console.log('📋 INSTRUCTIONS:\n');
console.log('1. Open the Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/bqbiqondlbufofgmwfri/sql/new\n');

console.log('2. Copy and paste the following SQL:\n');
console.log('========== COPY FROM HERE ==========\n');

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '002_fix_hybrid_search_types.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log(migrationSQL);

console.log('\n========== COPY UNTIL HERE ==========\n');

console.log('3. Click the "Run" button in the SQL editor\n');

console.log('4. You should see a success message like:');
console.log('   "Success. No rows returned"\n');

console.log('5. After applying the fix, run:');
console.log('   node test-full-pipeline.js\n');

console.log('This will fix the type mismatch error and allow the RAG pipeline to work correctly.\n');

console.log('📌 Quick link to SQL editor:');
console.log('   https://supabase.com/dashboard/project/bqbiqondlbufofgmwfri/sql/new');
console.log('========================================');