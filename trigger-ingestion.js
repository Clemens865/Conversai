#!/usr/bin/env node

// Script to trigger biography ingestion via the dedicated endpoint

console.log('📚 Triggering Biography Ingestion');
console.log('==================================\n');

async function ingestBiography() {
  try {
    // First check the status
    console.log('Checking database status...');
    const statusResponse = await fetch('https://conversai-tau.vercel.app/api/ingest-biography');
    const status = await statusResponse.json();
    console.log('Current status:', status);
    
    // Trigger ingestion
    console.log('\nTriggering ingestion...');
    const response = await fetch('https://conversai-tau.vercel.app/api/ingest-biography', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ SUCCESS!');
      console.log(`   - Chunks created: ${result.chunks_created}`);
      console.log(`   - Total chunks in DB: ${result.total_chunks_in_db}`);
      console.log(`   - Message: ${result.message}`);
      
      console.log('\n🎯 Now you can test with questions like:');
      console.log('   - "What did Clemens do at Yorizon?"');
      console.log('   - "Tell me about Robotic Eyes"');
      console.log('   - "What is Clemens\'s expertise?"');
      console.log('   - "What projects is Clemens working on?"');
      
      console.log('\n📱 Test it at: https://conversai-tau.vercel.app');
      console.log('   1. Select "RAG System (Production)" mode');
      console.log('   2. Click the microphone and ask your question');
      console.log('   3. You should get specific answers from the biography!');
    } else {
      console.log('\n⚠️  Ingestion may have failed:');
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure the deployment is complete on Vercel.');
    console.log('Check: https://vercel.com/clemens865s-projects/conversai/deployments');
  }
}

// Wait a moment for deployment to complete
console.log('Waiting 10 seconds for Vercel deployment to complete...\n');
setTimeout(() => {
  ingestBiography();
}, 10000);