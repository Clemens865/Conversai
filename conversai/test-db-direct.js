#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseOperations() {
  console.log('🔍 Testing direct database operations...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
    process.env.CONVERSAI_SUPABASE_SERVICE_KEY
  );
  
  try {
    // Test 1: Check pgvector extension
    console.log('1️⃣ Checking pgvector extension...');
    const { data: extensions, error: extError } = await supabase.rpc('get_extensions');
    
    if (extError) {
      console.log('   Note: Extension check failed (expected):', extError.message);
    } else {
      console.log('   Extensions found:', extensions?.length || 0);
    }
    
    // Test 2: Insert a test document directly
    console.log('\n2️⃣ Inserting test document...');
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        source_type: 'md',
        source_uri: 'test://direct-insert.md',
        content_sha256: 'test_' + Date.now(),
        tags: ['test', 'direct']
      })
      .select()
      .single();
    
    if (docError) {
      console.error('   ❌ Document insert failed:', docError);
      return;
    }
    
    console.log('   ✅ Document inserted:', doc.id);
    
    // Test 3: Insert a test chunk with a simple vector
    console.log('\n3️⃣ Testing vector insertion...');
    
    // Create a simple test vector (1536 dimensions for ada-002)
    const testVector = new Array(1536).fill(0.1);
    
    const { data: chunk, error: chunkError } = await supabase
      .from('chunks')
      .insert({
        document_id: doc.id,
        content: 'Test chunk content',
        content_tokens: 4,
        section: 'test',
        embedding: testVector
      })
      .select('id, content')
      .single();
    
    if (chunkError) {
      console.error('   ❌ Chunk insert failed:', chunkError);
      
      // Try without embedding to isolate the issue
      console.log('\n   Trying without embedding...');
      const { error: chunkError2 } = await supabase
        .from('chunks')
        .insert({
          document_id: doc.id,
          content: 'Test chunk without embedding',
          content_tokens: 4,
          section: 'test'
        });
      
      if (chunkError2) {
        console.error('   ❌ Chunk insert without embedding also failed:', chunkError2);
      } else {
        console.log('   ✅ Chunk inserted without embedding');
      }
    } else {
      console.log('   ✅ Chunk with vector inserted:', chunk.id);
    }
    
    // Test 4: Query the hybrid_search function
    console.log('\n4️⃣ Testing hybrid_search function...');
    
    const { data: searchResults, error: searchError } = await supabase.rpc('hybrid_search', {
      query_embedding: testVector,
      query_text: 'test',
      match_count: 5
    });
    
    if (searchError) {
      console.error('   ❌ Hybrid search failed:', searchError);
    } else {
      console.log('   ✅ Hybrid search returned', searchResults?.length || 0, 'results');
    }
    
    // Cleanup
    console.log('\n5️⃣ Cleaning up test data...');
    await supabase.from('documents').delete().eq('id', doc.id);
    console.log('   ✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabaseOperations();