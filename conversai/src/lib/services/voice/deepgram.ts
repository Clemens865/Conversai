import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';

export class DeepgramService {
  private client: ReturnType<typeof createClient>;
  private liveConnection: LiveClient | null = null;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  async startLiveTranscription(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: Error) => void
  ): Promise<LiveClient> {
    try {
      this.liveConnection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        punctuate: true,
        endpointing: 300,
        vad_events: true,
      });

      this.liveConnection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
      });

      this.liveConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript) {
          onTranscript(transcript, data.is_final);
        }
      });

      this.liveConnection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error);
        onError?.(new Error(error));
      });

      this.liveConnection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
      });

      return this.liveConnection;
    } catch (error) {
      console.error('Failed to start live transcription:', error);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
    try {
      console.log('Sending audio to Deepgram, size:', audioBuffer.byteLength);
      
      const { result } = await this.client.listen.prerecorded.transcribeFile(
        Buffer.from(audioBuffer),
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          mimetype: 'audio/webm',
        }
      );

      // Add proper error handling for API response
      if (!result || !result.results || !result.results.channels || result.results.channels.length === 0) {
        console.error('Invalid Deepgram response structure:', result);
        return '';
      }

      const channel = result.results.channels[0];
      if (!channel.alternatives || channel.alternatives.length === 0) {
        console.error('No alternatives in Deepgram response');
        return '';
      }

      const transcript = channel.alternatives[0].transcript || '';
      console.log('Transcription successful:', transcript.substring(0, 50) + '...');
      
      return transcript;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  stopLiveTranscription() {
    if (this.liveConnection) {
      this.liveConnection.finish();
      this.liveConnection = null;
    }
  }

  sendAudioChunk(chunk: ArrayBuffer) {
    if (this.liveConnection) {
      this.liveConnection.send(chunk);
    }
  }
}