#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testEmbeddings() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log('✅ OpenAI API Key found:', apiKey.substring(0, 10) + '...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: ['Test embedding for ConversAI RAG system'],
        model: 'text-embedding-ada-002'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI API error:', response.status, error);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('✅ Embedding successful!');
    console.log('  - Model:', data.model);
    console.log('  - Dimensions:', data.data[0].embedding.length);
    console.log('  - First 5 values:', data.data[0].embedding.slice(0, 5));
    
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error.message);
    process.exit(1);
  }
}

testEmbeddings();