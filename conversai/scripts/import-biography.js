#!/usr/bin/env node

/**
 * Biography Import Script for ConversAI
 * Imports personal biography data into both Memory Mode (Supabase) and Claude Local-First (IndexedDB)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Biography data extracted from the file
const biographyFacts = [
  // Personal Information
  { category: 'Identity', key: 'full_name', value: 'Clemens Hönig', confidence: 1.0 },
  { category: 'Identity', key: 'birth_year', value: '1979', confidence: 1.0 },
  { category: 'Identity', key: 'birthplace', value: 'Graz, Österreich', confidence: 1.0 },
  { category: 'Identity', key: 'current_age', value: '45', confidence: 0.95 }, // Calculated from 1979
  
  // Family - Parents
  { category: 'Relationships', key: 'mother_name', value: 'Doris Hoenig', confidence: 1.0 },
  { category: 'Relationships', key: 'mother_profession', value: 'Hautärztin mit eigener Ordination in Graz', confidence: 1.0 },
  { category: 'Relationships', key: 'mother_birthday', value: '11. September', confidence: 1.0 },
  { category: 'Relationships', key: 'father_name', value: 'Manfred Hönig', confidence: 1.0 },
  { category: 'Relationships', key: 'father_profession', value: 'Beamter, zuständig für Straßen- und Brückenbau bei der Stadt Graz', confidence: 1.0 },
  
  // Family - Brother
  { category: 'Relationships', key: 'brother_name', value: 'Julian Hönig', confidence: 1.0 },
  { category: 'Relationships', key: 'brother_birthday', value: '11. September 1976', confidence: 1.0 },
  { category: 'Relationships', key: 'brother_profession', value: 'Exterior Designer bei Apple (über 10 Jahre)', confidence: 1.0 },
  { category: 'Relationships', key: 'brother_career_path', value: 'Audi → Lamborghini → Apple', confidence: 1.0 },
  
  // Own Family
  { category: 'Relationships', key: 'wife_name', value: 'Karin Schwarz', confidence: 1.0 },
  { category: 'Relationships', key: 'wife_birthday', value: '26. April 1983', confidence: 1.0 },
  { category: 'Relationships', key: 'wife_education', value: 'Studium der Kunstwissenschaften in Graz', confidence: 1.0 },
  { category: 'Relationships', key: 'daughter_name', value: 'Clara Hönig', confidence: 1.0 },
  { category: 'Relationships', key: 'daughter_birthday', value: '12. August 2015', confidence: 1.0 },
  { category: 'Relationships', key: 'daughter_health', value: 'Zöliakie (Glutenunverträglichkeit)', confidence: 1.0 },
  { category: 'Relationships', key: 'daughter_school', value: 'Gymnasium Rahlgasse (ab 2024)', confidence: 1.0 },
  
  // Pets (from conversation)
  { category: 'Relationships', key: 'pet_cat_1', value: 'Holly (Siberian cat)', confidence: 0.95 },
  { category: 'Relationships', key: 'pet_cat_2', value: 'Benny (Siberian cat)', confidence: 0.95 },
  
  // Location
  { category: 'Location', key: 'childhood_address', value: 'Naglergasse 10, 8010 Graz', confidence: 1.0 },
  { category: 'Location', key: 'current_city', value: 'Wien', confidence: 0.95 },
  { category: 'Location', key: 'vacation_spot', value: 'Tenerife (yearly summer visits)', confidence: 0.9 },
  
  // Education
  { category: 'History', key: 'volksschule', value: 'Nibelungen, St. Leonhard, Graz', confidence: 1.0 },
  { category: 'History', key: 'gymnasium_1', value: 'Akademisches Gymnasium Graz', confidence: 1.0 },
  { category: 'History', key: 'gymnasium_2', value: 'Gymnasium Kirchengasse (ab 4. Klasse)', confidence: 1.0 },
  { category: 'History', key: 'university', value: 'Universität Graz - Sportwissenschaften', confidence: 1.0 },
  { category: 'History', key: 'study_focus', value: 'Sports Marketing und Sports Management', confidence: 1.0 },
  
  // Career
  { category: 'History', key: 'current_job', value: 'Intelligence- & Marketing Operations Manager bei Yorizon GmbH', confidence: 1.0 },
  { category: 'History', key: 'current_job_start', value: 'Januar 2025', confidence: 1.0 },
  { category: 'History', key: 'company_info', value: 'Yorizon: Joint Venture von Hochtief & Thomas-Krenn', confidence: 1.0 },
  { category: 'History', key: 'previous_company', value: 'C-Motion Wien (über 10 Jahre in der Filmindustrie)', confidence: 1.0 },
  
  // Preferences and Interests
  { category: 'Preferences', key: 'sports_youth', value: 'Intensives Skateboard- und Snowboardfahren', confidence: 1.0 },
  { category: 'Preferences', key: 'sports_current', value: 'Schwimmen, Laufen, Fitnessstudio', confidence: 0.9 },
  { category: 'Preferences', key: 'technology', value: '3D (Blender), KI, LLMs, Coding Assistants', confidence: 1.0 },
  { category: 'Preferences', key: 'work_interest', value: 'Workflow-Automatisierung (n8n, Make.com)', confidence: 0.95 },
  
  // Goals
  { category: 'Goals', key: 'personal_ai', value: 'Building a personal AI assistant that remembers everything', confidence: 0.95 },
  { category: 'Goals', key: 'privacy_focus', value: 'Creating privacy-first AI solutions', confidence: 0.95 }
];

// Function to import facts to Supabase (Memory Mode)
async function importToSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not found in environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get or create user ID (you might want to adjust this)
  const userId = process.env.TEST_USER_ID || '028d70a5-6264-42d1-a28d-8163d6e99231';
  
  console.log('Starting Supabase import...');
  
  for (const fact of biographyFacts) {
    try {
      const factData = {
        user_id: userId,
        category: fact.category,
        key: fact.key,
        value: fact.value,
        raw_text: `Biography import: ${fact.value}`,
        confidence: fact.confidence,
        access_count: 0
      };
      
      // Use upsert to update existing facts or insert new ones
      const { data, error } = await supabase
        .rpc('upsert_fact', factData);
      
      if (error) {
        console.error(`Error inserting fact ${fact.key}:`, error);
      } else {
        console.log(`✓ Imported: ${fact.category} - ${fact.key}`);
      }
    } catch (error) {
      console.error(`Failed to import ${fact.key}:`, error);
    }
  }
  
  console.log('Supabase import completed!');
}

// Function to generate IndexedDB import code (for browser execution)
function generateIndexedDBImport() {
  const importCode = `
// IndexedDB Import Script for Claude Local-First Mode
// Run this in the browser console when on the ConversAI page

async function importBiographyToIndexedDB() {
  const biographyFacts = ${JSON.stringify(biographyFacts, null, 2)};
  
  // Import the local storage module
  const { localFirstStorage } = await import('/src/lib/services/memory/localFirstStorage.js');
  
  // Initialize storage
  await localFirstStorage.initialize();
  
  // Create or get conversation
  const conversationId = crypto.randomUUID();
  const userId = 'local-user';
  
  // Create conversation state
  const state = {
    id: conversationId,
    userId: userId,
    userProfile: {
      name: 'Clemens Hönig',
      facts: biographyFacts.map(fact => ({
        fact: \`\${fact.category}: \${fact.value}\`,
        confidence: fact.confidence,
        timestamp: new Date(),
        source: 'biography-import'
      }))
    },
    currentState: 'biographical-data-imported',
    shortTermMemory: [],
    metadata: {
      created: new Date(),
      updated: new Date(),
      interactionCount: 0
    }
  };
  
  // Save to IndexedDB
  await localFirstStorage.saveState(state);
  
  console.log('Biography imported to IndexedDB!');
  console.log('Refresh the page to see the data in Claude Local-First mode');
}

// Run the import
importBiographyToIndexedDB();
`;

  const outputPath = path.join(__dirname, 'indexeddb-import.js');
  fs.writeFileSync(outputPath, importCode);
  console.log(`\nIndexedDB import script generated: ${outputPath}`);
  console.log('Copy and paste the contents into the browser console when using Claude Local-First mode');
}

// Main execution
async function main() {
  console.log('Biography Import Tool for ConversAI\n');
  
  const args = process.argv.slice(2);
  const mode = args[0];
  
  if (!mode || mode === 'both') {
    console.log('Importing to both Supabase and generating IndexedDB script...\n');
    await importToSupabase();
    generateIndexedDBImport();
  } else if (mode === 'supabase') {
    await importToSupabase();
  } else if (mode === 'indexeddb') {
    generateIndexedDBImport();
  } else {
    console.log('Usage: node import-biography.js [supabase|indexeddb|both]');
    console.log('  supabase  - Import to Supabase (Memory Mode)');
    console.log('  indexeddb - Generate IndexedDB import script');
    console.log('  both      - Do both (default)');
  }
}

// Run the script
main().catch(console.error);