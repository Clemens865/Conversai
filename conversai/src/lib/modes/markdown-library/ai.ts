import { AIProcessor, ProcessResult, ConversationContext } from '../types'
import { MarkdownLibraryService } from '@/lib/services/memory/markdownLibraryClient'
import { RealtimeAPIService } from '@/lib/services/ai/openai-realtime'

export class MarkdownLibraryAI implements AIProcessor {
  private markdownLibrary: MarkdownLibraryService
  private realtimeAPI: RealtimeAPIService | null = null
  private ws: WebSocket | null = null
  private selectedVoice: string = 'alloy'
  
  constructor() {
    this.markdownLibrary = new MarkdownLibraryService()
  }
  
  setVoice(voice: string): void {
    this.selectedVoice = voice
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing Markdown Library AI processor')
    await this.markdownLibrary.initialize()
    
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    console.log('OpenAI API key available:', !!apiKey)
    if (apiKey) {
      this.realtimeAPI = new RealtimeAPIService({ 
        apiKey,
        voice: this.selectedVoice as any // Cast to RealtimeVoice type
      })
    } else {
      console.warn('NEXT_PUBLIC_OPENAI_API_KEY not found in environment variables')
    }
  }
  
  async processText(
    text: string,
    context: ConversationContext
  ): Promise<ProcessResult> {
    try {
      // Load relevant markdown context
      const markdownContext = await this.markdownLibrary.loadRelevantContext(text)
      
      // For now, return a placeholder response
      // In production, this would connect to OpenAI Realtime API
      const response = `I understand you said: "${text}". I have access to your markdown library with information about you.`
      
      return {
        success: true,
        data: {
          text: response,
          context: markdownContext
        }
      }
    } catch (error) {
      console.error('AI processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    context?: any
  ): Promise<ProcessResult> {
    try {
      // Get the last user message
      const lastMessage = messages.filter(m => m.role === 'user').pop()
      if (!lastMessage) {
        throw new Error('No user message found')
      }
      
      // Process with context
      return await this.processText(lastMessage.content, { messages: [] })
    } catch (error) {
      console.error('Response generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async connectRealtime(): Promise<void> {
    if (!this.realtimeAPI) {
      throw new Error('OpenAI API key not configured')
    }
    
    // Load full context for initial connection
    const fullContext = await this.markdownLibrary.loadFullContext()
    
    // Connect to Realtime API with context
    await this.realtimeAPI.connect(`You are ConversAI, a helpful AI assistant with access to detailed personal information about the user.

${fullContext}

Use this information naturally in conversations. Remember details about the user and reference them when relevant.`)
  }
  
  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.realtimeAPI) {
      throw new Error('Realtime API not connected')
    }
    
    this.realtimeAPI.sendAudio(audioData)
  }
  
  async cleanup(): Promise<void> {
    if (this.realtimeAPI) {
      this.realtimeAPI.disconnect()
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}