#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
  process.env.CONVERSAI_SUPABASE_SERVICE_KEY
);

async function resetAndIngest() {
  console.log('🔄 Resetting and re-ingesting document...\n');
  
  try {
    // Delete existing documents and chunks
    console.log('1️⃣ Deleting existing documents...');
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('Error deleting documents:', deleteError);
    } else {
      console.log('   ✅ Existing documents deleted\n');
    }
    
    // Wait a moment for the cascade delete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now re-ingest
    console.log('2️⃣ Re-ingesting document...');
    console.log('   File: lebensgeschichte_clemens_hoenig.md\n');
    
    const { exec } = require('child_process');
    const cmd = `curl -s -X POST http://localhost:3030/ingest \
      -F "file=@docs/lebensgeschichte_clemens_hoenig.md" \
      -F "tags=biography,personal,clemens" \
      -H "Accept: application/json"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Ingestion failed:', error.message);
        return;
      }
      
      if (stderr) {
        console.error('❌ Error output:', stderr);
        return;
      }
      
      try {
        const response = JSON.parse(stdout);
        console.log('✅ Document ingested successfully!');
        console.log(`   - Document ID: ${response.document_id}`);
        console.log(`   - Chunks created: ${response.chunks_count}`);
        console.log(`   - Estimated tokens: ${response.tokens_estimate}`);
        
        if (response.warnings && response.warnings.length > 0) {
          console.log('   ⚠️  Warnings:', response.warnings.join(', '));
        }
      } catch (e) {
        console.log('Response:', stdout);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetAndIngest();