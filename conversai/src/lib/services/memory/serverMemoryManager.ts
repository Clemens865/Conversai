import { createClient } from '@/lib/supabase/server';
import { BaseMemoryStrategy, MemoryItem, MemoryMetrics } from './multiTierMemory';
import { userProfileManager } from './userProfileManager';

// Server-side implementation of hierarchical memory strategy
export class ServerHierarchicalMemory extends BaseMemoryStrategy {
  name = 'Server Hierarchical Memory';
  private supabase: any;
  private stm: Map<string, MemoryItem> = new Map();

  async initialize(): Promise<void> {
    this.supabase = await createClient();
    console.log('Server hierarchical memory initialized');
  }

  async store(item: MemoryItem): Promise<void> {
    // Store in STM
    this.stm.set(item.id, item);
    
    // Also store in database for persistence
    if (item.metadata.conversationId) {
      // Store as part of conversation
      await this.supabase
        .from('messages')
        .insert({
          conversation_id: item.metadata.conversationId,
          role: item.metadata.source === 'user' ? 'user' : 'assistant',
          content: item.content,
          metadata: item.metadata
        });
    }
  }

  async retrieve(query: string, limit: number = 10): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    
    // First check STM
    for (const item of this.stm.values()) {
      if (this.isRelevant(item, query)) {
        results.push(item);
      }
    }
    
    // If not enough results, check database
    if (results.length < limit) {
      const { data: dbResults } = await this.supabase
        .from('messages')
        .select('*')
        .ilike('content', `%${query}%`)
        .limit(limit - results.length);
      
      if (dbResults) {
        for (const msg of dbResults) {
          if (!results.find(r => r.id === msg.id)) {
            results.push({
              id: msg.id,
              content: msg.content,
              metadata: {
                ...msg.metadata,
                timestamp: new Date(msg.created_at),
                source: msg.role
              }
            });
          }
        }
      }
    }
    
    return results;
  }

  async getConversationContext(conversationId: string, currentQuery: string): Promise<MemoryItem[]> {
    const contextItems: MemoryItem[] = [];
    
    // Get recent messages from this conversation
    const { data: recentMessages } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentMessages) {
      // Add recent messages to context
      contextItems.push(...recentMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        metadata: {
          timestamp: new Date(msg.created_at),
          conversationId: msg.conversation_id,
          source: msg.role,
          accessCount: 1,
          lastAccessed: new Date()
        }
      })).reverse());
    }
    
    // Search for relevant information in the conversation
    // For example, if asking about name, search for "my name is" patterns
    if (currentQuery.toLowerCase().includes('name')) {
      console.log('User asking about name, searching for name mentions...');
      
      const { data: nameMessages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .or(`content.ilike.%my name is%,content.ilike.%I am%,content.ilike.%call me%,content.ilike.%I'm%`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error searching for name messages:', error);
      }
      
      console.log('Found name-related messages:', nameMessages?.length || 0);
      
      if (nameMessages && nameMessages.length > 0) {
        // Add name-related messages to context with high priority
        for (const msg of nameMessages) {
          console.log('Name message found:', msg.content);
          if (!contextItems.find(item => item.id === msg.id)) {
            contextItems.unshift({
              id: msg.id,
              content: msg.content,
              metadata: {
                timestamp: new Date(msg.created_at),
                conversationId: msg.conversation_id,
                source: msg.role,
                relevanceScore: 0.9,
                accessCount: 1,
                lastAccessed: new Date()
              }
            });
          }
        }
      }
    }
    
    // Search for other relevant context based on keywords
    const keywords = this.extractKeywords(currentQuery);
    if (keywords.length > 0) {
      const keywordQuery = keywords.map(k => `content.ilike.%${k}%`).join(',');
      const { data: relevantMessages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .or(keywordQuery)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (relevantMessages) {
        for (const msg of relevantMessages) {
          if (!contextItems.find(item => item.id === msg.id)) {
            contextItems.push({
              id: msg.id,
              content: msg.content,
              metadata: {
                timestamp: new Date(msg.created_at),
                conversationId: msg.conversation_id,
                source: msg.role,
                relevanceScore: 0.7,
                accessCount: 1,
                lastAccessed: new Date()
              }
            });
          }
        }
      }
    }
    
    return contextItems;
  }

  private isRelevant(item: MemoryItem, query: string): boolean {
    const queryLower = query.toLowerCase();
    const contentLower = item.content.toLowerCase();
    
    // Direct match
    if (contentLower.includes(queryLower)) {
      return true;
    }
    
    // Check for related concepts
    const queryWords = queryLower.split(' ');
    const contentWords = contentLower.split(' ');
    
    // If query asks about "name", check for name patterns
    if (queryWords.includes('name')) {
      if (contentLower.includes('my name is') || 
          contentLower.includes('i am') ||
          contentLower.includes('call me')) {
        return true;
      }
    }
    
    // Count matching words
    const matchCount = queryWords.filter(qw => 
      contentWords.some(cw => cw.includes(qw) || qw.includes(cw))
    ).length;
    
    return matchCount >= Math.ceil(queryWords.length * 0.5);
  }

  private extractKeywords(query: string): string[] {
    // Remove common words
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'for', 'with', 'by', 'about', 'into', 'from'];
    
    const words = query.toLowerCase().split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)];
  }

  async predictNext(currentContext: MemoryItem[]): Promise<any> {
    // Simple prediction for server-side
    return {
      id: 'root',
      prompt: 'continue conversation',
      probability: 1.0,
      children: [],
      metadata: { depth: 0, totalUses: 0, successRate: 0 }
    };
  }
}

