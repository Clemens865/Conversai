import { StorageService, Message } from './types';

class RAGStorageService implements StorageService {
  private messages: Message[] = [];
  private storageKey = 'conversai_rag_messages';

  async initialize(): Promise<void> {
    // Load messages from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          this.messages = JSON.parse(stored);
        } catch (error) {
          console.error('Error loading stored messages:', error);
          this.messages = [];
        }
      }
    }
    console.log('💾 RAG Storage Service initialized');
  }

  async saveMessage(message: Message): Promise<void> {
    this.messages.push(message);
    this.persistToLocalStorage();
  }

  async getMessages(limit?: number): Promise<Message[]> {
    if (limit) {
      return this.messages.slice(-limit);
    }
    return this.messages;
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  async searchMessages(query: string): Promise<Message[]> {
    const lowerQuery = query.toLowerCase();
    return this.messages.filter(msg => 
      msg.content.toLowerCase().includes(lowerQuery)
    );
  }

  async cleanup(): Promise<void> {
    // Save any pending changes
    this.persistToLocalStorage();
  }

  private persistToLocalStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        // Keep only last 100 messages to avoid storage issues
        const toStore = this.messages.slice(-100);
        localStorage.setItem(this.storageKey, JSON.stringify(toStore));
      } catch (error) {
        console.error('Error persisting messages:', error);
      }
    }
  }

  // RAG-specific methods
  async getConversationContext(messageCount: number = 5): Promise<string> {
    const recentMessages = await this.getMessages(messageCount);
    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  async saveRAGContext(query: string, ragChunks: any[]): Promise<void> {
    // Store RAG context for debugging/analysis
    const ragContext = {
      query,
      chunks: ragChunks,
      timestamp: new Date().toISOString()
    };
    
    if (typeof window !== 'undefined') {
      const key = `rag_context_${Date.now()}`;
      try {
        sessionStorage.setItem(key, JSON.stringify(ragContext));
      } catch (error) {
        console.error('Error saving RAG context:', error);
      }
    }
  }
}

export const ragStorage = new RAGStorageService();