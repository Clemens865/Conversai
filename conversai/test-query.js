#!/usr/bin/env node

async function testQuery() {
  console.log('🔍 Testing RAG query endpoint...\n');
  
  const queries = [
    "Wer ist Clemens Hönig?",
    "Tell me about Clemens",
    "What is his background?",
    "Graz Austria 1979"
  ];
  
  for (const query of queries) {
    console.log(`📝 Query: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:3030/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          limit: 3,
          tags: ["test", "biography", "personal", "clemens"]
        })
      });
      
      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        if (text) console.log(`   Response: ${text}`);
      } else {
        const data = await response.json();
        console.log(`   ✅ Found ${data.chunks?.length || 0} results`);
        
        if (data.chunks && data.chunks.length > 0) {
          data.chunks.forEach((chunk, i) => {
            console.log(`\n   Result ${i + 1}:`);
            console.log(`   Score: ${chunk.score?.toFixed(3)}`);
            console.log(`   Content: ${chunk.content.substring(0, 100)}...`);
          });
        } else {
          console.log('   No results found');
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

testQuery();