// Enhanced server-side memory manager
export class ServerMemoryManager {
  private memory: ServerHierarchicalMemory;

  constructor() {
    this.memory = new ServerHierarchicalMemory();
  }

  async initialize(): Promise<void> {
    await this.memory.initialize();
  }

  async getEnhancedContext(conversationId: string, currentQuery: string, userId: string): Promise<any[]> {
    // Initialize user profile manager
    await userProfileManager.initialize();
    
    // Get or create user profile
    const userProfile = await userProfileManager.getOrCreateProfile(userId);
    console.log('Loaded user profile:', { 
      name: userProfile.name, 
      facts: userProfile.personalFacts.length,
      interests: userProfile.preferences.interests 
    });
    
    // Search across ALL user conversations if asking about personal info
    let contextItems = await this.memory.getConversationContext(conversationId, currentQuery);
    
    // If asking about personal information and not found in current conversation
    if (this.isPersonalQuery(currentQuery) && !this.hasPersonalInfo(contextItems, currentQuery)) {
      console.log('Searching across all user conversations...');
      const historicalMessages = await userProfileManager.searchUserHistory(userId, currentQuery);
      
      // Add relevant historical messages to context
      for (const msg of historicalMessages) {
        if (!contextItems.find(item => item.id === msg.id)) {
          contextItems.push({
            id: msg.id,
            content: msg.content,
            metadata: {
              timestamp: new Date(msg.created_at),
              conversationId: msg.conversation_id,
              source: msg.role,
              relevanceScore: 0.8,
              accessCount: 1,
              lastAccessed: new Date()
            }
          });
        }
      }
    }
    
    // Update profile with any new information from current conversation
    const recentMessages = contextItems
      .filter(item => item.metadata.conversationId === conversationId)
      .map(item => ({ role: item.metadata.source, content: item.content }));
    
    await userProfileManager.updateProfileFromConversation(userId, conversationId, recentMessages);
    
    // Convert to OpenAI message format
    const messages = contextItems.map(item => ({
      role: item.metadata.source === 'user' ? 'user' : 'assistant',
      content: item.content
    }));
    
    // Build system context with user profile
    const systemContext = this.buildSystemContextWithProfile(contextItems, currentQuery, userProfile);
    messages.unshift({
      role: 'system',
      content: systemContext
    });
    
    return messages;
  }
  
