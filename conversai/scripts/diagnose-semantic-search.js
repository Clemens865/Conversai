#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !openaiKey) {
  console.error('Missing required credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const openai = new OpenAI.OpenAI({ apiKey: openaiKey });

// Calculate cosine similarity
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function diagnoseSemanticsSearch() {
  console.log('🔍 Diagnosing Semantic Search Issues\n');

  try {
    // Step 1: Check if we have any messages with embeddings
    console.log('1️⃣ Checking messages and embeddings...');
    
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        role,
        created_at,
        user_id,
        message_embeddings (
          id,
          message_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return;
    }

    console.log(`Found ${messages?.length || 0} messages`);
    
    const messagesWithEmbeddings = messages?.filter(m => m.message_embeddings?.length > 0) || [];
    console.log(`Messages with embeddings: ${messagesWithEmbeddings.length}`);
    
    if (messages && messages.length > 0) {
      console.log('\nRecent messages:');
      messages.forEach((msg, idx) => {
        const hasEmbedding = msg.message_embeddings?.length > 0 ? '✅' : '❌';
        console.log(`${hasEmbedding} [${idx + 1}] ${msg.role}: "${msg.content.substring(0, 50)}..."`);
      });
    }

    // Step 2: Test semantic similarity between common phrases
    console.log('\n2️⃣ Testing semantic similarity between phrases...');
    
    const testPairs = [
      ["My name is Clemens", "Do you know my name?"],
      ["My name is Clemens", "What is my name?"],
      ["My name is Clemens", "What's my name?"],
      ["My name is Clemens", "my name is"],
      ["I am called Clemens", "What am I called?"],
      ["Call me Clemens", "What should I call you?"]
    ];

    for (const [phrase1, phrase2] of testPairs) {
      try {
        console.log(`\nTesting: "${phrase1}" vs "${phrase2}"`);
        
        // Generate embeddings
        const response1 = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: phrase1,
        });
        
        const response2 = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: phrase2,
        });
        
        const embedding1 = response1.data[0].embedding;
        const embedding2 = response2.data[0].embedding;
        
        const similarity = cosineSimilarity(embedding1, embedding2);
        console.log(`Similarity: ${(similarity * 100).toFixed(2)}%`);
        console.log(`Would pass 0.6 threshold: ${similarity >= 0.6 ? '✅ YES' : '❌ NO'}`);
        console.log(`Would pass 0.7 threshold: ${similarity >= 0.7 ? '✅ YES' : '❌ NO'}`);
      } catch (err) {
        console.error(`Error testing pair: ${err.message}`);
      }
    }

    // Step 3: Test actual search function
    console.log('\n3️⃣ Testing actual search function...');
    
    if (messagesWithEmbeddings.length > 0) {
      // Get a test embedding
      const testQuery = "my name is";
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: testQuery,
      });
      const queryEmbedding = response.data[0].embedding;
      
      // Try different thresholds
      for (const threshold of [0.5, 0.6, 0.7, 0.8]) {
        console.log(`\nSearching with threshold ${threshold}:`);
        
        const { data: results, error: searchError } = await supabase.rpc('search_messages_by_embedding', {
          p_user_id: messages[0].user_id,
          p_query_embedding: queryEmbedding,
          p_limit: 5,
          p_similarity_threshold: threshold
        });
        
        if (searchError) {
          console.error(`Search error: ${searchError.message}`);
        } else {
          console.log(`Found ${results?.length || 0} results`);
          results?.forEach(r => {
            console.log(`- Score ${r.similarity_score.toFixed(3)}: "${r.content.substring(0, 50)}..."`);
          });
        }
      }
    }

    // Step 4: Check timing issues
    console.log('\n4️⃣ Checking for timing issues...');
    
    const { data: recentNoEmbedding } = await supabase
      .from('messages')
      .select('id, content, created_at')
      .is('id', 'not.null')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentNoEmbedding) {
      const messageIds = recentNoEmbedding.map(m => m.id);
      const { data: embeddings } = await supabase
        .from('message_embeddings')
        .select('message_id')
        .in('message_id', messageIds);
      
      const embeddingMessageIds = embeddings?.map(e => e.message_id) || [];
      const missingEmbeddings = recentNoEmbedding.filter(m => !embeddingMessageIds.includes(m.id));
      
      if (missingEmbeddings.length > 0) {
        console.log(`\n⚠️ ${missingEmbeddings.length} messages missing embeddings:`);
        missingEmbeddings.forEach(m => {
          console.log(`- "${m.content.substring(0, 50)}..." (${new Date(m.created_at).toLocaleString()})`);
        });
      } else {
        console.log('✅ All recent messages have embeddings');
      }
    }

    // Summary
    console.log('\n📊 Diagnosis Summary:');
    console.log('1. Semantic similarity between name statements and questions is likely too low');
    console.log('2. Current threshold of 0.6-0.7 might be filtering out valid matches');
    console.log('3. Single-message embeddings lack conversational context');
    console.log('\n💡 Recommendations:');
    console.log('1. Lower similarity threshold to 0.5 for name-related queries');
    console.log('2. Implement explicit entity extraction for names');
    console.log('3. Consider conversation chunking for richer embeddings');
    console.log('4. Add structured storage for critical user information');

  } catch (error) {
    console.error('Diagnostic error:', error);
  }
}

diagnoseSemanticsSearch();