import { OpenAI } from 'openai';
import { createClient } from '@/lib/supabase/server';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export class EmbeddingService {
  /**
   * Generate embedding for a text using OpenAI
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await getOpenAIClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Store embedding for a message
   */
  static async storeMessageEmbedding(
    messageId: string,
    embedding: number[]
  ): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('message_embeddings')
      .upsert({
        message_id: messageId,
        embedding: embedding,
      }, {
        onConflict: 'message_id'
      });

    if (error) {
      console.error('Error storing embedding:', error);
      throw new Error('Failed to store embedding');
    }
  }

  /**
   * Generate and store embedding for a message
   */
  static async processMessage(
    messageId: string,
    content: string
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      await this.storeMessageEmbedding(messageId, embedding);
    } catch (error) {
      console.error('Error processing message for embedding:', error);
      // Don't throw - we don't want to break message creation
    }
  }

  /**
   * Search messages by semantic similarity
   */
  static async searchBySimilarity(
    userId: string,
    query: string,
    limit: number = 20,
    similarityThreshold: number = 0.7
  ): Promise<any[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const supabase = await createClient();

      const { data, error } = await supabase.rpc('search_messages_by_embedding', {
        p_user_id: userId,
        p_query_embedding: queryEmbedding,
        p_limit: limit,
        p_similarity_threshold: similarityThreshold,
      });

      if (error) {
        console.error('Error searching by similarity:', error);
        throw new Error('Search failed');
      }

      return data || [];
    } catch (error) {
      console.error('Error in similarity search:', error);
      throw error;
    }
  }

  /**
   * Find similar conversations
   */
  static async findSimilarConversations(
    userId: string,
    conversationId: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase.rpc('find_similar_conversations', {
        p_user_id: userId,
        p_conversation_id: conversationId,
        p_limit: limit,
      });

      if (error) {
        console.error('Error finding similar conversations:', error);
        throw new Error('Failed to find similar conversations');
      }

      return data || [];
    } catch (error) {
      console.error('Error in finding similar conversations:', error);
      throw error;
    }
  }

  /**
   * Batch process messages without embeddings
   */
  static async backfillEmbeddings(userId: string): Promise<void> {
    const supabase = await createClient();

    // Get messages without embeddings
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        conversation_id,
        conversations!inner(user_id)
      `)
      .eq('conversations.user_id', userId)
      .is('message_embeddings.id', null);

    if (error) {
      console.error('Error fetching messages for backfill:', error);
      return;
    }

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await Promise.all(
        batch.map(message => 
          this.processMessage(message.id, message.content)
        )
      );
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}