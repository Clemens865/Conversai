export class ElevenLabsService {
  private apiKey: string;
  private voiceId: string;
  private modelId: string = 'eleven_turbo_v2';

  constructor(apiKey: string, voiceId: string = 'rachel') {
    this.apiKey = apiKey;
    this.voiceId = this.getVoiceId(voiceId);
  }

  private getVoiceId(voiceName: string): string {
    // Map voice names to ElevenLabs voice IDs
    const voiceMap: Record<string, string> = {
      'rachel': '21m00Tcm4TlvDq8ikWAM',
      'domi': 'AZnzlk1XvdvUeBnXmlld',
      'bella': 'EXAVITQu4vr4xnSDxMaL',
      'antoni': 'ErXwobaYiN019PkySvjV',
      'josh': 'TxGEqnHWrfWFTfGW9XjX',
      'arnold': 'VR6AewLTigWG4xSOukaG',
    };
    return voiceMap[voiceName] || voiceMap['rachel'];
  }

  async generateSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              style: 0.5,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('TTS generation error:', error);
      throw error;
    }
  }

  async generateSpeechStream(
    text: string,
    onChunk: (chunk: ArrayBuffer) => void
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
              style: 0.5,
              use_speaker_boost: true,
            },
            optimize_streaming_latency: 2,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(value.buffer);
      }
    } catch (error) {
      console.error('TTS streaming error:', error);
      throw error;
    }
  }

  setVoice(voiceName: string) {
    this.voiceId = this.getVoiceId(voiceName);
  }
}