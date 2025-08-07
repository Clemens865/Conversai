// Local-first storage implementation using IndexedDB
// For the Claude Local-First approach

export interface LocalConversationState {
  id: string;
  userId: string;
  currentState: 'greeting' | 'learning' | 'assisting' | 'reflecting';
  userProfile: {
    name?: string;
    preferences: Record<string, any>;
    facts: Array<{
      fact: string;
      confidence: number;
      timestamp: Date;
      source: string;
    }>;
  };
  conversationContext: {
    topic?: string;
    mood?: string;
    goals: string[];
    lastInteraction: Date;
  };
  shortTermMemory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  metadata: {
    created: Date;
    updated: Date;
    interactionCount: number;
  };
}

export class LocalFirstStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'ConversAILocalFirst';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'conversations';

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for conversations
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('updated', 'metadata.updated', { unique: false });
        }
      };
    });
  }

  async saveState(state: LocalConversationState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      state.metadata.updated = new Date();
      const request = store.put(state);

      request.onerror = () => reject(new Error('Failed to save state'));
      request.onsuccess = () => {
        console.log('Saved conversation state to IndexedDB:', {
          id: state.id,
          userId: state.userId,
          name: state.userProfile.name,
          factsCount: state.userProfile.facts.length,
          messagesCount: state.shortTermMemory.length
        });
        resolve();
      };
    });
  }

  async getState(conversationId: string): Promise<LocalConversationState | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(conversationId);

      request.onerror = () => reject(new Error('Failed to get state'));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getUserConversations(userId: string): Promise<LocalConversationState[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onerror = () => reject(new Error('Failed to get conversations'));
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteState(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(conversationId);

      request.onerror = () => reject(new Error('Failed to delete state'));
      request.onsuccess = () => resolve();
    });
  }

  // Extract facts from conversation for quick access
  extractUserFacts(state: LocalConversationState): Array<{ category: string; facts: string[] }> {
    const factsByCategory: Record<string, string[]> = {
      personal: [],
      preferences: [],
      activities: [],
      relationships: []
    };

    // Extract from user profile facts
    state.userProfile.facts.forEach(fact => {
      if (fact.fact.toLowerCase().includes('name')) {
        factsByCategory.personal.push(fact.fact);
      } else if (fact.fact.toLowerCase().includes('like') || fact.fact.toLowerCase().includes('prefer')) {
        factsByCategory.preferences.push(fact.fact);
      } else if (fact.fact.toLowerCase().includes('pet') || fact.fact.toLowerCase().includes('family')) {
        factsByCategory.relationships.push(fact.fact);
      } else {
        factsByCategory.activities.push(fact.fact);
      }
    });

    return Object.entries(factsByCategory).map(([category, facts]) => ({
      category,
      facts
    }));
  }

  // State machine transitions
  transitionState(
    currentState: LocalConversationState,
    userMessage: string
  ): LocalConversationState['currentState'] {
    const lowerMessage = userMessage.toLowerCase();
    
    // Greeting triggers
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'greeting';
    }
    
    // Learning triggers
    if (lowerMessage.includes('my name') || lowerMessage.includes('i am') || lowerMessage.includes('i like')) {
      return 'learning';
    }
    
    // Assisting triggers
    if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
      return 'assisting';
    }
    
    // Reflecting triggers
    if (lowerMessage.includes('remember') || lowerMessage.includes('what do you know')) {
      return 'reflecting';
    }
    
    // Default: stay in current state
    return currentState.currentState;
  }

  // Create initial state for new conversation
  createInitialState(conversationId: string, userId: string): LocalConversationState {
    return {
      id: conversationId,
      userId,
      currentState: 'greeting',
      userProfile: {
        preferences: {},
        facts: []
      },
      conversationContext: {
        goals: [],
        lastInteraction: new Date()
      },
      shortTermMemory: [],
      metadata: {
        created: new Date(),
        updated: new Date(),
        interactionCount: 0
      }
    };
  }

  // Export conversation data for backup
  async exportConversation(conversationId: string): Promise<string> {
    const state = await this.getState(conversationId);
    if (!state) throw new Error('Conversation not found');
    
    return JSON.stringify(state, null, 2);
  }

  // Import conversation data
  async importConversation(jsonData: string): Promise<void> {
    const state = JSON.parse(jsonData) as LocalConversationState;
    
    // Convert date strings back to Date objects
    state.metadata.created = new Date(state.metadata.created);
    state.metadata.updated = new Date(state.metadata.updated);
    state.conversationContext.lastInteraction = new Date(state.conversationContext.lastInteraction);
    state.userProfile.facts.forEach(fact => {
      fact.timestamp = new Date(fact.timestamp);
    });
    state.shortTermMemory.forEach(msg => {
      msg.timestamp = new Date(msg.timestamp);
    });
    
    await this.saveState(state);
  }
}

// Singleton instance
export const localFirstStorage = new LocalFirstStorage();