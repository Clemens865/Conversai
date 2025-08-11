#!/usr/bin/env node

// Comprehensive test of the RAG system

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testIngestion() {
  console.log('📚 Testing Biography Ingestion');
  console.log('================================\n');
  
  const response = await fetch('https://conversai-tau.vercel.app/api/ingest-biography', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  const result = await response.json();
  console.log('Ingestion result:', result);
  return result.success;
}

async function testQuery(query, expectedTerms = []) {
  console.log(`\n📝 Testing: "${query}"`);
  console.log('─'.repeat(50));
  
  const response = await fetch('https://conversai-tau.vercel.app/api/rag-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  
  if (result.answer) {
    console.log('✅ Answer received');
    console.log('   Answer:', result.answer.substring(0, 200) + '...');
    console.log('   Mode:', result.mode);
    console.log('   Chunks found:', result.chunks?.length || 0);
    
    // Check if answer contains expected terms
    const answerLower = result.answer.toLowerCase();
    const foundTerms = expectedTerms.filter(term => 
      answerLower.includes(term.toLowerCase())
    );
    
    if (foundTerms.length > 0) {
      console.log('   ✅ Found expected terms:', foundTerms);
      return true;
    } else if (expectedTerms.length > 0) {
      console.log('   ⚠️  Missing expected terms:', expectedTerms);
      return false;
    }
    return true;
  } else {
    console.log('❌ No answer received');
    return false;
  }
}

async function testOpenAIFallback() {
  console.log('\n🔄 Testing OpenAI Fallback');
  console.log('================================');
  
  const response = await fetch('https://conversai-tau.vercel.app/api/openai-rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: "Who is Clemens and what did he do at Yorizon?" 
    })
  });
  
  const result = await response.json();
  
  if (result.response) {
    console.log('✅ OpenAI fallback working');
    console.log('   Response:', result.response.substring(0, 200) + '...');
    return true;
  } else {
    console.log('❌ OpenAI fallback failed');
    return false;
  }
}

async function runCompleteTest() {
  console.log('🧪 COMPLETE RAG SYSTEM TEST');
  console.log('============================\n');
  
  console.log('Waiting 30 seconds for deployment to complete...\n');
  await wait(30000);
  
  let successCount = 0;
  let totalTests = 0;
  
  // Test 1: Ingestion
  totalTests++;
  try {
    if (await testIngestion()) {
      successCount++;
      console.log('   ✅ Ingestion successful');
    }
  } catch (error) {
    console.log('   ❌ Ingestion failed:', error.message);
  }
  
  await wait(2000);
  
  // Test 2-6: Various queries
  const queries = [
    { 
      query: "What did Clemens do at Yorizon?",
      expectedTerms: ["Yorizon", "AI", "computer vision"]
    },
    {
      query: "Tell me about Robotic Eyes",
      expectedTerms: ["Robotic Eyes", "CEO", "vision"]
    },
    {
      query: "What is ConversAI?",
      expectedTerms: ["ConversAI", "conversation", "RAG"]
    },
    {
      query: "What technologies does Clemens use?",
      expectedTerms: ["Rust", "Python", "TypeScript"]
    },
    {
      query: "Who is Clemens Hönig?",
      expectedTerms: ["Clemens", "engineer", "vision"]
    }
  ];
  
  for (const { query, expectedTerms } of queries) {
    totalTests++;
    try {
      if (await testQuery(query, expectedTerms)) {
        successCount++;
      }
    } catch (error) {
      console.log('   ❌ Query failed:', error.message);
    }
    await wait(1000);
  }
  
  // Test 7: OpenAI Fallback
  totalTests++;
  try {
    if (await testOpenAIFallback()) {
      successCount++;
    }
  } catch (error) {
    console.log('   ❌ OpenAI fallback failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${totalTests - successCount}`);
  console.log(`Success Rate: ${Math.round(successCount/totalTests * 100)}%`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! The RAG system is working correctly!');
  } else if (successCount > totalTests / 2) {
    console.log('\n⚠️  PARTIAL SUCCESS - Some features are working');
  } else {
    console.log('\n❌ TESTS FAILED - The system needs debugging');
  }
  
  console.log('\n📱 Manual Testing:');
  console.log('1. Go to https://conversai-tau.vercel.app');
  console.log('2. Select "RAG System (Production)" mode');
  console.log('3. Click the microphone and ask about Clemens');
  console.log('4. You should hear the answer with ElevenLabs voice!');
}

runCompleteTest().catch(console.error);