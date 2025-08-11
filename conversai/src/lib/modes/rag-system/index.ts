import { ConversationMode, ConversationConfig } from './types';
import { ragAI } from './ai';
import { ragVoice } from './voice';
import { ragStorage } from './storage';

export class RAGSystemMode implements ConversationMode {
  id = 'rag-system';
  name = 'RAG System (Production)';
  description = 'Production-ready RAG with Rust backend. Stack: Web Speech API + Rust RAG Service + Supabase pgvector';
  icon = '🚀';
  
  features = {
    voiceProvider: 'ElevenLabs TTS + Web Speech Recognition',
    aiModel: 'Rust RAG + Claude/GPT',
    memoryType: 'pgvector + Hybrid Search',
    privacy: 'Self-hosted'
  };
  
  badges = ['Production RAG', 'Hybrid Search', 'Self-Hosted', 'Scalable'];

  // Services
  ai = ragAI;
  voice = ragVoice;
  storage = ragStorage;
  
  // Voice processor compatibility (the UI expects these directly on the mode)
  get voiceProcessor() {
    return this.voice;
  }

  // Configuration
  config: ConversationConfig = {
    voiceEnabled: true,
    autoStart: false,
    memoryEnabled: true,
    streamingEnabled: true,
    maxResponseLength: 2000,
    temperature: 0.7,
    systemPrompt: `You are a helpful AI assistant powered by a production-grade RAG (Retrieval-Augmented Generation) system. 
    You have access to a knowledge base stored in a vector database and can retrieve relevant information to answer questions accurately.
    When answering, you combine retrieved context with your general knowledge to provide comprehensive, accurate responses.`,
    ragConfig: {
      // Use the Railway service URL from environment or fallback to localhost
      serviceUrl: process.env.NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL || 
                  'https://conversai-production.up.railway.app' || 
                  'http://localhost:3456',
      maxChunks: 5,
      similarityThreshold: 0.7
    }
  };

  // Lifecycle methods
  async initialize(): Promise<void> {
    console.log('🚀 Initializing RAG System Mode');
    
    // Initialize services
    await this.storage.initialize();
    await this.ai.initialize(this.config);
    await this.voice.initialize();
    
    // Test RAG service connection
    try {
      const response = await fetch(`${this.config.ragConfig?.serviceUrl}/health`);
      if (response.ok) {
        console.log('✅ RAG service connected successfully');
      } else {
        console.warn('⚠️ RAG service not responding, falling back to direct AI');
      }
    } catch (error) {
      console.warn('⚠️ Could not connect to RAG service:', error);
    }
    
    console.log('✅ RAG System Mode initialized');
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up RAG System Mode');
    await this.voice.cleanup();
    await this.ai.cleanup();
    await this.storage.cleanup();
  }

  // Mode-specific methods
  async updateConfig(config: Partial<ConversationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Update service configurations
    if (this.ai.updateConfig) {
      await this.ai.updateConfig(this.config);
    }
  }

  getSystemPrompt(): string {
    return this.config.systemPrompt || '';
  }

  isReady(): boolean {
    return true;
  }

  getMetrics() {
    return {
      latency: 85,
      accuracy: 95,
      privacy: 75,
      cost: 50,
      reliability: 90
    };
  }

  // Required by ConversationMode interface
  async processAudio(audioBlob: Blob, conversationId: string): Promise<any> {
    // For now, just return a placeholder
    return {
      transcript: '',
      response: 'Audio processing is handled by Web Speech API',
      metadata: { mode: 'rag-system' }
    };
  }

  async processText(text: string, conversationId: string): Promise<any> {
    const response = await this.ai.sendMessage(text);
    await this.storage.saveMessage({
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    });
    await this.storage.saveMessage(response);
    
    return {
      response: response.content,
      metadata: response.metadata
    };
  }
}