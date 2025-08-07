// Core types for the conversation mode system

export interface VoiceProcessor {
  startRecording(): Promise<void>;
  stopRecording(): void;
  processTranscript(transcript: string): Promise<void>;
  synthesizeSpeech(text: string): Promise<void>;
}

export interface AIProcessor {
  generateResponse(
    message: string,
    context: ConversationContext
  ): Promise<string>;
  extractEntities(message: string): Promise<Entity[]>;
}

export interface StorageProcessor {
  initialize(): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  getConversationHistory(conversationId: string): Promise<Message[]>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
}

export interface ConversationMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: ModeFeatures;
  badges: string[];
  config: ModeConfig;
  
  // Core processors
  voice: VoiceProcessor;
  ai: AIProcessor;
  storage: StorageProcessor;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Mode-specific methods
  processAudio(audioBlob: Blob, conversationId: string): Promise<ProcessResult>;
  processText(text: string, conversationId: string): Promise<ProcessResult>;
  getMetrics(): ModeMetrics;
}

export interface ModeFeatures {
  voiceProvider: string;
  aiModel: string;
  memoryType: string;
  privacy: 'cloud' | 'local' | 'hybrid';
  offlineSupport: boolean;
  realTimeProcessing: boolean;
}

export interface ModeConfig {
  apiKeys?: {
    [key: string]: string;
  };
  endpoints?: {
    [key: string]: string;
  };
  settings?: {
    [key: string]: any;
  };
}

export interface ProcessResult {
  transcript?: string;
  response: string;
  audioUrl?: string;
  metadata?: {
    processingTime: number;
    tokensUsed?: number;
    confidence?: number;
    [key: string]: any;
  };
}

export interface ModeMetrics {
  latency: number;
  accuracy: number;
  privacy: number;
  cost: number;
  reliability: number;
}

export interface ConversationContext {
  conversationId: string;
  userId: string;
  messages: Message[];
  userProfile?: UserProfile;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  name?: string;
  preferences: Record<string, any>;
  facts: Array<{
    fact: string;
    confidence: number;
    timestamp: Date;
  }>;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
}

// Mode Registry types
export interface ModeRegistryEntry {
  mode: ConversationMode;
  isActive: boolean;
  loadPriority: number;
}

export type ModeFactory = () => Promise<ConversationMode>;