// OpenAI Realtime API Service
// Note: This is a browser-only implementation as WebSockets work differently in Node.js

// Available voices for OpenAI Realtime API
export type RealtimeVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface RealtimeConfig {
  apiKey: string
  model?: string
  voice?: RealtimeVoice
}

export interface RealtimeSession {
  sessionId: string
  ws: WebSocket | null
  isConnected: boolean
}

export class RealtimeAPIService {
  private config: RealtimeConfig
  private session: RealtimeSession | null = null
  
  constructor(config: RealtimeConfig) {
    this.config = {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
      ...config
    }
  }
  
  async connect(instructions: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Realtime API is only available in browser environment')
    }
    
    // Include API key in URL for browser WebSocket
    const url = `wss://api.openai.com/v1/realtime?model=${this.config.model}`
    
    // Create WebSocket with subprotocols for auth
    // OpenAI expects the API key in the Authorization header, but browsers don't support this
    // So we'll use the Sec-WebSocket-Protocol header as a workaround
    const ws = new WebSocket(url, [
      'realtime',
      `openai-beta.realtime-v1`,
      `openai-insecure-api-key.${this.config.apiKey}`
    ])
    
    this.session = {
      sessionId: Date.now().toString(),
      ws,
      isConnected: false
    }
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('Connected to OpenAI Realtime API')
        
        // Send authentication
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions,
            voice: this.config.voice, // Uses the voice from config (default: 'alloy')
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            }
          }
        }))
        
        this.session!.isConnected = true
        resolve()
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.error('WebSocket readyState:', ws.readyState)
        console.error('Make sure your OpenAI API key is set in NEXT_PUBLIC_OPENAI_API_KEY')
        reject(new Error('Failed to connect to Realtime API. Check console for details.'))
      }
      
      ws.onmessage = (event) => {
        console.log('Realtime API message:', event.data)
        try {
          const message = JSON.parse(event.data)
          console.log('Parsed message type:', message.type)
        } catch (e) {
          console.error('Failed to parse message:', e)
        }
      }
      
      ws.onclose = (event) => {
        console.log('Disconnected from Realtime API')
        console.log('Close code:', event.code)
        console.log('Close reason:', event.reason)
        if (this.session) {
          this.session.isConnected = false
        }
      }
    })
  }
  
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.session?.ws || !this.session.isConnected) {
      throw new Error('Not connected to Realtime API')
    }
    
    // Convert to base64
    const base64 = this.arrayBufferToBase64(audioData)
    
    this.session.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64
    }))
  }
  
  sendText(text: string): void {
    if (!this.session?.ws || !this.session.isConnected) {
      throw new Error('Not connected to Realtime API')
    }
    
    this.session.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }))
    
    // Request response
    this.session.ws.send(JSON.stringify({
      type: 'response.create'
    }))
  }
  
  commitAudio(): void {
    if (!this.session?.ws || !this.session.isConnected) {
      throw new Error('Not connected to Realtime API')
    }
    
    this.session.ws.send(JSON.stringify({
      type: 'input_audio_buffer.commit'
    }))
  }
  
  onMessage(handler: (message: any) => void): void {
    if (!this.session?.ws) {
      throw new Error('Not connected to Realtime API')
    }
    
    this.session.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handler(message)
    }
  }
  
  disconnect(): void {
    if (this.session?.ws) {
      this.session.ws.close()
      this.session = null
    }
  }
  
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}