import { BaseMode } from '../base/BaseMode';
import { ModeFeatures, ModeConfig, ProcessResult } from '../types';
import { ClaudeLocalFirstVoice } from './voice';
import { ClaudeLocalFirstAI } from './ai';
import { ClaudeLocalFirstStorage } from './storage';

export class ClaudeLocalFirstMode extends BaseMode {
  id = 'claude-local-first';
  name = 'Claude Local-First (Privacy)';
  description = 'Instant voice with maximum privacy. Stack: Web Speech API + Claude 3 Opus + IndexedDB (local storage)';
  icon = '🔒';
  
  features: ModeFeatures = {
    voiceProvider: 'Web Speech API',
    aiModel: 'Claude 3 Opus',
    memoryType: 'FSM + IndexedDB',
    privacy: 'local',
    offlineSupport: true,
    realTimeProcessing: true
  };
  
  badges = ['Privacy-First', 'Zero Latency', 'Local Storage', 'Deterministic'];
  
  config: ModeConfig = {
    apiKeys: {
      // API key is handled server-side only for security
      anthropic: 'server-side-only'
    },
    endpoints: {
      ai: '/api/voice/process-claude'
    },
    settings: {
      voiceRate: 1.0,
      voicePitch: 1.0,
      voiceVolume: 1.0
    }
  };
  
  voice: ClaudeLocalFirstVoice;
  ai: ClaudeLocalFirstAI;
  storage: ClaudeLocalFirstStorage;
  
  constructor() {
    super();
    this.voice = new ClaudeLocalFirstVoice(this.config);
    this.ai = new ClaudeLocalFirstAI(this.config);
    this.storage = new ClaudeLocalFirstStorage(this.config);
    
    // Set initial metrics
    this.metrics = {
      latency: 95,
      accuracy: 88,
      privacy: 95,
      cost: 30,
      reliability: 85
    };
  }
  
  protected async onInitialize(): Promise<void> {
    // Mode-specific initialization
    console.log('Initializing Claude Local-First mode...');
    
    // Check Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Web Speech API not supported in this browser. Please use Chrome or Edge.');
    }
    
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech Synthesis not supported in this browser');
    }
    
    // Initialize local storage (IndexedDB)
    await this.storage.initialize();
    console.log('LocalFirstStorage (IndexedDB) initialized');
    
    // API key verification happens server-side
    // The client doesn't need access to the API key
    console.log('Claude API will be accessed through secure server endpoint');
  }
  
  protected async onCleanup(): Promise<void> {
    // Stop any ongoing speech recognition
    this.voice.stopRecording();
    
    // Cancel any pending speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
  
  protected async onProcessAudio(audioBlob: Blob, conversationId: string): Promise<ProcessResult> {
    // In Claude Local-First mode, audio processing is handled client-side
    // The audio blob here is just for compatibility
    // Real processing happens through Web Speech API
    
    // This shouldn't be called directly in this mode
    throw new Error('Claude Local-First mode uses client-side audio processing');
  }
  
  async processTranscript(transcript: string, conversationId: string): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      // Get user ID from somewhere (ideally passed from the component)
      // For now, we'll use a default user ID
      const userId = 'local-user';
      
      // Set the current conversation context for storage
      this.storage.setCurrentConversation(conversationId, userId);
      
      // Save the user message to local storage
      await this.storage.saveMessage({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: transcript,
        timestamp: new Date()
      });
      
      // Get the conversation state from IndexedDB
      const conversationHistory = await this.storage.getConversationHistory(conversationId);
      const userProfile = await this.storage.getUserProfile(userId);
      
      // Build context from local storage
      const contextData = {
        userName: userProfile?.name,
        facts: userProfile?.facts || [],
        currentTopic: conversationHistory.length > 0 ? 'ongoing conversation' : 'new conversation',
        messageCount: conversationHistory.length
      };
      
      // Send transcript and context to Claude endpoint
      const formData = new FormData();
      formData.append('transcript', transcript);
      formData.append('context', JSON.stringify(contextData));
      
      const response = await fetch(this.config.endpoints!.ai, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('AI processing failed');
      }
      
      const data = await response.json();
      
      // Save the assistant response to local storage
      await this.storage.saveMessage({
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      });
      
      // Synthesize speech locally using Web Speech API
      await this.voice.synthesizeSpeech(data.response);
      
      // Update metrics
      this.updateMetrics({
        latency: Date.now() - startTime
      });
      
      return {
        transcript,
        response: data.response,
        metadata: {
          processingTime: Date.now() - startTime,
          mode: this.id,
          localStorageUsed: true,
          factsCount: userProfile?.facts?.length || 0
        }
      };
    } catch (error) {
      console.error('Error processing transcript:', error);
      throw error;
    }
  }
}