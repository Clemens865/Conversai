import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SummarizationService } from '@/lib/services/conversation/summarizationService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, batch = false, conversationIds = [] } = body;

    if (!batch && !conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (batch && (!conversationIds || conversationIds.length === 0)) {
      return NextResponse.json(
        { error: 'Conversation IDs are required for batch processing' },
        { status: 400 }
      );
    }

    // Verify user owns the conversation(s)
    const conversationsToCheck = batch ? conversationIds : [conversationId];
    const { data: conversations, error: verifyError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .in('id', conversationsToCheck);

    if (verifyError || !conversations || conversations.length !== conversationsToCheck.length) {
      return NextResponse.json(
        { error: 'Invalid conversation ID(s) or unauthorized access' },
        { status: 403 }
      );
    }

    if (batch) {
      // Batch summarization
      const summaries = await SummarizationService.batchSummarize(conversationIds);
      
      return NextResponse.json({
        success: true,
        summaries: Object.fromEntries(summaries),
        processed: summaries.size,
        total: conversationIds.length,
      });
    } else {
      // Single conversation summarization
      const summary = await SummarizationService.summarizeConversation(conversationId);
      
      return NextResponse.json({
        success: true,
        conversationId,
        summary,
      });
    }
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { 
        error: 'Summarization failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
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
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get conversation summary and topics
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        summary,
        created_at,
        conversation_topics (
          topic,
          relevance_score
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversationId: conversation.id,
      title: conversation.title,
      summary: conversation.summary,
      topics: conversation.conversation_topics
        .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
        .map((t: any) => t.topic),
      created_at: conversation.created_at,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: 'Failed to get summary' },
      { status: 500 }
    );
  }
}