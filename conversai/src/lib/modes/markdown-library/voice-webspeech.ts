// Web Speech API implementation for browser-based STT
export class WebSpeechSTT {
  private recognition: any
  private isListening: boolean = false
  
  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = false
        this.recognition.lang = 'en-US'
      }
    }
  }
  
  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Web Speech API not supported'))
        return
      }
      
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        console.log('Web Speech API transcript:', transcript)
        resolve(transcript)
      }
      
      this.recognition.onerror = (event: any) => {
        console.error('Web Speech API error:', event.error)
        reject(new Error(event.error))
      }
      
      this.recognition.onend = () => {
        this.isListening = false
      }
      
      this.isListening = true
      this.recognition.start()
    })
  }
  
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }
}