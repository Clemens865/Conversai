import { VoiceProcessor } from '../types';
import { ModeConfig } from '../types';

export class MemoryHierarchicalVoice implements VoiceProcessor {
  private config: ModeConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  constructor(config: ModeConfig) {
    this.config = config;
  }
  
  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';
    
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.start(100); // 100ms chunks
  }
  
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
  
  async processTranscript(transcript: string): Promise<void> {
    // In memory-hierarchical mode, transcript processing happens server-side
    // This is handled by the main processAudio method
  }
  
  async synthesizeSpeech(text: string): Promise<void> {
    // Speech synthesis happens server-side with ElevenLabs
    // The audio is returned as base64 in the response
  }
  
  getAudioBlob(): Blob {
    return new Blob(this.audioChunks, { type: 'audio/webm' });
  }
}