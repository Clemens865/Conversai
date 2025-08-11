#!/usr/bin/env node

// Test script to verify RAG system with biography data

const testQueries = [
  "What did Clemens do at Yorizon?",
  "Tell me about Robotic Eyes",
  "What is Clemens's expertise?",
  "What projects is Clemens working on?",
  "Who is Clemens Hönig?"
];

async function testQuery(query) {
  console.log(`\n📝 Query: "${query}"`);
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch('https://conversai-tau.vercel.app/api/rag-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query
      })
    });
    
    const result = await response.json();
    
    if (result.answer) {
      console.log('✅ Answer:', result.answer);
      console.log('📚 Sources:', result.sources || ['Database']);
      console.log('🔧 Mode:', result.mode || 'unknown');
      console.log('📊 Chunks found:', result.chunks?.length || 0);
    } else {
      console.log('⚠️  No answer received');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing RAG System with Biography Data');
  console.log('=========================================');
  
  for (const query of testQueries) {
    await testQuery(query);
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test Complete!');
  console.log('\n📱 Try it yourself at: https://conversai-tau.vercel.app');
  console.log('   1. Select "RAG System (Production)" mode');
  console.log('   2. Click the microphone and ask about Clemens');
  console.log('   3. You should hear the answer spoken with ElevenLabs!');
}

runTests();