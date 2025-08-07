import { EmbeddingService } from '../embeddings/embeddingService';
import { createClient } from '@/lib/supabase/server';
import { UserProfileService } from './userProfileService';
import { EntityExtractor } from './entityExtractor';
import { CategoryBatchingService } from './categoryBatchingService';

export interface ConversationContext {
  recentMessages: Array<{
    role: string;
    content: string;
    created_at: string;
  }>;
  relevantHistory: Array<{
    content: string;
    similarity_score: number;
    created_at: string;
  }>;
  topics: string[];
  summary?: string;
  userPreferences?: Record<string, any>;
}

export class ContextManager {
  private static readonly RECENT_MESSAGE_COUNT = 10;
  private static readonly RELEVANT_HISTORY_COUNT = 5;
  private static readonly CONTEXT_SIMILARITY_THRESHOLD = 0.4; // Lowered based on semantic similarity analysis

  /**
   * Build comprehensive context for a conversation
   */
  static async buildConversationContext(
    userId: string,
    conversationId: string,
    currentQuery?: string
  ): Promise<ConversationContext> {
    const supabase = await createClient();

    // Check if this is a name query and handle it specially
    if (currentQuery) {
      const userName = await UserProfileService.handleNameQuery(userId, currentQuery);
      if (userName) {
        // If we found the name in user profile, create a synthetic context
        return {
          recentMessages: [],
          relevantHistory: [{
            content: `My name is ${userName}`,
            similarity_score: 1.0,
            created_at: new Date().toISOString()
          }],
          topics: ['personal information', 'name'],
          summary: `The user's name is ${userName}`,
          userPreferences: { name: userName },
        };
      }
    }

    // Fetch recent messages
    const recentMessages = await this.getRecentMessages(conversationId);

    // Fetch relevant history if current query provided
    let relevantHistory: any[] = [];
    if (currentQuery) {
      relevantHistory = await this.getRelevantHistory(userId, currentQuery);
    }

    // Fetch conversation topics
    const topics = await this.getConversationTopics(conversationId);

    // Fetch conversation summary
    const summary = await this.getConversationSummary(conversationId);

    // Fetch user preferences (including profile data)
    const userPreferences = await this.getUserPreferences(userId);
    
    // Get user profile data
    const userProfile = await UserProfileService.getUserProfile(userId);
    if (userProfile) {
      userPreferences.name = userProfile.name;
      userPreferences.facts = userProfile.facts;
    }

    // Get category batches for enriched context
    if (currentQuery) {
      const categoryBatches = await CategoryBatchingService.retrieveCategoryBatches(
        userId, 
        currentQuery, 
        2
      );
      
      // Add category context to the relevant history
      for (const batch of categoryBatches) {
        if (batch.facts.length > 0) {
          // Format facts nicely for context
          const factsText = batch.facts.map((fact: any) => {
            if (fact.type === 'pet' && fact.value) {
              return `${fact.value.name} (${fact.value.species})`;
            }
            return `${fact.type}: ${JSON.stringify(fact.value)}`;
          }).join(', ');
          
          relevantHistory.push({
            content: `User has ${batch.categoryName.toLowerCase()}: ${factsText}`,
            similarity_score: 0.95, // Very high score for category matches
            created_at: new Date().toISOString()
          });
        }
      }
    }

    return {
      recentMessages,
      relevantHistory,
      topics,
      summary,
      userPreferences,
    };
  }

  /**
   * Get recent messages from the conversation
   */
  private static async getRecentMessages(
    conversationId: string
  ): Promise<any[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(this.RECENT_MESSAGE_COUNT);

    if (error) {
      console.error('Error fetching recent messages:', error);
      return [];
    }

    // Reverse to get chronological order
    return (data || []).reverse();
  }

