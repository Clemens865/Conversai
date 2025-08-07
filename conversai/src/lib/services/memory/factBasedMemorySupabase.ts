// Fact-based memory system with Supabase persistence
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Fact {
  id: string;
  userId: string;
  category: FactCategory;
  key: string;           // Normalized key for exact matching (e.g., "user.name", "pet.cat.holly")
  value: string;         // The actual fact value
  rawText: string;       // Original text where fact was extracted from
  confidence: number;    // 0-1 confidence score
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  metadata?: {
    source?: string;     // Where the fact came from
    related?: string[];  // Related fact IDs
    supersedes?: string; // ID of fact this replaces
  };
}

export enum FactCategory {
  IDENTITY = 'identity',           // Name, age, occupation
  LOCATION = 'location',           // Where they live, work, travel
  RELATIONSHIPS = 'relationships', // Family, pets, friends
  PREFERENCES = 'preferences',     // Likes, dislikes, hobbies
  ACTIVITIES = 'activities',       // What they do, routines
  HISTORY = 'history',            // Past events, experiences
  GOALS = 'goals',                // Future plans, aspirations
  CONTEXT = 'context'             // Current situation, temporary info
}

export interface FactQuery {
  categories?: FactCategory[];
  keys?: string[];
  keywords?: string[];
  minConfidence?: number;
  limit?: number;
}

export class FactBasedMemorySupabase {
  private supabase: SupabaseClient | null = null;
  private isServer: boolean;
  
  constructor(isServer: boolean = true) {
    this.isServer = isServer;
  }

  private async getSupabase() {
    if (!this.supabase) {
      if (this.isServer) {
        // For server-side, we'll pass the supabase client from the API route
        throw new Error('Server-side Supabase client must be provided via setSupabase method');
      } else {
        this.supabase = createBrowserClient();
      }
    }
    return this.supabase;
  }
  
  // Method to set the Supabase client for server-side usage
  setSupabase(client: SupabaseClient) {
    this.supabase = client;
  }

  // Store a new fact or update existing one
  async storeFact(fact: Omit<Fact, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Promise<Fact> {
    const supabase = await this.getSupabase();
    
    // Use the upsert_fact function to handle update logic
    const { data, error } = await supabase.rpc('upsert_fact', {
      p_user_id: fact.userId,
      p_category: fact.category,
      p_key: fact.key,
      p_value: fact.value,
      p_raw_text: fact.rawText,
      p_confidence: fact.confidence,
      p_metadata: fact.metadata || {}
    });

    if (error) {
      console.error('Error storing fact:', error);
      throw error;
    }

    return this.mapDbFactToFact(data);
  }

  // Retrieve facts based on query
  async retrieveFacts(query: FactQuery, userId: string): Promise<Fact[]> {
    const supabase = await this.getSupabase();
    
    if (query.keywords && query.keywords.length > 0) {
      // Use search function for keyword search
      const { data, error } = await supabase.rpc('search_facts', {
        p_user_id: userId,
        p_keywords: query.keywords,
        p_categories: query.categories || null,
        p_min_confidence: query.minConfidence || 0,
        p_limit: query.limit || 100
      });

      if (error) {
        console.error('Error searching facts:', error);
        return [];
      }

      // Increment access count for retrieved facts
      if (data && data.length > 0) {
        const factIds = data.map((f: any) => f.id);
        await this.incrementAccessCounts(factIds);
      }

      return data.map((f: any) => this.mapDbFactToFact(f));
    } else if (query.keys && query.keys.length > 0) {
      // Direct key lookup
      let dbQuery = supabase
        .from('facts')
        .select('*')
        .eq('user_id', userId)
        .in('key', query.keys);

      if (query.minConfidence !== undefined) {
        dbQuery = dbQuery.gte('confidence', query.minConfidence);
      }

      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Error retrieving facts by keys:', error);
        return [];
      }

      // Increment access count
      if (data && data.length > 0) {
        const factIds = data.map((f: any) => f.id);
        await this.incrementAccessCounts(factIds);
      }

      return data.map((f: any) => this.mapDbFactToFact(f));
    } else if (query.categories && query.categories.length > 0) {
      // Category-based retrieval
      const { data, error } = await supabase.rpc('get_facts_by_categories', {
        p_user_id: userId,
        p_categories: query.categories,
        p_min_confidence: query.minConfidence || 0,
        p_limit: query.limit || 100
      });

      if (error) {
        console.error('Error retrieving facts by categories:', error);
        return [];
      }

      // Increment access count
      if (data && data.length > 0) {
        const factIds = data.map((f: any) => f.id);
        await this.incrementAccessCounts(factIds);
      }

      return data.map((f: any) => this.mapDbFactToFact(f));
    }

    return [];
  }

  // Get fact by exact key
  async getFactByKey(key: string, userId: string): Promise<Fact | null> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase
      .from('facts')
      .select('*')
      .eq('user_id', userId)
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    // Increment access count
    await this.incrementAccessCounts([data.id]);

