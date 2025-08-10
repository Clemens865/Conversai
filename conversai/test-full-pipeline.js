#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
  process.env.CONVERSAI_SUPABASE_SERVICE_KEY
);

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('Error clearing database:', error);
  } else {
    console.log('   ✅ Database cleared\n');
  }
  
  // Wait for cascade delete
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function ingestDocument() {
  console.log('📄 Ingesting document...');
  console.log('   File: lebensgeschichte_clemens_hoenig.md\n');
  
  try {
    const { stdout, stderr } = await execPromise(`
      curl -s -X POST http://localhost:3030/ingest \
        -F "file=@docs/lebensgeschichte_clemens_hoenig.md" \
        -F "tags=biography,personal,clemens" \
        -H "Accept: application/json"
    `);
    
    if (stderr) {
      console.error('❌ Error:', stderr);
      return false;
    }
    
    if (stdout) {
      try {
        const response = JSON.parse(stdout);
        console.log('✅ Document ingested successfully!');
        console.log(`   - Document ID: ${response.document_id}`);
        console.log(`   - Chunks created: ${response.chunks_count}`);
        console.log(`   - Estimated tokens: ${response.tokens_estimate}\n`);
        return response.document_id;
      } catch (e) {
        console.log('❌ Failed to parse response:', stdout);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Ingestion failed:', error.message);
    return false;
  }
}

async function verifyStorage() {
  console.log('🔍 Verifying storage...\n');
  
  const { data: documents } = await supabase
    .from('documents')
    .select('*');
  
  console.log(`   📄 Documents: ${documents?.length || 0}`);
  
  const { count: chunkCount } = await supabase
    .from('chunks')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   📝 Chunks: ${chunkCount || 0}`);
  
  // Check sample chunk
  const { data: sampleChunk } = await supabase
    .from('chunks')
    .select('id, content, embedding')
    .limit(1);
  
  if (sampleChunk && sampleChunk[0]) {
    console.log(`   ✅ Embeddings stored: ${sampleChunk[0].embedding ? 'Yes' : 'No'}`);
    if (sampleChunk[0].content) {
      console.log(`   📖 Sample content: "${sampleChunk[0].content.substring(0, 50)}..."\n`);
    }
  }
  
  return chunkCount > 0;
}

async function testQueries() {
  console.log('🔍 Testing queries...\n');
  
  const queries = [
    { text: "Wer ist Clemens Hönig?", description: "German biographical query" },
    { text: "Tell me about his family", description: "Family information" },
    { text: "Graz Austria 1979", description: "Birth information" },
    { text: "career film industry", description: "Career query" },
    { text: "Clara daughter", description: "Family member query" }
  ];
  
  let successCount = 0;
  
  for (const query of queries) {
    console.log(`📝 Query: "${query.text}" (${query.description})`);
    
    try {
      const response = await fetch('http://localhost:3030/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.text,
          k: 3,
          filters: { tags: ["biography", "personal", "clemens"] }
        })
      });
      
      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}`);
      } else {
        const data = await response.json();
        const chunks = data.context || [];
        console.log(`   ✅ Found ${chunks.length} results`);
        
        if (chunks.length > 0) {
          successCount++;
          console.log(`   🎯 Top result score: ${chunks[0].score?.toFixed(3)}`);
          console.log(`   📄 Preview: "${chunks[0].chunk?.content?.substring(0, 60)}..."`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  return successCount;
}

async function runFullPipelineTest() {
  console.log('='.repeat(60));
  console.log('🚀 CONVERSAI RAG PIPELINE TEST');
  console.log('='.repeat(60) + '\n');
  
  // Step 1: Clear database
  await clearDatabase();
  
  // Step 2: Ingest document
  const documentId = await ingestDocument();
  if (!documentId) {
    console.log('\n❌ Ingestion failed. Stopping test.');
    return;
  }
  
  // Wait for ingestion to complete
  console.log('⏳ Waiting for ingestion to complete...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 3: Verify storage
  const storageOk = await verifyStorage();
  if (!storageOk) {
    console.log('\n❌ Storage verification failed. Stopping test.');
    return;
  }
  
  // Step 4: Test queries
  const successfulQueries = await testQueries();
  
  // Results
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Ingestion: SUCCESS`);
  console.log(`✅ Storage: SUCCESS`);
  console.log(`✅ Queries: ${successfulQueries}/5 successful`);
  
  if (successfulQueries >= 3) {
    console.log('\n🎉 RAG PIPELINE FULLY OPERATIONAL! 🎉');
  } else {
    console.log('\n⚠️  Pipeline operational but query accuracy needs improvement');
  }
  
  console.log('\n📝 Next steps:');
  console.log('   1. Deploy to production (Railway/Fly.io/Cloud Run)');
  console.log('   2. Update frontend TypeScript client');
  console.log('   3. Configure production environment variables');
  console.log('='.repeat(60));
}

// Run the test
runFullPipelineTest().catch(console.error);