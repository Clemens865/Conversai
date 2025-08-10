#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
  process.env.CONVERSAI_SUPABASE_SERVICE_KEY
);

async function checkData() {
  console.log('🔍 Checking RAG data in ConversAI_RUST database...\n');
  
  try {
    // Check documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*');
    
    if (docsError) {
      console.error('❌ Error fetching documents:', docsError);
      return;
    }
    
    console.log(`📄 Documents: ${docs.length} found`);
    docs.forEach(doc => {
      console.log(`  - ID: ${doc.id.substring(0,8)}...`);
      console.log(`    Source: ${doc.source_uri}`);
      console.log(`    Tags: ${doc.tags?.join(', ') || 'none'}`);
      console.log(`    Created: ${new Date(doc.created_at).toLocaleString()}`);
    });
    
    // Check chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('chunks')
      .select('id, document_id, content, section, content_tokens')
      .limit(5);
    
    if (chunksError) {
      console.error('❌ Error fetching chunks:', chunksError);
      return;
    }
    
    console.log(`\n📝 Chunks: ${chunks.length} samples (limited to 5)`);
    chunks.forEach((chunk, i) => {
      console.log(`\n  Chunk ${i + 1}:`);
      console.log(`    Section: ${chunk.section || 'root'}`);
      console.log(`    Tokens: ${chunk.content_tokens}`);
      console.log(`    Preview: ${chunk.content.substring(0, 100)}...`);
    });
    
    // Count total chunks
    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Total chunks in database: ${count}`);
    
    // Check if embeddings exist
    const { data: embeddingCheck } = await supabase
      .from('chunks')
      .select('id, embedding')
      .limit(1);
    
    if (embeddingCheck && embeddingCheck[0]?.embedding) {
      console.log('✅ Embeddings are stored (vector dimension: 1536)');
    } else {
      console.log('⚠️  No embeddings found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkData();