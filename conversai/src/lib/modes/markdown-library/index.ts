import { BaseMode } from '../base-mode'
import type { ModeConfig, ConversationMessage } from '@/types/modes'
import { MarkdownLibraryService } from '@/lib/services/memory/markdownLibraryClient'
import { RealtimeAPIService } from '@/lib/services/ai/openai-realtime'

export class MarkdownLibraryMode extends BaseMode {
  private markdownLibrary: MarkdownLibraryService
  private realtimeAPI: RealtimeAPIService | null = null
  private ws: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  
  constructor() {
    const config: ModeConfig = {
      id: 'markdown-library',
      name: 'Markdown Library (Beta)',
      description: 'Context-aware voice AI using markdown knowledge base',
      features: {
        realtime: true,
        voiceInput: true,
        voiceOutput: true,
        textInput: true,
        continuousListening: true,
        videoSupport: false,
      },
      tech: {
        stt: 'OpenAI Realtime',
        llm: 'GPT-4o Realtime',
        tts: 'OpenAI Realtime',
        storage: 'Local Markdown Files',
      },
      privacy: 'local-first',
      latency: 'ultra-low',
      requiredEnvVars: ['NEXT_PUBLIC_OPENAI_API_KEY'],
    }
    super(config)
    this.markdownLibrary = new MarkdownLibraryService()
  }

  protected async onInitialize(): Promise<void> {
    // Initialize markdown library
    await this.markdownLibrary.initialize()
    console.log('Markdown library initialized')
    
    // Load initial context
    const fullContext = await this.markdownLibrary.loadFullContext()
    console.log(`Loaded ${fullContext.length} characters of context`)
  }

  async startListening(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connectRealtime()
    }
    
    // Start audio capture
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.audioContext = new AudioContext({ sampleRate: 24000 })
    
    // Create audio processing pipeline
    const source = this.audioContext.createMediaStreamSource(stream)
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
    
    processor.onaudioprocess = (e) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = this.convertToPCM16(inputData)
        
        // Send audio data to Realtime API
        this.ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: this.arrayBufferToBase64(pcm16.buffer)
        }))
      }
    }
    
    source.connect(processor)
    processor.connect(this.audioContext.destination)
    
    this.isListening = true
    this.emit('listening-change', true)
  }

  async stopListening(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    // Signal end of input
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }))
    }
    
    this.isListening = false
    this.emit('listening-change', false)
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connectRealtime()
    }
    
    // Load relevant context based on message
    const relevantContext = await this.markdownLibrary.loadRelevantContext(text)
    
    // Send text message with context
    this.ws!.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    }))
    
    // Update conversation display
    this.messages.push({
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    })
    this.emit('messages-change', this.messages)
    
    // Request response
    this.ws!.send(JSON.stringify({
      type: 'response.create'
    }))
  }

  private async connectRealtime(): Promise<void> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }
    
    // Connect to OpenAI Realtime API
    this.ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      [],
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    )
    
    this.ws.onopen = async () => {
      console.log('Connected to OpenAI Realtime API')
      
      // Configure session with markdown context
      const fullContext = await this.markdownLibrary.loadFullContext()
      
      this.ws!.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are ConversAI, a helpful AI assistant with access to detailed personal information about the user. 

${fullContext}

Use this information naturally in conversations. Remember details about the user and reference them when relevant. Be conversational and personable.`,
          voice: 'alloy',
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
    }
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.handleRealtimeMessage(message)
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', new Error('Connection to Realtime API failed'))
    }
    
    this.ws.onclose = () => {
      console.log('Disconnected from Realtime API')
      this.ws = null
    }
  }

  private handleRealtimeMessage(message: any): void {
    switch (message.type) {
      case 'conversation.item.created':
        if (message.item.role === 'assistant' && message.item.content?.[0]?.transcript) {
          // Add assistant message to conversation
          this.messages.push({
            id: message.item.id,
            role: 'assistant',
            content: message.item.content[0].transcript,
            timestamp: new Date()
          })
          this.emit('messages-change', this.messages)
        }
        break
        
      case 'response.audio.delta':
        // Play audio chunk
        if (message.delta) {
          const audioData = this.base64ToArrayBuffer(message.delta)
          this.playAudioChunk(audioData)
        }
        break
        
      case 'response.audio_transcript.done':
        // Final transcript available
        console.log('Transcript:', message.transcript)
        break
        
      case 'error':
        console.error('Realtime API error:', message.error)
        this.emit('error', new Error(message.error.message))
        break
    }
  }

  private convertToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]))
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }
    return pcm16
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  private async playAudioChunk(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 })
    }
    
    // Convert PCM16 to Float32 for Web Audio
    const pcm16 = new Int16Array(audioData)
    const float32 = new Float32Array(pcm16.length)
    
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 0x8000
    }
    
    // Create audio buffer and play
    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000)
    audioBuffer.copyToChannel(float32, 0)
    
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.audioContext.destination)
    source.start()
  }

  async cleanup(): Promise<void> {
    await this.stopListening()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}