import {
  ConversationMode,
  VoiceProcessor,
  AIProcessor,
  StorageProcessor,
  ModeFeatures,
  ModeConfig,
  ProcessResult,
  ModeMetrics,
  ConversationContext,
  Message
} from '../types';

export abstract class BaseMode implements ConversationMode {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract icon: string;
  abstract features: ModeFeatures;
  abstract badges: string[];
  abstract config: ModeConfig;
  
  abstract voice: VoiceProcessor;
  abstract ai: AIProcessor;
  abstract storage: StorageProcessor;
  
  protected metrics: ModeMetrics = {
    latency: 0,
    accuracy: 0,
    privacy: 0,
    cost: 0,
    reliability: 0
  };
  
  protected isInitialized: boolean = false;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log(`Initializing mode: ${this.name}`);
    
    // Initialize storage
    await this.storage.initialize();
    
    // Mode-specific initialization
    await this.onInitialize();
    
    this.isInitialized = true;
    console.log(`Mode initialized: ${this.name}`);
  }
  
  async cleanup(): Promise<void> {
    console.log(`Cleaning up mode: ${this.name}`);
    
    // Mode-specific cleanup
    await this.onCleanup();
    
    this.isInitialized = false;
    console.log(`Mode cleaned up: ${this.name}`);
  }
  
  async processAudio(audioBlob: Blob, conversationId: string): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      // Mode-specific audio processing
      const result = await this.onProcessAudio(audioBlob, conversationId);
      
      // Update metrics
      this.updateMetrics({
        latency: Date.now() - startTime
      });
      
      return result;
    } catch (error) {
      console.error(`Error processing audio in ${this.name} mode:`, error);
      throw error;
    }
  }
  
  async processText(text: string, conversationId: string): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      // Get conversation context
      const messages = await this.storage.getConversationHistory(conversationId);
      const userProfile = await this.storage.getUserProfile('current-user'); // TODO: Get actual user ID
      
      const context: ConversationContext = {
        conversationId,
        userId: 'current-user',
        messages,
        userProfile: userProfile || undefined
      };
      
      // Generate AI response
      const response = await this.ai.generateResponse(text, context);
      
      // Save messages
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date()
      };
      await this.storage.saveMessage(userMessage);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      await this.storage.saveMessage(assistantMessage);
      
      // Synthesize speech if supported
      let audioUrl: string | undefined;
      if (this.features.realTimeProcessing) {
        await this.voice.synthesizeSpeech(response);
      }
      
      // Update metrics
      this.updateMetrics({
        latency: Date.now() - startTime
      });
      
      return {
        transcript: text,
        response,
        audioUrl,
        metadata: {
          processingTime: Date.now() - startTime,
          mode: this.id
        }
      };
    } catch (error) {
      console.error(`Error processing text in ${this.name} mode:`, error);
      throw error;
    }
  }
  
  getMetrics(): ModeMetrics {
    return { ...this.metrics };
  }
  
  protected updateMetrics(updates: Partial<ModeMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...updates
    };
  }
  
  // Abstract methods for subclasses to implement
  protected abstract onInitialize(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  protected abstract onProcessAudio(audioBlob: Blob, conversationId: string): Promise<ProcessResult>;
}