import { BaseMode } from '../base/BaseMode'
import { ModeFeatures, ModeConfig, ProcessResult } from '../types'
import { MarkdownLibraryVoice } from './voice'
import { MarkdownLibraryAI } from './ai'
import { MarkdownLibraryStorage } from './storage'

export class MarkdownLibraryMode extends BaseMode {
  id = 'markdown-library'
  name = 'Markdown Library'
  description = 'Context-aware voice AI using markdown knowledge base with Web Speech API. Stack: OpenAI API + Markdown Files + Web Speech'
  icon = '📚'
  badges = ['Web Speech', 'Full Context', 'Markdown-Based', 'Production Ready']
  
  // Voice selection for Text-to-Speech
  selectedVoice: string = 'alloy'
  
  features: ModeFeatures = {
    voiceProvider: 'Web Speech API',
    aiModel: 'GPT-4 Turbo',
    memoryType: 'Markdown Library (localStorage)',
    privacy: 'local',
    offlineSupport: false,
    realTimeProcessing: false
  }
  
  config: ModeConfig = {
    requiredEnvVars: ['NEXT_PUBLIC_OPENAI_API_KEY'],
    optionalEnvVars: [],
    estimatedCost: {
      perMinute: 0.02, // Standard OpenAI API pricing
      setup: 0
    },
    latencyMs: {
      min: 500,
      max: 2000,
      typical: 1000
    }
  }
  
  voice = new MarkdownLibraryVoice()
  ai = new MarkdownLibraryAI()
  storage = new MarkdownLibraryStorage()
  
  async onInitialize(): Promise<void> {
    // Initialize voice processor
    await this.voice.initialize()
    
    // Initialize AI processor
    await this.ai.initialize()
    
    // Set the voice for AI if supported
    if (this.ai.setVoice) {
      this.ai.setVoice(this.selectedVoice)
    }
    
    // Initialize Web Speech API callbacks
    const voice = this.voice as MarkdownLibraryVoice
    voice.setWebSpeechMode(true)
    
    console.log('Markdown Library mode initialized with Web Speech API')
  }
  
  async processTranscript(transcript: string): Promise<ProcessResult> {
    try {
      // Process through AI with markdown context
      const result = await this.ai.processText(transcript, {
        conversationId: Date.now().toString(),
        userId: 'user',
        sessionId: 'session'
      })
      
      if (result.success && result.data?.text) {
        // Use Web Speech synthesis for response
        const voice = this.voice as MarkdownLibraryVoice
        await voice.speak(result.data.text)
      }
      
      return result
    } catch (error) {
      console.error('Error processing transcript:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}