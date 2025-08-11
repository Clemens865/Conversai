import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_URL;
    const supabaseKey = process.env.CONVERSAI_SUPABASE_SERVICE_KEY || 
                       process.env.NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get chunk count
    const { count: totalChunks } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true });
    
    // Get sample chunks
    const { data: sampleChunks, error: chunkError } = await supabase
      .from('chunks')
      .select('id, content, section, metadata')
      .limit(5);
    
    // Test text search for "Clemens"
    const { data: clemenSearch } = await supabase
      .from('chunks')
      .select('content, metadata')
      .textSearch('content', 'Clemens')
      .limit(3);
    
    // Test text search for "Yorizon"
    const { data: yorizonSearch } = await supabase
      .from('chunks')
      .select('content, metadata')
      .textSearch('content', 'Yorizon')
      .limit(3);
    
    // Test text search for "Robotic"
    const { data: roboticSearch } = await supabase
      .from('chunks')
      .select('content, metadata')
      .textSearch('content', 'Robotic')
      .limit(3);
    
    // Get chunks with biography metadata
    const { data: biographyChunks } = await supabase
      .from('chunks')
      .select('content, metadata')
      .like('metadata->>type', '%biography%')
      .limit(3);
    
    return NextResponse.json({
      database_status: {
        total_chunks: totalChunks,
        has_data: totalChunks > 0
      },
      sample_chunks: sampleChunks?.map(c => ({
        id: c.id,
        section: c.section,
        content_preview: c.content?.substring(0, 100) + '...',
        metadata: c.metadata
      })),
      search_tests: {
        clemens_found: clemenSearch?.length || 0,
        yorizon_found: yorizonSearch?.length || 0,
        robotic_found: roboticSearch?.length || 0,
        biography_chunks: biographyChunks?.length || 0
      },
      search_results: {
        clemens: clemenSearch?.map(c => c.content?.substring(0, 100) + '...'),
        yorizon: yorizonSearch?.map(c => c.content?.substring(0, 100) + '...'),
        robotic: roboticSearch?.map(c => c.content?.substring(0, 100) + '...')
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error 
    });
  }
}