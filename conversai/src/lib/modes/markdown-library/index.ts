import { BaseMode } from '../base/BaseMode'
import { ModeFeatures, ModeConfig, ProcessResult } from '../types'
import { MarkdownLibraryVoice } from './voice'
import { MarkdownLibraryAI } from './ai'
import { MarkdownLibraryStorage } from './storage'

export class MarkdownLibraryMode extends BaseMode {
  id = 'markdown-library'
  name = 'Markdown Library (Beta)'
  description = 'Context-aware voice AI using markdown knowledge base. Stack: OpenAI Realtime API + Markdown Files'
  icon = '📚'
  badges = ['Realtime API', 'Full Context', 'Markdown-Based', 'Beta']
  
  // Voice selection for OpenAI Realtime API
  // Available voices: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
  // - alloy: Neutral and balanced (default)
  // - echo: Male, warm and conversational
  // - fable: British accent, storyteller quality
  // - onyx: Deep, authoritative male voice
  // - nova: Female, friendly and upbeat
  // - shimmer: Female, soft and gentle
  selectedVoice: string = 'alloy'
  
  features: ModeFeatures = {
    voiceProvider: 'OpenAI Realtime API',
    aiModel: 'GPT-4o Realtime',
    memoryType: 'Markdown Library (localStorage)',
    privacy: 'local',
    offlineSupport: false,
    realTimeProcessing: true
  }
  
  config: ModeConfig = {
    requiredEnvVars: ['NEXT_PUBLIC_OPENAI_API_KEY'],
    optionalEnvVars: [],
    estimatedCost: {
      perMinute: 0.30, // $0.06 input + $0.24 output for Realtime API
      setup: 0
    },
    latencyMs: {
      min: 300,
      max: 800,
      typical: 500
    }
  }
  
  voice = new MarkdownLibraryVoice()
  ai = new MarkdownLibraryAI()
  storage = new MarkdownLibraryStorage()
  
  protected async onInitialize(): Promise<void> {
    console.log('Initializing Markdown Library mode...')
    // Pass selected voice to AI processor
    if ('setVoice' in this.ai) {
      (this.ai as any).setVoice(this.selectedVoice)
    }
    
    // Connect to OpenAI Realtime API
    try {
      console.log('Connecting to OpenAI Realtime API...')
      if ('connectRealtime' in this.ai) {
        await (this.ai as any).connectRealtime()
        console.log('Connected to OpenAI Realtime API')
      }
    } catch (error) {
      console.error('Failed to connect to Realtime API:', error)
      console.warn('Markdown Library mode will work with text input only.')
      // Don't throw - allow mode to work without Realtime API
      // throw error
    }
  }
  
  protected async onCleanup(): Promise<void> {
    console.log('Cleaning up Markdown Library mode...')
    // Mode-specific cleanup if needed
  }
  
  protected async onError(error: Error): Promise<void> {
    console.error('Markdown Library mode error:', error)
  }
  
  protected async onProcessAudio(audioBlob: Blob, conversationId: string): Promise<ProcessResult> {
    console.log('Processing audio in Markdown Library mode...')
    
    // For now, return a placeholder response
    // The real implementation would:
    // 1. Convert Blob to ArrayBuffer
    // 2. Send to OpenAI Realtime API via WebSocket
    // 3. Handle the streaming response
    
    const audioBuffer = await audioBlob.arrayBuffer()
    console.log('Audio buffer size:', audioBuffer.byteLength)
    
    // Send audio to Realtime API
    if ('sendAudio' in this.ai && this.ai) {
      try {
        await (this.ai as any).sendAudio(audioBuffer)
      } catch (error) {
        console.error('Failed to send audio to Realtime API:', error)
      }
    }
    
    return {
      transcript: 'Audio processing not fully implemented',
      response: 'The OpenAI Realtime API connection is still being implemented. Audio was captured but not processed.',
      metadata: {
        processingTime: 0,
        mode: 'markdown-library'
      }
    }
  }
  
  protected async onProcessText(text: string, conversationId: string): Promise<ProcessResult> {
    console.log('Processing text in Markdown Library mode:', text)
    
    // Get AI response with markdown context
    const result = await this.ai.processText(text, {
      conversationId,
      userId: 'current-user',
      messages: []
    })
    
    if (result.success && result.data) {
      return {
        transcript: text,
        response: result.data.text,
        metadata: {
          processingTime: Date.now(),
          mode: 'markdown-library',
          context: result.data.context
        }
      }
    }
    
    return {
      transcript: text,
      response: 'Sorry, I encountered an error processing your message.',
      metadata: {
        processingTime: 0,
        error: result.error
      }
    }
  }
}