    return this.mapDbFactToFact(data);
  }

  // Extract facts from a message
  async extractFactsFromMessage(message: string, userId: string): Promise<Fact[]> {
    const factsToStore: Omit<Fact, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Name extraction
    const namePatterns = [
      { regex: /my name is (\w+)/i, confidence: 0.95 },
      { regex: /i'm (\w+)/i, confidence: 0.85 },
      { regex: /i am (\w+)/i, confidence: 0.85 },
      { regex: /call me (\w+)/i, confidence: 0.9 }
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern.regex);
      if (match) {
        factsToStore.push({
          userId,
          category: FactCategory.IDENTITY,
          key: 'user.name',
          value: match[1],
          rawText: message,
          confidence: pattern.confidence
        });
        break;
      }
    }
    
    // Pet extraction with names
    const petMatch = message.match(/(?:i have|my) (?:a |an |two |three |)?(\w+)? ?(?:cat|dog|pet)s? (?:named|called) ([\w\s,]+)/i);
    if (petMatch) {
      const petType = petMatch[1] || 'pet';
      const petNames = petMatch[2].split(/,|\s+and\s+/).map(n => n.trim());
      
      petNames.forEach((name, index) => {
        factsToStore.push({
          userId,
          category: FactCategory.RELATIONSHIPS,
          key: `pet.${petType.toLowerCase()}.${name.toLowerCase()}`,
          value: `${petType} named ${name}`,
          rawText: message,
          confidence: 0.9
        });
      });
    }
    
    // Location extraction
    const locationMatch = message.match(/i (?:live|am from|reside) (?:in|at) ([\w\s,]+)/i);
    if (locationMatch) {
      factsToStore.push({
        userId,
        category: FactCategory.LOCATION,
        key: 'user.location.home',
        value: locationMatch[1].trim(),
        rawText: message,
        confidence: 0.85
      });
    }
    
    // Occupation extraction
    const occupationMatch = message.match(/i (?:work as|am a|work in|do) ([\w\s]+)/i);
    if (occupationMatch) {
      factsToStore.push({
        userId,
        category: FactCategory.IDENTITY,
        key: 'user.occupation',
        value: occupationMatch[1].trim(),
        rawText: message,
        confidence: 0.8
      });
    }
    
    // Preference extraction
    if (lowerMessage.includes('like') || lowerMessage.includes('love')) {
      const likeMatch = message.match(/(?:like|love|enjoy) ([\w\s]+)/i);
      if (likeMatch) {
        const preference = likeMatch[1].trim();
        factsToStore.push({
          userId,
          category: FactCategory.PREFERENCES,
          key: `user.likes.${preference.toLowerCase().replace(/\s+/g, '_')}`,
          value: preference,
          rawText: message,
          confidence: 0.75
        });
      }
    }
    
    // Store all facts and return the results
    const storedFacts = await Promise.all(
      factsToStore.map(fact => this.storeFact(fact))
    );
    
    return storedFacts;
  }

  // Build context for AI from facts
  buildContextFromFacts(facts: Fact[]): string {
    if (facts.length === 0) {
      return '';
    }
    
    // Group facts by category
    const factsByCategory = new Map<FactCategory, Fact[]>();
    facts.forEach(fact => {
      if (!factsByCategory.has(fact.category)) {
        factsByCategory.set(fact.category, []);
      }
      factsByCategory.get(fact.category)!.push(fact);
    });
    
    // Build context string
    let context = '=== USER FACTS ===\n\n';
    
    // Prioritize identity facts
    const identityFacts = factsByCategory.get(FactCategory.IDENTITY);
    if (identityFacts) {
      context += 'Identity:\n';
      identityFacts.forEach(fact => {
        context += `- ${fact.value}\n`;
      });
      context += '\n';
    }
    
    // Add other categories
    for (const [category, categoryFacts] of factsByCategory) {
      if (category === FactCategory.IDENTITY) continue;
      
      context += `${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
      categoryFacts.forEach(fact => {
        context += `- ${fact.value}\n`;
      });
      context += '\n';
    }
    
    context += '=== END USER FACTS ===\n';
    
    return context;
  }

  // Get all facts for a user
  async getAllUserFacts(userId: string): Promise<Fact[]> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase
      .from('facts')
      .select('*')
      .eq('user_id', userId)
      .order('confidence', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting all user facts:', error);
      return [];
    }

    return data.map((f: any) => this.mapDbFactToFact(f));
  }

  // Get fact summary
  async getFactSummary(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    avgConfidence: Record<string, number>;
  }> {
    const supabase = await this.getSupabase();
    
    const { data, error } = await supabase.rpc('get_fact_summary', {
      p_user_id: userId
    });

    if (error || !data) {
      console.error('Error getting fact summary:', error);
      return {
        total: 0,
        byCategory: {},
        avgConfidence: {}
      };
    }

    const total = data[0]?.total_facts || 0;
    const byCategory: Record<string, number> = {};
    const avgConfidence: Record<string, number> = {};

    data.forEach((row: any) => {
      if (row.category) {
        byCategory[row.category] = Number(row.category_count);
        avgConfidence[row.category] = Number(row.avg_confidence);
      }
    });

    return { total, byCategory, avgConfidence };
  }

  // Clear all facts for a user (for testing/debugging)
  async clearUserFacts(userId: string): Promise<void> {
    const supabase = await this.getSupabase();
    
    const { error } = await supabase
      .from('facts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing user facts:', error);
      throw error;
    }
  }

  // Helper to increment access counts
  private async incrementAccessCounts(factIds: string[]): Promise<void> {
    const supabase = await this.getSupabase();
    
    // Batch increment access counts
    await Promise.all(
      factIds.map(id => 
        supabase.rpc('increment_fact_access_count', { fact_id: id })
      )
    );
  }

  // Helper to map database fact to Fact interface
  private mapDbFactToFact(dbFact: any): Fact {
    return {
      id: dbFact.id,
      userId: dbFact.user_id,
      category: dbFact.category as FactCategory,
      key: dbFact.key,
      value: dbFact.value,
      rawText: dbFact.raw_text,
      confidence: Number(dbFact.confidence),
      createdAt: new Date(dbFact.created_at),
      updatedAt: new Date(dbFact.updated_at),
      accessCount: dbFact.access_count,
      metadata: dbFact.metadata
    };
  }
}

// Server instance (for API routes)
export const factBasedMemory = new FactBasedMemorySupabase(true);

// Client instance (for browser components)
export const factBasedMemoryClient = new FactBasedMemorySupabase(false);