  /**
   * Get relevant historical messages using semantic search
   */
  private static async getRelevantHistory(
    userId: string,
    query: string
  ): Promise<any[]> {
    try {
      // For name-related queries, search for actual name statements
      let searchQuery = query;
      const lowerQuery = query.toLowerCase();
      
      // Detect various ways of asking about name
      if (lowerQuery.includes('my name') || 
          lowerQuery.includes('what\'s my name') ||
          lowerQuery.includes('do you know my name') ||
          lowerQuery.includes('remember my name') ||
          lowerQuery.includes('who am i') ||
          lowerQuery.includes('what am i called')) {
        // Search for messages where the user likely shared their name
        searchQuery = "my name is";
        console.log(`[ContextManager] Name query detected: "${query}" -> searching for: "${searchQuery}"`);
      }
      
      // Get more results initially to filter duplicates
      const results = await EmbeddingService.searchBySimilarity(
        userId,
        searchQuery,
        this.RELEVANT_HISTORY_COUNT * 3, // Get 3x to filter
        0.4 // Lowered threshold based on similarity analysis
      );

      // Filter out duplicate content and prioritize informative messages
      const uniqueResults = new Map<string, any>();
      const processedContent = new Set<string>();
      
      for (const result of results) {
        // Skip if we've seen very similar content
        const normalizedContent = result.content.toLowerCase().trim();
        let isDuplicate = false;
        
        for (const existing of processedContent) {
          if (this.areSimilarMessages(normalizedContent, existing)) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          // Prioritize messages that contain actual information (not questions)
          const isInformative = this.isInformativeMessage(result.content);
          const key = isInformative ? `info_${uniqueResults.size}` : `query_${uniqueResults.size}`;
          
          uniqueResults.set(key, {
            content: result.content,
            similarity_score: result.similarity_score,
            created_at: result.created_at,
            isInformative
          });
          
          processedContent.add(normalizedContent);
        }
      }

      // Sort to prioritize informative messages
      const sortedResults = Array.from(uniqueResults.values())
        .sort((a, b) => {
          // Prioritize informative messages
          if (a.isInformative && !b.isInformative) return -1;
          if (!a.isInformative && b.isInformative) return 1;
          // Then by similarity score
          return b.similarity_score - a.similarity_score;
        })
        .slice(0, this.RELEVANT_HISTORY_COUNT);

      return sortedResults.map(r => ({
        content: r.content,
        similarity_score: r.similarity_score,
        created_at: r.created_at,
      }));
    } catch (error) {
      console.error('Error fetching relevant history:', error);
      return [];
    }
  }

  /**
   * Check if two messages are very similar (to avoid duplicates)
   */
  private static areSimilarMessages(msg1: string, msg2: string): boolean {
    // Exact match
    if (msg1 === msg2) return true;
    
    // Very similar length and high overlap
    const lengthDiff = Math.abs(msg1.length - msg2.length);
    if (lengthDiff < 10) {
      const words1 = msg1.split(' ');
      const words2 = msg2.split(' ');
      const commonWords = words1.filter(w => words2.includes(w)).length;
      const similarity = commonWords / Math.max(words1.length, words2.length);
      return similarity > 0.8;
    }
    
    return false;
  }

  /**
   * Check if a message contains information (not just a question)
   */
  private static isInformativeMessage(content: string): boolean {
    const lowerContent = content.toLowerCase();
    
    // Patterns that indicate informative content
    const informativePatterns = [
      'my name is',
      'i am',
      'i\'m',
      'call me',
      'you can call me',
      'i work',
      'i live',
      'i like',
      'i have',
      'yes',
      'no',
    ];
    
    // Patterns that indicate questions
    const questionPatterns = [
      'do you',
      'can you',
      'what is',
      'what\'s',
      'who is',
      'where is',
      'when is',
      'how is',
      '?'
    ];
    
    // Check if it's informative
    const hasInfo = informativePatterns.some(pattern => lowerContent.includes(pattern));
    const isQuestion = questionPatterns.some(pattern => lowerContent.includes(pattern));
    
    // Informative if it has info and is not primarily a question
    return hasInfo && !isQuestion;
  }

