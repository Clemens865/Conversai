// Fact-based memory system for deterministic retrieval
// No vector embeddings - just structured facts with clear categories

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

export class FactBasedMemory {
  private facts: Map<string, Fact> = new Map();
  private factsByKey: Map<string, Fact> = new Map();
  private factsByCategory: Map<FactCategory, Set<string>> = new Map();
  
  constructor() {
    // Initialize category maps
    Object.values(FactCategory).forEach(category => {
      this.factsByCategory.set(category, new Set());
    });
  }

  // Store a new fact or update existing one
  async storeFact(fact: Omit<Fact, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Promise<Fact> {
    // Check if fact with same key exists
    const existingFact = this.factsByKey.get(fact.key);
    
    if (existingFact) {
      // Update existing fact if confidence is higher
      if (fact.confidence > existingFact.confidence) {
        const updatedFact: Fact = {
          ...existingFact,
          value: fact.value,
          rawText: fact.rawText,
          confidence: fact.confidence,
          updatedAt: new Date(),
          metadata: {
            ...fact.metadata,
            supersedes: existingFact.id
          }
        };
        
        this.facts.set(updatedFact.id, updatedFact);
        this.factsByKey.set(updatedFact.key, updatedFact);
        
        return updatedFact;
      }
      
      return existingFact;
    }
    
    // Create new fact
    const newFact: Fact = {
      ...fact,
      id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0
    };
    
    // Store in all indexes
    this.facts.set(newFact.id, newFact);
    this.factsByKey.set(newFact.key, newFact);
    this.factsByCategory.get(newFact.category)?.add(newFact.id);
    
    return newFact;
  }

  // Retrieve facts based on query
  async retrieveFacts(query: FactQuery): Promise<Fact[]> {
    let results: Fact[] = [];
    
    // If specific keys requested, get those first
    if (query.keys && query.keys.length > 0) {
      for (const key of query.keys) {
        const fact = this.factsByKey.get(key);
        if (fact) {
          fact.accessCount++;
          results.push(fact);
        }
      }
    }
    
    // If categories specified, get facts from those categories
    if (query.categories && query.categories.length > 0) {
      for (const category of query.categories) {
        const factIds = this.factsByCategory.get(category);
        if (factIds) {
          for (const id of factIds) {
            const fact = this.facts.get(id);
            if (fact && !results.some(f => f.id === fact.id)) {
              fact.accessCount++;
              results.push(fact);
            }
          }
        }
      }
    }
    
    // If keywords specified, search in values and raw text
    if (query.keywords && query.keywords.length > 0) {
      const keywordResults = Array.from(this.facts.values()).filter(fact => {
        const searchText = `${fact.value} ${fact.rawText}`.toLowerCase();
        return query.keywords!.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
      });
      
      for (const fact of keywordResults) {
        if (!results.some(f => f.id === fact.id)) {
          fact.accessCount++;
          results.push(fact);
        }
      }
    }
    
    // Filter by confidence if specified
    if (query.minConfidence !== undefined) {
      results = results.filter(fact => fact.confidence >= query.minConfidence!);
    }
    
    // Sort by relevance (access count and confidence)
    results.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + (a.accessCount / 100) * 0.3;
      const scoreB = b.confidence * 0.7 + (b.accessCount / 100) * 0.3;
      return scoreB - scoreA;
    });
    
    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }

  // Get fact by exact key
  async getFactByKey(key: string): Promise<Fact | null> {
    const fact = this.factsByKey.get(key);
    if (fact) {
      fact.accessCount++;
    }
    return fact || null;
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
    return Array.from(this.facts.values())
      .filter(fact => fact.userId === userId)
      .sort((a, b) => b.confidence - a.confidence);
  }

  // Clear all facts (for testing)
  clearAllFacts(): void {
    this.facts.clear();
    this.factsByKey.clear();
    this.factsByCategory.forEach(set => set.clear());
  }
}

// Singleton instance
export const factBasedMemory = new FactBasedMemory();