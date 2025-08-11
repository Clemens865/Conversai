import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Clemens's biography content
const BIOGRAPHY_CONTENT = `
# Lebensgeschichte von Clemens Hönig

## Frühe Jahre und Herkunft
Clemens Hönig wurde in Wien, Österreich geboren und wuchs in einer technologiebegeisterten Familie auf. Schon früh zeigte er großes Interesse an Computern und Robotik.

## Ausbildung und Studium
Nach dem Gymnasium studierte Clemens Informatik mit Schwerpunkt auf Computer Vision und Künstliche Intelligenz. Während seines Studiums spezialisierte er sich auf Bildverarbeitung und robotische Systeme.

## Karriere bei Robotic Eyes
Clemens gründete das Unternehmen Robotic Eyes, das sich auf innovative Computer Vision Lösungen spezialisierte. Als CEO und technischer Leiter entwickelte er bahnbrechende Technologien für:
- 3D-Rekonstruktion und Mapping
- Augmented Reality Anwendungen
- Robotische Navigationssysteme
- Industrielle Bildverarbeitung

Unter seiner Führung wuchs Robotic Eyes zu einem anerkannten Technologieunternehmen mit internationalen Kunden.

## Arbeit bei Yorizon
Nach dem erfolgreichen Exit von Robotic Eyes wechselte Clemens zu Yorizon (Your Horizon), wo er als Principal Engineer und AI-Spezialist tätig ist. Bei Yorizon arbeitet er an:
- Advanced AI Systems für Computer Vision
- Conversational AI und natürliche Sprachverarbeitung
- Integration von Large Language Models (LLMs) in praktische Anwendungen
- Entwicklung von RAG (Retrieval Augmented Generation) Systemen

Seine Arbeit bei Yorizon fokussiert sich besonders auf die Verbindung von Computer Vision mit modernen AI-Technologien.

## Technische Expertise
Clemens ist Experte in folgenden Bereichen:
- **Computer Vision**: 3D-Rekonstruktion, SLAM, Object Detection
- **Robotik**: Autonome Navigation, Sensor Fusion
- **Künstliche Intelligenz**: Deep Learning, Neural Networks, LLMs
- **Software Engineering**: Rust, Python, TypeScript, C++
- **Cloud & DevOps**: AWS, Docker, Kubernetes, Railway

## Aktuelle Projekte
Derzeit arbeitet Clemens an mehreren innovativen Projekten:
- **ConversAI**: Ein fortschrittliches Conversational AI System mit RAG-Technologie
- **Matterport Integration**: 3D-Scanning und digitale Zwillinge für Immobilien
- **AI-powered Vision Systems**: Neue Ansätze für intelligente Bildverarbeitung

## Persönliche Interessen
Neben seiner beruflichen Tätigkeit interessiert sich Clemens für:
- Open Source Software Entwicklung
- Mentoring von jungen Entwicklern
- Technologie-Trends und Innovation
- Fotografie und 3D-Visualisierung
`;

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
    
    // First, clear existing biography chunks to avoid duplicates
    console.log('Clearing existing biography chunks...');
    const { error: deleteError } = await supabase
      .from('chunks')
      .delete()
      .like('metadata->>source', '%biography%');
    
    if (deleteError) {
      console.error('Error clearing existing chunks:', deleteError);
    }
    
    // Create a document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        source_type: 'md',
        source_uri: 'clemens_biography.md',
        content_sha256: Buffer.from(BIOGRAPHY_CONTENT).toString('base64').substring(0, 64),
        tags: ['biography', 'clemens', 'personal'],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (docError) {
      console.error('Document insert error:', docError);
      // Continue anyway, document might already exist
    }
    
    const documentId = document?.id || 'biography-' + Date.now();
    
    // Split content into meaningful chunks
    const sections = BIOGRAPHY_CONTENT.split(/\n##\s+/).filter(s => s.trim());
    const chunks = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.length < 20) continue;
      
      // Extract section title and content
      const lines = section.split('\n');
      const title = lines[0].replace(/^#+\s*/, '');
      const content = lines.slice(1).join('\n').trim();
      
      if (!content) continue;
      
      // Generate embedding using OpenAI
      const embedding = await generateEmbedding(content);
      
      chunks.push({
        document_id: documentId,
        content: content,
        content_tokens: Math.ceil(content.length / 4),
        section: title,
        metadata: {
          title: title,
          source: 'clemens_biography.md',
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
  
  if (content.toLowerCase().includes('robotic eyes')) topics.push('Robotic Eyes');
  if (content.toLowerCase().includes('yorizon')) topics.push('Yorizon');
  if (content.toLowerCase().includes('computer vision')) topics.push('Computer Vision');
  if (content.toLowerCase().includes('ai') || content.toLowerCase().includes('artificial')) topics.push('AI');
  if (content.toLowerCase().includes('rust')) topics.push('Rust');
  if (content.toLowerCase().includes('matterport')) topics.push('Matterport');
  if (content.toLowerCase().includes('conversai')) topics.push('ConversAI');
  
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