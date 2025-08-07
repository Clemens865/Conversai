import { VoiceProcessor } from '../types';
import { ModeConfig } from '../types';

export class ClaudeLocalFirstVoice implements VoiceProcessor {
  private config: ModeConfig;
  private recognition: any = null;
  private isListening: boolean = false;
  private onTranscriptCallback: ((transcript: string) => void) | null = null;
  
  constructor(config: ModeConfig) {
    this.config = config;
  }
  
  async startRecording(): Promise<void> {
    // Check if Web Speech API is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Web Speech API not supported');
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Web Speech API started');
    };
    
    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      if (event.results[0].isFinal) {
        console.log('Final transcript:', transcript);
        this.isListening = false;
        
        // Call the transcript callback if set
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(transcript);
        }
      }
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
    };
    
    this.recognition.start();
  }
  
  stopRecording(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  async processTranscript(transcript: string): Promise<void> {
    // Transcript processing is handled by the mode's processTranscript method
    // This is just a placeholder for the interface
  }
  
  async synthesizeSpeech(text: string): Promise<void> {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply config settings
    utterance.rate = this.config.settings?.voiceRate || 1.0;
    utterance.pitch = this.config.settings?.voicePitch || 1.0;
    utterance.volume = this.config.settings?.voiceVolume || 1.0;
    
    // Get available voices and select one
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.localService
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    return new Promise((resolve) => {
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }
  
  setTranscriptCallback(callback: (transcript: string) => void) {
    this.onTranscriptCallback = callback;
  }
  
  isRecording(): boolean {
    return this.isListening;
  }
}