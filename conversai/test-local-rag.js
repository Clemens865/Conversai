#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
  process.env.CONVERSAI_SUPABASE_SERVICE_KEY
);

const RAG_URL = 'http://localhost:3030';

async function testLocalRAG() {
  console.log('='.repeat(60));
  console.log('🧪 LOCAL RAG SERVICE TEST');
  console.log('='.repeat(60) + '\n');
  
  let allTestsPassed = true;
  
  // Test 1: Service Health
  console.log('1️⃣ Testing service health...');
  try {
    const response = await fetch(`${RAG_URL}/health`);
    if (response.ok) {
      console.log('   ✅ Service is running on port 3030\n');
    } else {
      console.log('   ❌ Service returned status:', response.status);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Cannot connect to service. Is it running?');
    console.log('   Run: cd rag-service && cargo run\n');
    return;
  }
  
  // Test 2: Database Connection
  console.log('2️⃣ Testing database connection...');
  try {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   ✅ Connected to Supabase (${count || 0} documents in DB)\n`);
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    allTestsPassed = false;
  }
  
  // Test 3: Clear test data
  console.log('3️⃣ Clearing test data...');
  const { error: clearError } = await supabase
    .from('documents')
    .delete()
    .eq('source_uri', 'storage://test-local.md');
  
  if (!clearError) {
    console.log('   ✅ Test data cleared\n');
  }
  
  // Test 4: Document Ingestion
  console.log('4️⃣ Testing document ingestion...');
  
  // Create test document
  const testContent = `# Test Document for Local RAG

## About This Test
This is a test document for the ConversAI RAG system.

## Clemens Hönig Biography
Clemens Hönig was born in 1979 in Graz, Austria. He has worked in various industries including film production and technology.

## Career Highlights
- Film industry experience with C-Motion
- Founded Focus Puller at Work
- Created Kakaduu EU for children's education
- Currently working at Yorizon GmbH as Intelligence & Marketing Operations Manager

## Family
- Wife: Karin Schwarz
- Daughter: Clara (born 2015)
- Lives in Vienna, Austria`;
  
  fs.writeFileSync('test-local.md', testContent);
  
  try {
    const { stdout } = await execPromise(`
      curl -s -X POST ${RAG_URL}/ingest \
        -F "file=@test-local.md" \
        -F "tags=test,local,biography"
    `);
    
    if (stdout) {
      const response = JSON.parse(stdout);
      console.log('   ✅ Document ingested successfully');
      console.log(`      - Document ID: ${response.document_id}`);
      console.log(`      - Chunks created: ${response.chunks_count}`);
      console.log(`      - Estimated tokens: ${response.tokens_estimate}\n`);
      
      // Store document ID for later cleanup
      global.testDocId = response.document_id;
    } else {
      console.log('   ❌ Ingestion returned empty response');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Ingestion failed:', error.message);
    allTestsPassed = false;
  }
  
  // Wait for indexing
  console.log('   ⏳ Waiting for indexing...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 5: Verify Storage
  console.log('\n5️⃣ Verifying data storage...');
  const { count: chunkCount } = await supabase
    .from('chunks')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', global.testDocId);
  
  if (chunkCount > 0) {
    console.log(`   ✅ ${chunkCount} chunks stored with embeddings\n`);
  } else {
    console.log('   ⚠️  No chunks found. Check if embeddings were generated.');
    allTestsPassed = false;
  }
  
  // Test 6: Query Functionality
  console.log('6️⃣ Testing query functionality...');
  
  const testQueries = [
    { query: "Who is Clemens Hönig?", expectedTerms: ["Clemens", "born", "1979"] },
    { query: "Tell me about his career", expectedTerms: ["film", "technology", "Yorizon"] },
    { query: "Family information", expectedTerms: ["Karin", "Clara", "Vienna"] }
  ];
  
  let querySuccess = 0;
  
  for (const test of testQueries) {
    try {
      const response = await fetch(`${RAG_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: test.query,
          k: 3,
          filters: { tags: ["test", "local", "biography"] }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const chunks = data.context || [];
        
        if (chunks.length > 0) {
          console.log(`   ✅ Query: "${test.query}"`);
          console.log(`      Found ${chunks.length} results`);
          
          // Check if results contain expected terms
          const allContent = chunks.map(c => c.chunk?.content || '').join(' ').toLowerCase();
          const hasExpectedContent = test.expectedTerms.some(term => 
            allContent.includes(term.toLowerCase())
          );
          
          if (hasExpectedContent) {
            console.log(`      Content is relevant ✓`);
            querySuccess++;
          } else {
            console.log(`      ⚠️  Content may not be relevant`);
          }
        } else {
          console.log(`   ⚠️  Query: "${test.query}" - No results`);
        }
      } else {
        console.log(`   ❌ Query failed with status ${response.status}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Query error:`, error.message);
      allTestsPassed = false;
    }
  }
  
  console.log(`\n   Query Success Rate: ${querySuccess}/${testQueries.length}\n`);
  
  // Test 7: Hybrid Search Function
  console.log('7️⃣ Testing hybrid search directly...');
  try {
    const { data, error } = await supabase.rpc('hybrid_search', {
      query_embedding: new Array(1536).fill(0.1),
      query_text: 'Clemens career',
      match_count: 5
    });
    
    if (error) {
      console.log('   ❌ Hybrid search error:', error.message);
      console.log('   ⚠️  You may need to apply the SQL fix:');
      console.log('      Run: node apply-sql-fix.js');
      allTestsPassed = false;
    } else {
      console.log(`   ✅ Hybrid search working (${data?.length || 0} results)\n`);
    }
  } catch (error) {
    console.log('   ❌ Hybrid search failed:', error.message);
    allTestsPassed = false;
  }
  
  // Cleanup
  console.log('8️⃣ Cleaning up test data...');
  if (global.testDocId) {
    await supabase.from('documents').delete().eq('id', global.testDocId);
    console.log('   ✅ Test data cleaned up\n');
  }
  fs.unlinkSync('test-local.md');
  
  // Results
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  if (allTestsPassed && querySuccess >= 2) {
    console.log(`
✅ ALL TESTS PASSED!

Your RAG service is working correctly locally.
You can now proceed with deployment to Railway.

Next steps:
1. cd rag-service
2. railway init
3. railway up
4. Set environment variables in Railway dashboard
`);
  } else {
    console.log(`
⚠️  SOME TESTS FAILED

Issues to fix before deployment:
`);
    if (!allTestsPassed) {
      console.log('- Check error messages above');
    }
    if (querySuccess < 2) {
      console.log('- Query relevance needs improvement');
    }
    console.log(`
Most common issue: SQL function type mismatch
Solution: Run 'node apply-sql-fix.js' and apply the SQL in Supabase
`);
  }
  
  console.log('='.repeat(60));
}

// Run the test
testLocalRAG().catch(console.error);