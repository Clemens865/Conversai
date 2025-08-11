#!/usr/bin/env node

// Direct ingestion script for Clemens's biography
const fs = require('fs');

// Read the biography
const biographyContent = fs.readFileSync('conversai/docs/lebensgeschichte_clemens_hoenig.md', 'utf8');

// Split into meaningful chunks (by sections and paragraphs)
const sections = biographyContent.split(/\n#{1,3}\s+/).filter(s => s.trim());
const chunks = [];

// Create chunks from sections
sections.forEach(section => {
  // Split long sections into smaller paragraphs
  const paragraphs = section.split(/\n\n+/).filter(p => p.trim().length > 50);
  
  paragraphs.forEach(paragraph => {
    // Clean up the text
    const cleanText = paragraph.replace(/\n/g, ' ').trim();
    if (cleanText.length > 30) {
      chunks.push(cleanText);
    }
  });
});

console.log(`📚 Preparing to ingest ${chunks.length} chunks from biography`);

// Create the ingestion payload
const payload = {
  endpoint: 'ingest',
  data: {
    source_type: 'md',
    source_uri: 'lebensgeschichte_clemens_hoenig.md',
    content: biographyContent, // Send full content, will be chunked server-side
    metadata: {
      title: 'Biography of Clemens Hoenig',
      author: 'Clemens Hoenig',
      topic: 'Personal Biography',
      keywords: [
        'Clemens', 'Hoenig', 'Yorizon', 'Robotic Eyes', 
        'computer vision', 'robotics', 'Matterport',
        'Vienna', 'Austria', 'AI', 'technology'
      ]
    }
  }
};

// Send to proxy endpoint
fetch('https://conversai-tau.vercel.app/api/rag-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => {
  console.log('✅ Ingestion response:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log(`\n🎉 Successfully ingested ${data.chunks_created} chunks!`);
    console.log('\n🎯 Now you can ask questions like:');
    console.log('  - "What did Clemens do at Yorizon?"');
    console.log('  - "Tell me about Robotic Eyes"');
    console.log('  - "What is Clemens\'s background?"');
  } else if (data.answer) {
    console.log('\n⚠️  Received a query response instead of ingestion confirmation.');
    console.log('This might mean the chunks are already in the database.');
  }
})
.catch(error => {
  console.error('❌ Error during ingestion:', error);
});