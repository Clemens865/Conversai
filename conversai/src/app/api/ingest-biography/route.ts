import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read the actual biography content from the markdown file
function getBiographyContent(): string {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'lebensgeschichte_clemens_hoenig.md');
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading biography file:', error);
    // Fallback content if file can't be read
    return `
Biografie von Clemens Hönig
Persönliche Daten
Name: Clemens Hönig
Geburtsjahr: 1979
Geburtsort: Graz, Österreich

Familie
Mutter: Doris Hoenig - Hautärztin mit eigener Ordination in Graz
Vater: Manfred Hönig - Beamter, zuständig für Straßen- und Brückenbau bei der Stadt Graz
Bruder: Julian Hönig - Geboren 11. September 1976, Design FH Graz, Karriere bei Audi, Lamborghini, über 10 Jahre bei Apple als Exterior Designer

Beruflicher Werdegang
- New Sports, Graz: Mitarbeit während Schulzeit und Studium
- Salomon Snowboards: Technischer Repräsentant für Ostösterreich  
- emotion Management, Graz: Projektarbeit für S-Tennis Masters, MTB-Weltcup
- C-Motion, Wien: Über 10 Jahre in der Filmindustrie, Aufbau von Focus Puller at Work
- Seit Januar 2025: Intelligence- & Marketing Operations Manager bei Yorizon GmbH

Über Yorizon
Joint Venture von Hochtief & Thomas-Krenn, europäischer Cloud-Infrastruktur-Anbieter

Technische Weiterbildung
3D (Blender), KI, LLMs, Coding Assistants

Eigene Familie
Ehefrau: Karin Schwarz - Geboren 26. April 1983, Studium der Kunstwissenschaften
Tochter: Clara Hönig - Geboren 12. August 2015
`;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting biography ingestion...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL;
    const supabaseKey = process.env.CONVERSAI_SUPABASE_SERVICE_KEY || 
                       process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the actual biography content
    const BIOGRAPHY_CONTENT = getBiographyContent();
    console.log('Biography content loaded, length:', BIOGRAPHY_CONTENT.length);
    
    // First, clear existing biography chunks to avoid duplicates
    console.log('Clearing existing biography chunks...');
    const { error: deleteError } = await supabase
      .from('chunks')
      .delete()
      .like('metadata->>source', '%biography%')
      .or('metadata->>source.like.%lebensgeschichte%,section.ilike.%clemens%');
    
    if (deleteError) {
      console.error('Error clearing existing chunks:', deleteError);
    }
    
    // Create a document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        source_type: 'md',
        source_uri: 'lebensgeschichte_clemens_hoenig.md',
        content_sha256: Buffer.from(BIOGRAPHY_CONTENT).toString('base64').substring(0, 64),
        tags: ['biography', 'clemens', 'personal', 'lebensgeschichte'],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (docError) {
      console.error('Document insert error:', docError);
      // Continue anyway, document might already exist
    }
    
    const documentId = document?.id || 'biography-' + Date.now();
    
    // Split content into meaningful chunks by sections
    const chunks = [];
    const sections = [];
    let currentSection = { title: 'Introduction', content: '' };
    
    // Parse the biography into sections based on the format
    const lines = BIOGRAPHY_CONTENT.split('\n');
    const sectionHeaders = ['Persönliche Daten', 'Familie', 'Kindheit und Schulzeit', 'Studium', 
                           'Beruflicher Werdegang', 'Eigene Familie', 'Über Yorizon'];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header
      if (sectionHeaders.some(header => trimmedLine.startsWith(header))) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        // Start new section
        currentSection = { title: trimmedLine, content: '' };
      } else if (trimmedLine) {
        // Add line to current section
        currentSection.content += line + '\n';
      }
    }
    
    // Don't forget the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    // Create chunks from sections
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const content = section.content.trim();
      
      if (!content || content.length < 20) continue;
      
      // Generate embedding using OpenAI
      const embedding = await generateEmbedding(content);
      
      chunks.push({
        document_id: documentId,
        content: content,
        content_tokens: Math.ceil(content.length / 4),
        section: section.title,
        metadata: {
          title: section.title,
          source: 'lebensgeschichte_clemens_hoenig.md',
          chunk_index: i,
          type: 'biography',
          person: 'Clemens Hönig',
          topics: extractTopics(content)
        },
        embedding: embedding,
        created_at: new Date().toISOString()
      });
    }
    
    console.log(`Inserting ${chunks.length} chunks...`);
    
    // Insert chunks in smaller batches to avoid size limits
    const batchSize = 5;
    let totalInserted = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const { data: insertedChunks, error: chunkError } = await supabase
        .from('chunks')
        .insert(batch)
        .select();
      
      if (chunkError) {
        console.error('Chunk insert error:', chunkError);
        // Continue with next batch
      } else {
        totalInserted += insertedChunks?.length || 0;
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedChunks?.length} chunks`);
      }
    }
    
    // Verify insertion
    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total chunks in database after ingestion: ${count}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully ingested biography with ${totalInserted} chunks`,
      chunks_created: totalInserted,
      total_chunks_in_db: count
    });
    
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest biography', details: error },
      { status: 500 }
    );
  }
}

// Helper function to extract topics from content
function extractTopics(content: string): string[] {
  const topics = [];
  const contentLower = content.toLowerCase();
  
  // Companies and work
  if (contentLower.includes('yorizon')) topics.push('Yorizon');
  if (contentLower.includes('new sports')) topics.push('New Sports');
  if (contentLower.includes('salomon')) topics.push('Salomon Snowboards');
  if (contentLower.includes('c-motion')) topics.push('C-Motion');
  if (contentLower.includes('focus puller')) topics.push('Focus Puller at Work');
  if (contentLower.includes('kakaduu')) topics.push('Kakaduu');
  if (contentLower.includes('emotion management')) topics.push('emotion Management');
  if (contentLower.includes('steinhalle')) topics.push('Steinhalle Lannach');
  
  // Technical topics
  if (contentLower.includes('ai') || contentLower.includes('llm') || contentLower.includes('künstliche intelligenz')) topics.push('AI');
  if (contentLower.includes('blender') || contentLower.includes('3d')) topics.push('3D');
  if (contentLower.includes('coding')) topics.push('Programming');
  
  // Personal
  if (contentLower.includes('karin')) topics.push('Familie');
  if (contentLower.includes('clara')) topics.push('Familie');
  if (contentLower.includes('graz')) topics.push('Graz');
  if (contentLower.includes('wien')) topics.push('Wien');
  if (contentLower.includes('snowboard') || contentLower.includes('skateboard')) topics.push('Sport');
  
  // Education
  if (contentLower.includes('sportwissenschaften')) topics.push('Sportwissenschaften');
  if (contentLower.includes('gymnasium')) topics.push('Bildung');
  
  return topics;
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.log('OpenAI API key not configured, returning null embedding');
      return null;
    }
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });
    
    if (!response.ok) {
      console.error('Embedding generation failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL;
  const supabaseKey = process.env.CONVERSAI_SUPABASE_SERVICE_KEY || 
                     process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { count } = await supabase
    .from('chunks')
    .select('*', { count: 'exact', head: true });
  
  return NextResponse.json({
    status: 'ready',
    chunks_in_database: count,
    biography_endpoint: '/api/ingest-biography'
  });
}