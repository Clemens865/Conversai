import { StorageProcessor, Message, UserProfile } from '../types';
import { ModeConfig } from '../types';
import { createClient } from '@/lib/supabase/client';
import { factBasedMemoryClient, Fact, FactCategory } from '@/lib/services/memory/factBasedMemorySupabase';

export class MemoryHierarchicalStorage implements StorageProcessor {
  private config: ModeConfig;
  private supabase = createClient();
  
  constructor(config: ModeConfig) {
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    // Verify Supabase connection
    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      console.error('Supabase initialization error:', error);
    }
    
    // Initialize fact-based memory (already initialized as singleton)
    console.log('Fact-based memory system initialized');
  }
  
  async saveMessage(message: Message): Promise<void> {
    // Messages are saved server-side in the /api/voice/process endpoint
    // This is a placeholder for potential client-side operations
  }
  
  async getConversationHistory(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
    
    return data?.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.created_at)
    })) || [];
  }
  
  async saveUserProfile(profile: UserProfile): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .upsert({
        user_id: profile.id,
        name: profile.name,
        profile_data: {
          preferences: profile.preferences,
          facts: profile.facts
        }
      });
    
    if (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Get user facts from fact-based memory
    const userFacts = await factBasedMemoryClient.getAllUserFacts(userId);
    
    // Get name fact specifically
    const nameFact = await factBasedMemoryClient.getFactByKey('user.name', userId);
    
    // Convert facts to the expected format
    const factsArray = userFacts.map(fact => ({
      type: fact.category,
      value: fact.value,
      confidence: fact.confidence
    }));
    
    // Build preferences from preference facts
    const preferenceFacts = userFacts.filter(f => f.category === FactCategory.PREFERENCES);
    const preferences: Record<string, any> = {};
    preferenceFacts.forEach(fact => {
      const key = fact.key.replace('user.likes.', '').replace(/_/g, ' ');
      preferences[key] = fact.value;
    });
    
    return {
      id: userId,
      name: nameFact?.value || undefined,
      preferences,
      facts: factsArray
    };
  }
  
  // Additional methods for fact management
  async getFactsByCategory(userId: string, category: FactCategory): Promise<Fact[]> {
    const facts = await factBasedMemoryClient.retrieveFacts({
      categories: [category],
      minConfidence: 0.5
    }, userId);
    return facts;
  }
  
  async searchFacts(userId: string, keywords: string[]): Promise<Fact[]> {
    const facts = await factBasedMemoryClient.retrieveFacts({
      keywords,
      minConfidence: 0.5
    }, userId);
    return facts;
  }
  
  async getFactSummary(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    recentFacts: Fact[];
  }> {
    const summary = await factBasedMemoryClient.getFactSummary(userId);
    const allFacts = await factBasedMemoryClient.getAllUserFacts(userId);
    
    // Get 5 most recent facts
    const recentFacts = allFacts
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);
    
    return {
      total: summary.total,
      byCategory: summary.byCategory,
      recentFacts
    };
  }
}