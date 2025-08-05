import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EmbeddingService } from '@/lib/services/embeddings/embeddingService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, limit = 20, threshold = 0.7, searchType = 'semantic' } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let results;

    if (searchType === 'semantic') {
      try {
        // Semantic search using embeddings
        results = await EmbeddingService.searchBySimilarity(
          user.id,
          query,
          limit,
          threshold
        );
      } catch (semanticError: any) {
        console.error('Semantic search error:', semanticError);
        
        // Check if it's a missing function error
        if (semanticError.message?.includes('function') || semanticError.code === '42883') {
          return NextResponse.json({
            error: 'Database migration required',
            details: 'The semantic search feature requires database migrations to be applied. Please run the Phase 2 migration in your Supabase SQL editor.',
            migrationPath: 'supabase/migrations/20240103_vector_search_functions.sql',
            fallbackToText: true
          }, { status: 503 });
        }
        
        throw semanticError;
      }
    } else {
      // Fallback to text search
      const { data, error } = await supabase.rpc('search_user_conversations', {
        p_user_id: user.id,
        p_search_term: query,
      });

      if (error) {
        // Check if it's a missing function error for text search
        if (error.message?.includes('function') || error.code === '42883') {
          return NextResponse.json({
            error: 'Database migration required',
            details: 'The search feature requires database migrations to be applied. Please check the migration files.',
            migrationPath: 'supabase/migrations/add_user_profile_data.sql'
          }, { status: 503 });
        }
        throw error;
      }

      results = data || [];
    }

    return NextResponse.json({
      results,
      query,
      searchType,
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Find similar conversations
    const similarConversations = await EmbeddingService.findSimilarConversations(
      user.id,
      conversationId,
      5
    );

    return NextResponse.json({
      conversationId,
      similarConversations,
    });
  } catch (error) {
    console.error('Similar conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to find similar conversations' },
      { status: 500 }
    );
  }
}