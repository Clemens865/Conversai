#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL,
  process.env.CONVERSAI_SUPABASE_SERVICE_KEY
);

// Simple markdown parser to extract sections
function parseMarkdownSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = { heading: 'Introduction', content: '', level: 0 };
  
  for (const line of lines) {
    const h1Match = line.match(/^# (.+)/);
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);
    
    if (h1Match || h2Match || h3Match) {
      // Save previous section if it has content
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      
      // Start new section
      currentSection = {
        heading: h1Match ? h1Match[1] : h2Match ? h2Match[1] : h3Match[1],
        content: '',
        level: h1Match ? 1 : h2Match ? 2 : 3
      };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  // Add last section
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Chunk text into smaller pieces
function chunkText(text, maxChars = 800) {
  const chunks = [];
  const sentences = text.split(/[.!?]\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Generate embeddings using OpenAI
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002'
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function ingestBiography() {
  console.log('🚀 Ingesting Biography into ConversAI RAG System');
  console.log('=' + '='.repeat(50) + '\n');
  
  // Read the markdown file
  const filePath = path.join(__dirname, 'docs', 'lebensgeschichte_clemens_hoenig.md');
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📖 Read file:', filePath);
  console.log('   Size:', content.length, 'characters\n');
  
  // Calculate SHA256
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  
  // Check if document already exists
  const { data: existing } = await supabase
    .from('documents')
    .select('*')
    .eq('content_sha256', sha256)
    .single();
  
  if (existing) {
    console.log('⚠️  Document already exists with ID:', existing.id);
    console.log('   Skipping ingestion to avoid duplicates.\n');
    return;
  }
  
  // Insert document
  console.log('📄 Creating document record...');
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      source_type: 'md',
      source_uri: 'storage://lebensgeschichte_clemens_hoenig.md',
      content_sha256: sha256,
      tags: ['biography', 'personal', 'clemens', 'family', 'career']
    })
    .select()
    .single();
  
  if (docError) {
    console.error('❌ Failed to insert document:', docError);
    return;
  }
  
  console.log('✅ Document created:', doc.id);
  
  // Parse markdown into sections
  console.log('\n📝 Processing content...');
  const sections = parseMarkdownSections(content);
  console.log('   Found', sections.length, 'sections');
  
  // Process each section
  let totalChunks = 0;
  let successfulChunks = 0;
  
  for (const section of sections) {
    console.log(`\n   Processing: ${section.heading}`);
    
    // Chunk the section content
    const chunks = chunkText(section.content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      totalChunks++;
      
      // Skip very short chunks
      if (chunkContent.length < 50) continue;
      
      process.stdout.write(`      Chunk ${i + 1}/${chunks.length}: `);
      
      // Generate embedding
      const embedding = await generateEmbedding(chunkContent);
      
      if (!embedding) {
        console.log('❌ Failed to generate embedding');
        continue;
      }
      
      // Insert chunk with embedding
      const { error: chunkError } = await supabase
        .from('chunks')
        .insert({
          document_id: doc.id,
          content: chunkContent,
          content_tokens: Math.ceil(chunkContent.length / 4), // Rough estimate
          section: section.heading,
          span: {
            section_level: section.level,
            chunk_index: i,
            total_chunks: chunks.length
          },
          metadata: {
            heading_path: [section.heading],
            source_file: 'lebensgeschichte_clemens_hoenig.md'
          },
          embedding: embedding
        });
      
      if (chunkError) {
        console.log('❌ Failed to insert');
        console.error('   Error:', chunkError.message);
      } else {
        console.log('✅');
        successfulChunks++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n' + '=' + '='.repeat(50));
  console.log('✅ INGESTION COMPLETE');
  console.log('=' + '='.repeat(50));
  console.log(`
📊 Summary:
   Document ID: ${doc.id}
   Total chunks: ${totalChunks}
   Successful: ${successfulChunks}
   Success rate: ${Math.round(successfulChunks/totalChunks * 100)}%
   
🔍 You can now query the system about:
   - Clemens Hönig's biography
   - His family (Karin, Clara)
   - Career history
   - Education
   - Life in Graz and Vienna
   
💡 Test query example:
   "Who is Clemens Hönig?"
   "Tell me about his work at Yorizon"
   "What is his family like?"
`);
}

// Run the ingestion
ingestBiography().catch(console.error);