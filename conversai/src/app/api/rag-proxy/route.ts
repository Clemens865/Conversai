import { NextRequest, NextResponse } from 'next/server';

// This proxy route bypasses CORS by making server-side requests to Railway
// It allows the frontend to access the Railway RAG service without CORS issues

const RAILWAY_SERVICE_URL = process.env.NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL || 
                            'https://conversai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const endpoint = body.endpoint || 'query'; // Default to query endpoint
    
    console.log(`Proxying request to Railway: ${RAILWAY_SERVICE_URL}/api/${endpoint}`);
    console.log('Request endpoint:', endpoint);
    console.log('Request has data:', !!body.data);
    
    // Handle ingestion endpoint differently
    if (endpoint === 'ingest') {
      console.log('Processing ingestion request');
      // For ingestion, try Railway first, then fallback to direct database insert
      const response = await fetch(`${RAILWAY_SERVICE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body.data || body),
      });

      if (response.status === 502 || response.status === 503 || !response.ok) {
        console.log('Railway unavailable for ingestion, using direct database insert');
        return await directDatabaseIngest(body.data || body);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }
    
    // Handle query endpoint
    console.log('Processing query request');
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers here
      },
      body: JSON.stringify(body.data || body),
    });

    // Check if Railway service is responding
    if (response.status === 502 || response.status === 503) {
      console.log('Railway service unavailable (502/503), using database fallback');
      
      // Direct database query fallback
      // This uses your Supabase database directly
      return await directDatabaseQuery(body.query || body.data?.query);
    }

    if (!response.ok) {
      console.error(`Railway service error: ${response.status}`);
      // Try direct database query as fallback
      return await directDatabaseQuery(body.query || body.data?.query);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Final fallback: Try to query database directly
    try {
      const query = request.body ? (await request.json()).query : '';
      return await directDatabaseQuery(query);
    } catch (fallbackError) {
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          message: 'Both Railway service and database fallback failed'
        },
        { status: 503 }
      );
    }
  }
}

// Direct database query using Supabase (bypasses Railway entirely)
async function directDatabaseQuery(query: string): Promise<NextResponse> {
  console.log('Direct database query for:', query);
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL;
    const supabaseKey = process.env.CONVERSAI_SUPABASE_SERVICE_KEY || 
                       process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return NextResponse.json(
        { 
          answer: 'Database configuration error. Please check environment variables.',
          sources: [],
          mode: 'error'
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First, let's check if we have any data in the chunks table
    const { count } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total chunks in database:', count);
    
    // Generate embedding for the query using OpenAI
    const embedding = await generateEmbedding(query);
    
    if (!embedding) {
      console.log('No embedding generated, using text search');
      // Fallback to full-text search without embeddings
      const { data, error } = await supabase
        .from('chunks')
        .select('content, metadata, document_id')
        .textSearch('content', query)
        .limit(5);
      
      if (error) {
        console.error('Database query error:', error);
        throw error;
      }
      
      console.log('Text search results:', data?.length || 0, 'chunks found');
      
      const context = data?.map(doc => doc.content).join('\n\n') || '';
      const answer = await generateAnswer(query, context);
      
      return NextResponse.json({
        answer,
        sources: data?.map(doc => doc.metadata?.source || 'Database') || [],
        chunks: data || [],
        mode: 'database-text-search'
      });
    }
    
    // Use vector similarity search with the embedding
    const { data, error } = await supabase.rpc('hybrid_search', {
      query_text: query,
      query_embedding: embedding,
      match_count: 5,
      full_text_weight: 0.3,
      semantic_weight: 0.7,
      rrf_k: 60
    });
    
    if (error) {
      console.error('Hybrid search error:', error);
      // Fallback to simple text search
      const { data: textData } = await supabase
        .from('chunks')
        .select('content, metadata, document_id')
        .textSearch('content', query)
        .limit(5);
      
      const context = textData?.map(doc => doc.content).join('\n\n') || '';
      const answer = await generateAnswer(query, context);
      
      return NextResponse.json({
        answer,
        sources: textData?.map(doc => doc.metadata?.source || 'Database') || [],
        chunks: textData || [],
        mode: 'database-text-fallback'
      });
    }
    
    // Generate answer using retrieved context
    const context = data?.map(doc => doc.content).join('\n\n') || '';
    const answer = await generateAnswer(query, context);
    
    return NextResponse.json({
      answer,
      sources: data?.map(doc => doc.metadata?.source || 'Database') || [],
      chunks: data || [],
      confidence: 0.85,
      mode: 'database-direct'
    });
    
  } catch (error) {
    console.error('Direct database query error:', error);
    
    // Ultimate fallback with static knowledge
    return NextResponse.json({
      answer: `I cannot access the database right now, but based on general knowledge: Clemens Hoenig is a robotics expert and computer vision specialist who founded Robotic Eyes and worked at Yorizon on advanced AI systems.`,
      sources: ['Static Knowledge'],
      mode: 'static-fallback'
    });
  }
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.log('OpenAI API key not configured, skipping embedding generation');
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

// Generate answer using OpenAI or Claude
async function generateAnswer(query: string, context: string): Promise<string> {
  const prompt = `Based on the following context, answer the question. If the context doesn't contain relevant information, say so.

Context:
${context}

Question: ${query}

Answer:`;

  // Try OpenAI first
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that answers questions based on provided context.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('OpenAI answer generation failed:', error);
    }
  }
  
  // Fallback to basic response
  if (context) {
    return `Based on the available information: ${context.substring(0, 500)}...`;
  }
  
  return 'I could not find specific information about that in the database.';
}

// Direct database ingest function
async function directDatabaseIngest(data: any): Promise<NextResponse> {
  console.log('Direct database ingest for document');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
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
    
    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        source_type: data.source_type || 'md',
        source_uri: data.source_uri || 'unknown',
        content_sha256: Buffer.from(data.content || '').toString('base64').substring(0, 64),
        tags: data.metadata?.keywords || [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (docError) {
      console.error('Document insert error:', docError);
      throw docError;
    }
    
    // Split content into chunks (simple chunking by paragraphs)
    const paragraphs = (data.content || '').split('\n\n').filter((p: string) => p.trim());
    const chunks = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const content = paragraphs[i];
      if (content.length < 50) continue; // Skip very short chunks
      
      // Generate embedding for the chunk
      const embedding = await generateEmbedding(content);
      
      chunks.push({
        document_id: document.id,
        content: content,
        content_tokens: Math.ceil(content.length / 4), // Rough estimate
        section: data.metadata?.title || 'Biography',
        metadata: {
          ...data.metadata,
          chunk_index: i,
          source: data.source_uri
        },
        embedding: embedding,
        created_at: new Date().toISOString()
      });
    }
    
    // Insert chunks
    const { data: insertedChunks, error: chunkError } = await supabase
      .from('chunks')
      .insert(chunks)
      .select();
    
    if (chunkError) {
      console.error('Chunk insert error:', chunkError);
      throw chunkError;
    }
    
    return NextResponse.json({
      success: true,
      document_id: document.id,
      chunks_created: insertedChunks?.length || 0,
      message: `Successfully ingested document with ${insertedChunks?.length || 0} chunks`
    });
    
  } catch (error) {
    console.error('Direct ingest error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest document', details: error },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}