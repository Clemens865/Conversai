import { AIService, Message, ConversationConfig } from './types';

class RAGAIService implements AIService {
  private config: ConversationConfig = {};
  private ragServiceUrl: string = '';
  private fallbackToDirectAI: boolean = false;

  async initialize(config: ConversationConfig): Promise<void> {
    this.config = config;
    this.ragServiceUrl = config.ragConfig?.serviceUrl || 'http://localhost:3456';
    console.log('🤖 RAG AI Service initialized with URL:', this.ragServiceUrl);
  }

  async sendMessage(message: string, context?: any): Promise<Message> {
    try {
      // First, try to get relevant context from RAG service
      const ragContext = await this.queryRAG(message);
      
      // Prepare the enhanced prompt with RAG context
      const enhancedPrompt = this.buildEnhancedPrompt(message, ragContext);
      
      // Send to AI with context
      if (this.fallbackToDirectAI || !ragContext) {
        // Fallback to direct AI without RAG
        return await this.sendDirectAI(message);
      }
      
      // Use the RAG-enhanced response
      return await this.sendWithRAGContext(enhancedPrompt, ragContext);
      
    } catch (error) {
      console.error('Error in RAG AI Service:', error);
      // Fallback to direct AI
      return await this.sendDirectAI(message);
    }
  }

  private async queryRAG(query: string): Promise<any> {
    try {
      const response = await fetch(`${this.ragServiceUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: this.config.ragConfig?.maxChunks || 5,
          threshold: this.config.ragConfig?.similarityThreshold || 0.7
        }),
      });

      if (!response.ok) {
        console.warn('RAG query failed:', response.status);
        this.fallbackToDirectAI = true;
        return null;
      }

      const data = await response.json();
      return data.chunks || [];
    } catch (error) {
      console.error('Error querying RAG service:', error);
      this.fallbackToDirectAI = true;
      return null;
    }
  }

  private buildEnhancedPrompt(query: string, ragContext: any[]): string {
    if (!ragContext || ragContext.length === 0) {
      return query;
    }

    let contextText = 'Based on the following relevant information from the knowledge base:\n\n';
    
    ragContext.forEach((chunk, index) => {
      contextText += `[Context ${index + 1}]:\n${chunk.content}\n\n`;
    });

    contextText += `\nUser Question: ${query}\n\n`;
    contextText += 'Please provide a comprehensive answer based on the context above and your general knowledge.';

    return contextText;
  }

  private async sendWithRAGContext(enhancedPrompt: string, ragContext: any[]): Promise<Message> {
    // Use the existing API endpoint with RAG context
    const response = await fetch('/api/voice/process-claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: enhancedPrompt,
        context: {
          ragChunks: ragContext,
          mode: 'rag-system'
        },
        config: this.config
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: data.response || data.message || 'I processed your request with RAG context.',
      timestamp: new Date(),
      metadata: {
        ragChunksUsed: ragContext.length,
        mode: 'rag-system'
      }
    };
  }

  private async sendDirectAI(message: string): Promise<Message> {
    // Fallback to direct AI without RAG
    const response = await fetch('/api/voice/process-claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        config: this.config
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: data.response || data.message || 'I understand your request.',
      timestamp: new Date(),
      metadata: {
        mode: 'rag-system',
        fallback: true
      }
    };
  }

  async streamMessage(message: string, onChunk: (chunk: string) => void): Promise<void> {
    // For now, just send the complete message
    const response = await this.sendMessage(message);
    onChunk(response.content);
  }

  async cleanup(): Promise<void> {
    // Cleanup if needed
  }

  async updateConfig(config: ConversationConfig): Promise<void> {
    this.config = config;
    this.ragServiceUrl = config.ragConfig?.serviceUrl || this.ragServiceUrl;
  }
}

export const ragAI = new RAGAIService();