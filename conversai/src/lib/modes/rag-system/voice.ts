import { VoiceService } from './types';
import { ElevenLabsService } from '../../services/voice/elevenlabs';

class RAGVoiceService implements VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private elevenLabs: ElevenLabsService | null = null;
  private isListening = false;
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private useElevenLabs = false;
  private audioContext: AudioContext | null = null;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Initialize Web Speech API for recognition
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

    // Initialize ElevenLabs for high-quality speech synthesis
    const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (elevenLabsApiKey) {
      this.elevenLabs = new ElevenLabsService(elevenLabsApiKey, 'rachel');
      this.useElevenLabs = true;
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎤 RAG Voice Service initialized with ElevenLabs TTS');
    } else {
      // Fallback to Web Speech API for synthesis
      this.synthesis = window.speechSynthesis;
      console.log('🎤 RAG Voice Service initialized (Web Speech API)');
    }
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

  // Alias methods for compatibility with the UI
  async startRecording(onTranscript?: (text: string) => void): Promise<void> {
    // The UI expects startRecording, but we use startListening
    // Use the provided callback or a default one
    const callback = onTranscript || ((text) => console.log('Transcript:', text));
    
    await this.startListening((text, isFinal) => {
      console.log('Transcript:', text, 'Final:', isFinal);
      // Call the UI's callback when we get a final transcript
      if (isFinal && onTranscript) {
        onTranscript(text);
      }
    });
  }

  stopRecording(): void {
    // Synchronous version for UI compatibility
    this.stopListening();
  }

  processTranscript(transcript: string): Promise<void> {
    // Process the transcript - this will be called by the UI
    if (this.onTranscriptCallback) {
      this.onTranscriptCallback(transcript, true);
    }
    return Promise.resolve();
  }

  synthesizeSpeech(text: string): Promise<void> {
    // Alias for speak method
    return this.speak(text);
  }

  async speak(text: string): Promise<void> {
    // Use ElevenLabs if available
    if (this.useElevenLabs && this.elevenLabs && this.audioContext) {
      try {
        console.log('🔊 Using ElevenLabs for speech synthesis');
        
        // Generate speech audio from ElevenLabs
        const audioData = await this.elevenLabs.generateSpeech(text);
        
        // Decode and play the audio
        const audioBuffer = await this.audioContext.decodeAudioData(audioData);
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start(0);
        
        // Wait for the audio to finish playing
        return new Promise((resolve) => {
          source.onended = () => resolve();
        });
      } catch (error) {
        console.error('ElevenLabs TTS failed, falling back to Web Speech API:', error);
        // Fall through to Web Speech API
      }
    }

    // Fallback to Web Speech API
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
    if (this.audioContext) {
      await this.audioContext.close();
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
      (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || window.speechSynthesis)
    );
  }

  // Method to change ElevenLabs voice
  setVoice(voiceName: string): void {
    if (this.elevenLabs) {
      this.elevenLabs.setVoice(voiceName);
      console.log(`🎤 Changed ElevenLabs voice to: ${voiceName}`);
    }
  }

  // Get current TTS mode
  getTTSMode(): string {
    return this.useElevenLabs ? 'ElevenLabs' : 'Web Speech API';
  }
}

export const ragVoice = new RAGVoiceService();