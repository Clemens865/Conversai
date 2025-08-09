import { VoiceProcessor, ProcessResult } from '../types'

export class MarkdownLibraryVoice implements VoiceProcessor {
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private isRecording = false
  private recognition: any = null
  private synthesis: SpeechSynthesis | null = null
  private useWebSpeech = false
  private onTranscriptCallback?: (transcript: string) => void
  private audioChunks: Blob[] = []
  
  async initialize(): Promise<void> {
    console.log('Initializing Markdown Library voice processor')
    
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = false
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'
      console.log('Web Speech Recognition initialized')
    }
    
    // Initialize Speech Synthesis
    this.synthesis = window.speechSynthesis
    if (this.synthesis) {
      console.log('Web Speech Synthesis initialized')
    }
  }
  
  setWebSpeechMode(enable: boolean): void {
    this.useWebSpeech = enable
    console.log('Web Speech mode:', enable)
  }
  
  setTranscriptCallback(callback: (transcript: string) => void): void {
    this.onTranscriptCallback = callback
  }
  
  async processAudio(audioData: ArrayBuffer): Promise<ProcessResult> {
    // This is not used when Web Speech is active
    return {
      success: true,
      data: {
        text: 'Processed audio',
        confidence: 0.95
      }
    }
  }
  
  async startRecording(): Promise<void> {
    try {
      // Get audio stream for visual feedback
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext({ sampleRate: 24000 })
      this.mediaRecorder = new MediaRecorder(stream)
      this.audioChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          console.log('Audio chunk received:', event.data.size)
        }
      }
      
      this.mediaRecorder.start(100) // Record in 100ms chunks for visual feedback
      this.isRecording = true
      
      // Start Web Speech Recognition
      if (this.recognition) {
        return new Promise((resolve, reject) => {
          this.recognition.onstart = () => {
            console.log('Speech recognition started')
            resolve()
          }
          
          this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error)
            reject(new Error(event.error))
          }
          
          this.recognition.onresult = (event: any) => {
            const last = event.results.length - 1
            const transcript = event.results[last][0].transcript
            const isFinal = event.results[last].isFinal
            
            console.log('Transcript:', transcript, 'Final:', isFinal)
            
            if (isFinal && this.onTranscriptCallback) {
              this.onTranscriptCallback(transcript)
            }
          }
          
          this.recognition.onend = () => {
            console.log('Speech recognition ended')
          }
          
          try {
            this.recognition.start()
          } catch (error) {
            console.error('Failed to start recognition:', error)
            reject(error)
          }
        })
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }
  
  async stopRecording(): Promise<ArrayBuffer> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
    
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.log('Recognition already stopped')
      }
    }
    
    this.isRecording = false
    
    // Clean up audio resources
    if (this.mediaRecorder) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
      this.mediaRecorder = null
    }
    
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
    
    return new ArrayBuffer(0)
  }
  
  async speak(text: string): Promise<void> {
    if (!this.synthesis) {
      console.warn('Speech synthesis not available')
      return
    }
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      
      utterance.onend = () => {
        console.log('Speech synthesis completed')
        resolve()
      }
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        resolve() // Resolve anyway to prevent hanging
      }
      
      // Set voice parameters
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0
      utterance.lang = 'en-US'
      
      // Select a voice if available
      const voices = this.synthesis.getVoices()
      if (voices.length > 0) {
        // Try to find an English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en'))
        if (englishVoice) {
          utterance.voice = englishVoice
        }
      }
      
      this.synthesis.speak(utterance)
    })
  }
  
  async cleanup(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
    
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    if (this.synthesis) {
      this.synthesis.cancel()
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close()
    }
  }
}