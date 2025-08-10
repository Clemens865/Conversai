// RAG System Mode Types

export interface ConversationConfig {
  voiceEnabled?: boolean;
  autoStart?: boolean;
  memoryEnabled?: boolean;
  streamingEnabled?: boolean;
  maxResponseLength?: number;
  temperature?: number;
  systemPrompt?: string;
  ragConfig?: {
    serviceUrl?: string;
    maxChunks?: number;
    similarityThreshold?: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface AIService {
  initialize(config: ConversationConfig): Promise<void>;
  sendMessage(message: string, context?: any): Promise<Message>;
  streamMessage?(message: string, onChunk: (chunk: string) => void): Promise<void>;
  cleanup(): Promise<void>;
  updateConfig?(config: ConversationConfig): Promise<void>;
}

export interface VoiceService {
  initialize(): Promise<void>;
  startListening(onTranscript: (text: string, isFinal: boolean) => void): Promise<void>;
  stopListening(): Promise<void>;
  speak(text: string): Promise<void>;
  cleanup(): Promise<void>;
  isAvailable?(): boolean;
}

export interface StorageService {
  initialize(): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  getMessages(limit?: number): Promise<Message[]>;
  clearMessages(): Promise<void>;
  searchMessages?(query: string): Promise<Message[]>;
  cleanup(): Promise<void>;
}

export interface ConversationMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: {
    voiceProvider: string;
    aiModel: string;
    memoryType: string;
    privacy: string;
  };
  badges: string[];
  config: ConversationConfig;
  
  // Services
  ai: AIService;
  voice: VoiceService;
  storage: StorageService;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Optional methods
  updateConfig?(config: Partial<ConversationConfig>): Promise<void>;
  getSystemPrompt?(): string;
  isReady?(): boolean;
}