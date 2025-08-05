import { createClient } from '@/lib/supabase/client';
import { Message } from '@/types/conversation';
import { OpenAIService } from '@/lib/services/ai/openai';

export interface MemorySearchResult {
  message: Message;
  conversation_id: string;
  conversation_title: string;
  similarity?: number;
}

export class MemoryManager {
  private supabase: ReturnType<typeof createClient>;
  private openAIService: OpenAIService | null = null;
  private contextWindowSize: number = 10; // Last N messages to keep in context

  constructor() {
    this.supabase = createClient();
  }

  setOpenAIService(service: OpenAIService) {
    this.openAIService = service;
  }

  async getRecentContext(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(this.contextWindowSize);

    if (error) {
      console.error('Error fetching recent context:', error);
      return [];
    }

    // Reverse to get chronological order
    return data.reverse().map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.created_at),
      audioUrl: msg.audio_url,
    }));
  }

  async searchMemory(query: string, userId: string, limit: number = 5): Promise<MemorySearchResult[]> {
    // For MVP, use simple keyword search
    // TODO: In Phase 2, implement vector similarity search
    
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        conversations!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('conversations.user_id', userId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Memory search error:', error);
      return [];
    }

    return data.map(msg => ({
      message: {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        audioUrl: msg.audio_url,
      },
      conversation_id: msg.conversations.id,
      conversation_title: msg.conversations.title || 'Untitled Conversation',
    }));
  }

  async searchMemoryBySimilarity(
    query: string, 
    userId: string, 
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    if (!this.openAIService) {
      console.warn('OpenAI service not set, falling back to keyword search');
      return this.searchMemory(query, userId, limit);
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.openAIService.generateEmbedding(query);

      // For Phase 2: Use pgvector similarity search
      // For now, return empty array as embeddings aren't stored yet
      console.log('Vector search will be implemented in Phase 2');
      return [];
    } catch (error) {
      console.error('Similarity search error:', error);
      return this.searchMemory(query, userId, limit);
    }
  }

  async summarizeConversation(conversationId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return 'No conversation to summarize';
    }

    // Create a simple summary based on message count and topics
    const messageCount = data.length;
    const userMessages = data.filter(m => m.role === 'user').map(m => m.content);
    
    // Extract key topics (simple approach for MVP)
    const topics = this.extractKeyTopics(userMessages.join(' '));
    
    return `Conversation with ${messageCount} messages discussing: ${topics.join(', ')}`;
  }

  private extractKeyTopics(text: string): string[] {
    // Simple keyword extraction for MVP
    // TODO: Use more sophisticated NLP in production
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 3 && !commonWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Get top 3 most frequent words as topics
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation title:', error);
    }
  }
}