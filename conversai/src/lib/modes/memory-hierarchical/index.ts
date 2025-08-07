import { BaseMode } from '../base/BaseMode';
import { ModeFeatures, ModeConfig, ProcessResult } from '../types';
import { MemoryHierarchicalVoice } from './voice';
import { MemoryHierarchicalAI } from './ai';
import { MemoryHierarchicalStorage } from './storage';

export class MemoryHierarchicalMode extends BaseMode {
  id = 'memory-hierarchical';
  name = 'Memory Mode (Fact-Based)';
  description = 'Premium voice quality with deterministic fact memory. Stack: Deepgram + ElevenLabs + GPT-4 + Fact Storage';
  icon = '🧠';
  
  features: ModeFeatures = {
    voiceProvider: 'ElevenLabs + Deepgram',
    aiModel: 'GPT-4',
    memoryType: 'Fact-Based Memory',
    privacy: 'cloud',
    offlineSupport: false,
    realTimeProcessing: true
  };
  
  badges = ['Premium Voice', 'Fact Memory', 'Deterministic', 'No Hallucinations'];
  
  config: ModeConfig = {
    apiKeys: {
      deepgram: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!,
      elevenlabs: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
      openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY!
    },
    endpoints: {
      voice: '/api/voice/process-fact-based',
      profile: '/api/user/profile'
    }
  };
  
  voice: MemoryHierarchicalVoice;
  ai: MemoryHierarchicalAI;
  storage: MemoryHierarchicalStorage;
  
  constructor() {
    super();
    this.voice = new MemoryHierarchicalVoice(this.config);
    this.ai = new MemoryHierarchicalAI(this.config);
    this.storage = new MemoryHierarchicalStorage(this.config);
    
    // Set initial metrics
    this.metrics = {
      latency: 65,
      accuracy: 92,
      privacy: 40,
      cost: 85,
      reliability: 88
    };
  }
  
  protected async onInitialize(): Promise<void> {
    // Mode-specific initialization
    console.log('Initializing Memory Hierarchical mode services...');
    
    // Verify API keys
    if (!this.config.apiKeys?.openai) {
      throw new Error('OpenAI API key not configured');
    }
    if (!this.config.apiKeys?.deepgram) {
      throw new Error('Deepgram API key not configured');
    }
    if (!this.config.apiKeys?.elevenlabs) {
      throw new Error('ElevenLabs API key not configured');
    }
  }
  
  protected async onCleanup(): Promise<void> {
    // Clean up any resources
    console.log('Cleaning up Memory Hierarchical mode...');
  }
  
  protected async onProcessAudio(audioBlob: Blob, conversationId: string): Promise<ProcessResult> {
    // Use the existing voice processing endpoint
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('conversationId', conversationId);
    
    const response = await fetch(this.config.endpoints!.voice, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Voice processing failed');
    }
    
    const data = await response.json();
    
    return {
      transcript: data.transcript,
      response: data.response,
      audioUrl: data.audio ? `data:audio/mp3;base64,${data.audio}` : undefined,
      metadata: {
        processingTime: Date.now(),
        mode: this.id
      }
    };
  }
}