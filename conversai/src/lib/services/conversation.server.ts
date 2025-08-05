import { createClient } from '@/lib/supabase/server'
import { Message, Conversation } from '@/types/conversation'
import { EmbeddingService } from './embeddings/embeddingService'
import { ContextManager } from './memory/contextManager'
import { SummarizationService } from './conversation/summarizationService'

export class ConversationServiceServer {
  async createConversation(userId: string, title?: string, id?: string): Promise<Conversation | null> {
    const supabase = await createClient()
    
    // Get the authenticated user to ensure consistency
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('No authenticated user for conversation:', authError)
      return null
    }
    
    const insertData: any = {
      user_id: user.id, // Always use authenticated user's ID
      title: title || 'New Conversation'
    }
    
    // Allow specifying a custom ID
    if (id) {
      insertData.id = id
    }
    
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }

    return {
      id: data.id,
      title: data.title || 'New Conversation',
      messages: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  async addMessage(
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string,
    audioUrl?: string
  ): Promise<Message | null> {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('No authenticated user for message:', authError)
      return null
    }
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
        audio_url: audioUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding message:', error)
      return null
    }

    // Process message for embeddings and context (non-blocking)
    this.processMessageInBackground(data.id, conversationId, content, role).catch(err => {
      console.error('Background processing error:', err)
    })

    return {
      id: data.id,
      role: data.role as 'user' | 'assistant',
      content: data.content,
      timestamp: new Date(data.created_at),
      audioUrl: data.audio_url || undefined
    }
  }

  private async processMessageInBackground(
    messageId: string,
    conversationId: string,
    content: string,
    role: string
  ): Promise<void> {
    try {
      // Generate embedding for semantic search
      await EmbeddingService.processMessage(messageId, content)
      
      // Update context with new message
      await ContextManager.updateContextAfterMessage(
        messageId,
        conversationId,
        content,
        role
      )
      
      // Check if we should generate/update conversation summary
      if (role === 'user') {
        const supabase = await createClient()
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
        
        // Generate summary after every 10 messages
        if (count && count > 0 && count % 10 === 0) {
          await SummarizationService.summarizeConversation(conversationId)
        }
      }
    } catch (error) {
      console.error('Error in background processing:', error)
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const supabase = await createClient()
    
    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select()
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError)
      return null
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select()
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return null
    }

    return {
      id: conversation.id,
      title: conversation.title || 'Conversation',
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        audioUrl: msg.audio_url || undefined
      })),
      createdAt: new Date(conversation.created_at),
      updatedAt: new Date(conversation.updated_at)
    }
  }

  async getEnhancedContext(
    userId: string,
    conversationId: string,
    currentQuery?: string
  ): Promise<any> {
    return await ContextManager.buildConversationContext(
      userId,
      conversationId,
      currentQuery
    )
  }

  async searchConversations(
    userId: string,
    query: string,
    options: {
      limit?: number
      searchType?: 'semantic' | 'text'
      threshold?: number
    } = {}
  ): Promise<any[]> {
    const { limit = 20, searchType = 'semantic', threshold = 0.7 } = options

    if (searchType === 'semantic') {
      return await EmbeddingService.searchBySimilarity(
        userId,
        query,
        limit,
        threshold
      )
    } else {
      const supabase = await createClient()
      const { data, error } = await supabase.rpc('search_user_conversations', {
        p_user_id: userId,
        p_search_term: query,
      })

      if (error) {
        console.error('Search error:', error)
        return []
      }

      return data || []
    }
  }

  async getUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Conversation[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        summary,
        created_at,
        updated_at,
        messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    return data.map(conv => ({
      id: conv.id,
      title: conv.title || 'Untitled Conversation',
      summary: conv.summary,
      messages: conv.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      })),
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at)
    }))
  }

  async backfillEmbeddings(userId: string): Promise<void> {
    await EmbeddingService.backfillEmbeddings(userId)
  }
}