  /**
   * Get conversation topics
   */
  private static async getConversationTopics(
    conversationId: string
  ): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('conversation_topics')
      .select('topic')
      .eq('conversation_id', conversationId)
      .order('relevance_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching topics:', error);
      return [];
    }

    return (data || []).map(t => t.topic);
  }

  /**
   * Get conversation summary
   */
  private static async getConversationSummary(
    conversationId: string
  ): Promise<string | undefined> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('conversations')
      .select('summary')
      .eq('id', conversationId)
      .single();

    if (error || !data?.summary) {
      return undefined;
    }

    return data.summary;
  }

  /**
   * Get user preferences
   */
  private static async getUserPreferences(
    userId: string
  ): Promise<Record<string, any>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {};
    }

    return data.other_preferences || {};
  }

  /**
   * Format context for LLM consumption
   */
  static formatContextForLLM(context: ConversationContext): string {
    const parts: string[] = [];

    parts.push('=== IMPORTANT CONTEXT FROM PREVIOUS CONVERSATIONS ===');
    
    // Add summary if available
    if (context.summary) {
      parts.push(`\nConversation Summary: ${context.summary}`);
    }

    // Add topics if available
    if (context.topics.length > 0) {
      parts.push(`\nMain Topics Discussed: ${context.topics.join(', ')}`);
    }

    // Add relevant history - MOST IMPORTANT
    if (context.relevantHistory.length > 0) {
      parts.push('\n=== RELEVANT INFORMATION FROM PAST CONVERSATIONS ===');
      parts.push('The user has mentioned the following in previous conversations:');
      context.relevantHistory.forEach((msg, idx) => {
        // Extract key information more clearly
        parts.push(`\n[Previous Message ${idx + 1}] (${(msg.similarity_score * 100).toFixed(0)}% relevant):`);
        parts.push(`"${msg.content}"`);
        
        // Extract specific information like names
        const nameMatch = msg.content.match(/[Mm]y name is (\w+)/);
        if (nameMatch) {
          parts.push(`>>> IMPORTANT: The user's name is ${nameMatch[1]} <<<`);
        }
        
        // Extract pet information
        if (msg.content.toLowerCase().includes('pets:') || msg.content.toLowerCase().includes('pet')) {
          parts.push(`>>> IMPORTANT: ${msg.content} <<<`);
        }
      });
      parts.push('\n=== END OF PREVIOUS CONTEXT ===');
    }

    // Add user preferences if any
    if (context.userPreferences && Object.keys(context.userPreferences).length > 0) {
      parts.push(`\nUser Preferences: ${JSON.stringify(context.userPreferences)}`);
    }

    parts.push('\nREMEMBER: Use the above information from previous conversations when responding to the user.');

    return parts.join('\n');
  }

  /**
   * Update context after a new message
   */
  static async updateContextAfterMessage(
    messageId: string,
    conversationId: string,
    content: string,
    role: string
  ): Promise<void> {
    // Generate embedding for the new message
    await EmbeddingService.processMessage(messageId, content);

    // Extract and store user information
    if (role === 'user') {
      // Get user ID from conversation
      const supabase = await createClient();
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();
      
      if (conversation?.user_id) {
        // Extract and store all entities (names, pets, locations, etc.)
        await EntityExtractor.processAndStoreEntities(conversation.user_id, content);
      }

      // Extract topics from user messages
      const { SummarizationService } = await import('../conversation/summarizationService');
      const topics = await SummarizationService.extractMessageTopics(content);
      
      if (topics.length > 0) {
        const topicData = topics.map((topic, index) => ({
          conversation_id: conversationId,
          topic: topic,
          relevance_score: 0.7 - (index * 0.1),
        }));

        await supabase
          .from('conversation_topics')
          .upsert(topicData, { onConflict: 'conversation_id,topic' });
      }
    }

    // Check if we need to update conversation title
    await this.maybeUpdateConversationTitle(conversationId);
  }

  /**
   * Update conversation title if needed
   */
  private static async maybeUpdateConversationTitle(
    conversationId: string
  ): Promise<void> {
    const supabase = await createClient();

    // Check if conversation has a title
    const { data: conversation } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .single();

    if (!conversation?.title || conversation.title === 'New Conversation') {
      // Get first few messages
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(4);

      if (messages && messages.length >= 2) {
        const { SummarizationService } = await import('../conversation/summarizationService');
        const title = await SummarizationService.generateConversationTitle(messages);
        
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', conversationId);
      }
    }
  }

  /**
   * Preload context for anticipated topics
   */
  static async preloadContext(
    userId: string,
    anticipatedTopics: string[]
  ): Promise<Map<string, any[]>> {
    const contextMap = new Map<string, any[]>();

    for (const topic of anticipatedTopics) {
      try {
        const results = await EmbeddingService.searchBySimilarity(
          userId,
          topic,
          3,
          0.7
        );
        contextMap.set(topic, results);
      } catch (error) {
        console.error(`Error preloading context for topic "${topic}":`, error);
      }
    }

    return contextMap;
  }
}