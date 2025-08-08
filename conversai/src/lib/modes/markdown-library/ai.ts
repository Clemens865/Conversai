import { AIProcessor, ProcessResult, ConversationContext } from '../types'
import { MarkdownLibraryService } from '@/lib/services/memory/markdownLibraryClient'
import { RealtimeAPIService } from '@/lib/services/ai/openai-realtime'
import { MarkdownLibraryFallbackAI } from './fallback-ai'

export class MarkdownLibraryAI implements AIProcessor {
  private markdownLibrary: MarkdownLibraryService
  private realtimeAPI: RealtimeAPIService | null = null
  private fallbackAI: MarkdownLibraryFallbackAI | null = null
  private ws: WebSocket | null = null
  private selectedVoice: string = 'alloy'
  private useFallback: boolean = false
  
  constructor() {
    this.markdownLibrary = new MarkdownLibraryService()
  }
  
  setVoice(voice: string): void {
    this.selectedVoice = voice
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing Markdown Library AI processor')
    await this.markdownLibrary.initialize()
    
    // Check environment variable in different ways
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    console.log('Environment check:')
    console.log('- process.env.NEXT_PUBLIC_OPENAI_API_KEY:', !!apiKey)
    console.log('- typeof process.env:', typeof process.env)
    console.log('- All NEXT_PUBLIC vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')))
    
    if (apiKey && apiKey !== 'undefined' && apiKey !== '') {
      console.log('Creating RealtimeAPIService...')
      try {
        this.realtimeAPI = new RealtimeAPIService({ 
          apiKey,
          voice: this.selectedVoice as any // Cast to RealtimeVoice type
        })
        console.log('RealtimeAPIService created successfully')
      } catch (error) {
        console.error('Failed to create RealtimeAPIService:', error)
        console.log('Falling back to standard OpenAI API...')
        this.useFallback = true
      }
      
      // Always create fallback AI as backup
      console.log('Creating fallback AI service...')
      this.fallbackAI = new MarkdownLibraryFallbackAI()
      this.fallbackAI.initialize(apiKey)
      console.log('Fallback AI service ready')
    } else {
      console.warn('NEXT_PUBLIC_OPENAI_API_KEY not found or invalid')
      console.warn('Make sure it is set in .env.local and the server was restarted')
      this.useFallback = true
    }
  }
  
  async processText(
    text: string,
    context: ConversationContext
  ): Promise<ProcessResult> {
    try {
      // Load relevant markdown context
      const markdownContext = await this.markdownLibrary.loadRelevantContext(text)
      
      // Use fallback AI if available
      if (this.fallbackAI && this.useFallback) {
        console.log('Using fallback AI for response generation...')
        const response = await this.fallbackAI.generateResponse(text, markdownContext)
        
        return {
          success: true,
          data: {
            text: response,
            context: markdownContext
          }
        }
      }
      
      // Otherwise return a placeholder (Realtime API would be used here)
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
      console.log('RealtimeAPI not available, will use fallback')
      this.useFallback = true
      return // Don't throw error, just use fallback
    }
    
    try {
      // Load full context for initial connection
      const fullContext = await this.markdownLibrary.loadFullContext()
      
      // Connect to Realtime API with context
      await this.realtimeAPI.connect(`You are ConversAI, a helpful AI assistant with access to detailed personal information about the user.

${fullContext}

Use this information naturally in conversations. Remember details about the user and reference them when relevant.`)
      
      console.log('Successfully connected to Realtime API')
      this.useFallback = false
    } catch (error) {
      console.error('Failed to connect to Realtime API:', error)
      console.log('Will use fallback AI instead')
      this.useFallback = true
    }
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