#!/usr/bin/env node

/**
 * Direct Biography Import Script for ConversAI
 * Directly inserts facts into the Supabase facts table
 * Use this if the migration hasn't been run yet
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Biography facts data
const biographyFacts = [
  // Core identity (keep these minimal for privacy)
  { category: 'identity', key: 'full_name', value: 'Clemens Hönig', confidence: 1.0 },
  { category: 'identity', key: 'birth_year', value: '1979', confidence: 1.0 },
  { category: 'identity', key: 'birthplace', value: 'Graz, Österreich', confidence: 1.0 },
  
  // Pets (already mentioned in conversations)
  { category: 'relationships', key: 'pet_cat_1', value: 'Holly (Siberian cat)', confidence: 0.95 },
  { category: 'relationships', key: 'pet_cat_2', value: 'Benny (Siberian cat)', confidence: 0.95 },
  
  // Location
  { category: 'location', key: 'current_city', value: 'Wien', confidence: 0.95 },
  { category: 'location', key: 'vacation_spot', value: 'Tenerife (yearly summer visits)', confidence: 0.9 },
  
  // Career (public information)
  { category: 'history', key: 'current_job', value: 'Intelligence- & Marketing Operations Manager bei Yorizon GmbH', confidence: 1.0 },
  { category: 'history', key: 'current_job_start', value: 'Januar 2025', confidence: 1.0 },
  { category: 'history', key: 'company_info', value: 'Yorizon: Joint Venture von Hochtief & Thomas-Krenn', confidence: 1.0 },
  
  // Interests
  { category: 'preferences', key: 'sports_current', value: 'Schwimmen, Laufen, Fitnessstudio', confidence: 0.9 },
  { category: 'preferences', key: 'technology', value: '3D (Blender), KI, LLMs, Coding Assistants', confidence: 1.0 },
  { category: 'preferences', key: 'work_interest', value: 'Workflow-Automatisierung (n8n, Make.com)', confidence: 0.95 },
  
  // Goals
  { category: 'goals', key: 'personal_ai', value: 'Building a personal AI assistant that remembers everything', confidence: 0.95 },
  { category: 'goals', key: 'privacy_focus', value: 'Creating privacy-first AI solutions', confidence: 0.95 }
];

async function importDirectly() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not found in environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Use your actual user ID or create a test user
  const userId = '028d70a5-6264-42d1-a28d-8163d6e99231';
  
  console.log('Starting direct import to facts table...');
  console.log(`Importing ${biographyFacts.length} facts for user ${userId}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const fact of biographyFacts) {
    try {
      // Direct insert into facts table
      const { data, error } = await supabase
        .from('facts')
        .upsert({
          user_id: userId,
          category: fact.category,
          key: fact.key,
          value: fact.value,
          raw_text: `Biography import: ${fact.value}`,
          confidence: fact.confidence,
          access_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,key',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`❌ Error inserting ${fact.key}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Imported: ${fact.category} - ${fact.key}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to import ${fact.key}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`✅ Successfully imported: ${successCount} facts`);
  console.log(`❌ Failed: ${errorCount} facts`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  If you see "relation "facts" does not exist" errors:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Run the migration from: supabase/migrations/20240119_create_facts_table.sql');
    console.log('3. Then run this script again');
  }
}

// Check if facts table exists
async function checkFactsTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Try to query the facts table
  const { data, error } = await supabase
    .from('facts')
    .select('id')
    .limit(1);
  
  if (error && error.message.includes('relation "facts" does not exist')) {
    return false;
  }
  
  return true;
}

// Main execution
async function main() {
  console.log('Biography Direct Import Tool for ConversAI\n');
  
  // Check if facts table exists
  console.log('Checking if facts table exists...');
  const tableExists = await checkFactsTable();
  
  if (!tableExists) {
    console.log('\n❌ Facts table does not exist in your Supabase database!');
    console.log('\n📋 To fix this:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy the contents of: conversai/supabase/migrations/20240119_create_facts_table.sql');
    console.log('5. Paste and run it');
    console.log('6. Then run this script again\n');
    process.exit(1);
  }
  
  console.log('✅ Facts table exists!\n');
  
  // Import the facts
  await importDirectly();
}

// Run the script
main().catch(console.error);