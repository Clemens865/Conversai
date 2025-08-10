import { VoiceService } from './types';

class RAGVoiceService implements VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;

        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(transcript, isFinal);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          this.restart();
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          this.restart();
        }
      };
    }

    this.synthesis = window.speechSynthesis;
    console.log('🎤 RAG Voice Service initialized (Web Speech API)');
  }

  async startListening(onTranscript: (text: string, isFinal: boolean) => void): Promise<void> {
    if (!this.recognition) {
      console.warn('Speech recognition not available');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.isListening = true;
    this.recognition.start();
    console.log('🎧 Started listening...');
  }

  async stopListening(): Promise<void> {
    if (!this.recognition) return;

    this.isListening = false;
    this.recognition.stop();
    console.log('🛑 Stopped listening');
  }

  async speak(text: string): Promise<void> {
    if (!this.synthesis) {
      console.warn('Speech synthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Use a good quality voice if available
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.name.includes('Alex')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synthesis.speak(utterance);
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  private restart(): void {
    if (this.recognition && this.isListening) {
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e) {
          // Already started, ignore
        }
      }, 100);
    }
  }

  isAvailable(): boolean {
    return !!(
      (typeof window !== 'undefined') &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) &&
      window.speechSynthesis
    );
  }
}

export const ragVoice = new RAGVoiceService();