  private isPersonalQuery(query: string): boolean {
    const personalKeywords = ['name', 'who am i', 'remember', 'know me', 'about me', 'my favorite', 'i told you'];
    const queryLower = query.toLowerCase();
    return personalKeywords.some(keyword => queryLower.includes(keyword));
  }
  
  private hasPersonalInfo(contextItems: MemoryItem[], query: string): boolean {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('name')) {
      return contextItems.some(item => 
        item.metadata.source === 'user' && 
        (item.content.toLowerCase().includes('my name') || 
         item.content.toLowerCase().includes('i am') ||
         item.content.toLowerCase().includes("i'm"))
      );
    }
    
    return false;
  }
  
  private buildSystemContextWithProfile(contextItems: MemoryItem[], currentQuery: string, userProfile: any): string {
    const contextInfo: string[] = [];
    
    // Always start with user profile information
    const profileContext = userProfileManager.buildUserContext(userProfile);
    contextInfo.push(profileContext);
    
    // Add conversation-specific context
    const conversationContext = this.buildSystemContext(contextItems, currentQuery);
    if (conversationContext) {
      contextInfo.push(conversationContext);
    }
    
    return contextInfo.join('\n\n');
  }

  private buildSystemContext(contextItems: MemoryItem[], currentQuery: string): string | null {
    const contextInfo: string[] = [];
    
    // Always include a reminder about using conversation history
    contextInfo.push('Remember to use all information from the conversation history when responding.');
    
    // Extract user's name if mentioned
    for (const item of contextItems) {
      if (item.metadata.source === 'user') {
        const nameMatch = item.content.match(/my name is (\w+)/i) ||
                         item.content.match(/i am (\w+)/i) ||
                         item.content.match(/i'm (\w+)/i) ||
                         item.content.match(/call me (\w+)/i) ||
                         item.content.match(/^(\w+)[.!]?$/i) || // Single word might be a name introduction
                         item.content.match(/it's (\w+)/i) ||
                         item.content.match(/this is (\w+)/i);
        if (nameMatch) {
          contextInfo.push(`IMPORTANT: The user's name is ${nameMatch[1]}. Always remember and use this name.`);
          break;
        }
      }
    }
    
    // If user is asking about their name, emphasize checking history
    if (currentQuery.toLowerCase().includes('my name') || currentQuery.toLowerCase().includes('who am i')) {
      contextInfo.push('The user is asking about their identity. Check the conversation history carefully for when they introduced themselves.');
    }
    
    // Extract other important personal information
    const personalInfo = this.extractPersonalInfo(contextItems);
    if (personalInfo.length > 0) {
      contextInfo.push(...personalInfo);
    }
    
    return `Important context and instructions:\n${contextInfo.join('\n')}\n\nUse this information to provide accurate and personalized responses.`;
  }
  
  private extractPersonalInfo(contextItems: MemoryItem[]): string[] {
    const info: string[] = [];
    
    for (const item of contextItems) {
      if (item.metadata.source === 'user') {
        // Location
        const locationMatch = item.content.match(/i (?:live|am from|am in) (.+)/i);
        if (locationMatch) {
          info.push(`The user lives in/is from ${locationMatch[1]}.`);
        }
        
        // Preferences
        const likeMatch = item.content.match(/i (?:like|love|enjoy) (.+)/i);
        if (likeMatch) {
          info.push(`The user likes ${likeMatch[1]}.`);
        }
        
        // Work/profession
        const workMatch = item.content.match(/i (?:work as|am a|do) (.+)/i);
        if (workMatch) {
          info.push(`The user works as/is a ${workMatch[1]}.`);
        }
      }
    }
    
    return info;
  }

  async storeMessage(conversationId: string, role: 'user' | 'assistant', content: string, userId: string): Promise<void> {
    const item: MemoryItem = {
      id: `msg-${Date.now()}`,
      content,
      metadata: {
        timestamp: new Date(),
        conversationId,
        userId,
        source: role,
        accessCount: 1,
        lastAccessed: new Date()
      }
    };
    
    await this.memory.store(item);
  }
}