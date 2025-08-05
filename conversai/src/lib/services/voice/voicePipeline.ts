import { DeepgramService } from './deepgram';
import { ElevenLabsService } from './elevenlabs';
import { OpenAIService } from '../ai/openai';
import { MemoryManager } from '../memory/memoryManager';
import { ConversationService } from '../conversation';
import { Message } from '@/types/conversation';

export interface VoicePipelineConfig {
  deepgramApiKey: string;
  elevenLabsApiKey: string;
  openAIApiKey: string;
  userId: string;
  conversationId: string;
  preferredVoice?: string;
}

export class VoicePipeline {
  private deepgram: DeepgramService;
  private elevenLabs: ElevenLabsService;
  private openAI: OpenAIService;
  private memory: MemoryManager;
  private conversation: ConversationService;
  
  private isProcessing: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private config: VoicePipelineConfig;

  constructor(config: VoicePipelineConfig) {
    this.config = config;
    this.deepgram = new DeepgramService(config.deepgramApiKey);
    this.elevenLabs = new ElevenLabsService(config.elevenLabsApiKey, config.preferredVoice);
    this.openAI = new OpenAIService(config.openAIApiKey);
    this.memory = new MemoryManager();
    this.memory.setOpenAIService(this.openAI);
    this.conversation = new ConversationService();
    
    // Initialize audio context for web audio playback
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }

  async startListening(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onResponse: (response: string) => void,
    onError?: (error: Error) => void
  ) {
    try {
      let accumulatedTranscript = '';
      let silenceTimer: NodeJS.Timeout | null = null;

      await this.deepgram.startLiveTranscription(
        async (transcript, isFinal) => {
          onTranscript(transcript, isFinal);
          
          if (isFinal) {
            accumulatedTranscript += ' ' + transcript;
            
            // Reset silence timer
            if (silenceTimer) clearTimeout(silenceTimer);
            
            // Wait for a pause to process the complete utterance
            silenceTimer = setTimeout(async () => {
              if (accumulatedTranscript.trim() && !this.isProcessing) {
                await this.processUserInput(
                  accumulatedTranscript.trim(),
                  onResponse,
                  onError
                );
                accumulatedTranscript = '';
              }
            }, 1000); // 1 second pause detection
          }
        },
        onError
      );
    } catch (error) {
      onError?.(error as Error);
    }
  }

  async processUserInput(
    userInput: string,
    onResponse: (response: string) => void,
    onError?: (error: Error) => void
  ) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Save user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      };

      // Get conversation context
      const context = await this.memory.getRecentContext(this.config.conversationId);
      
      // Search for relevant past conversations
      const relevantMemories = await this.memory.searchMemory(
        userInput,
        this.config.userId,
        3
      );

      // Build context with memories
      let systemPrompt = this.buildSystemPromptWithMemories(relevantMemories);

      // Generate AI response
      let aiResponse = '';
      await this.openAI.generateResponse(
        {
          messages: [...context, userMessage],
          systemPrompt,
          temperature: 0.7,
        },
        (chunk) => {
          aiResponse += chunk;
          onResponse(aiResponse);
        }
      );

      // Save assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      // Save both messages to database
      if (this.config.conversationId) {
        await this.conversation.addMessage(
          this.config.conversationId,
          'user',
          userInput
        );
        await this.conversation.addMessage(
          this.config.conversationId,
          'assistant',
          aiResponse
        );
      }

      // Generate and play TTS
      await this.generateAndPlaySpeech(aiResponse);

    } catch (error) {
      console.error('Processing error:', error);
      onError?.(error as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  private buildSystemPromptWithMemories(memories: any[]): string {
    let prompt = `You are ConversAI, a helpful and friendly voice assistant with conversational memory. 
Keep your responses concise and natural for voice interaction.`;

    if (memories.length > 0) {
      prompt += '\n\nRelevant past conversations:\n';
      memories.forEach(memory => {
        const date = new Date(memory.message.timestamp).toLocaleDateString();
        prompt += `- On ${date}: "${memory.message.content}"\n`;
      });
      prompt += '\nYou may reference these past conversations when relevant.';
    }

    return prompt;
  }

  async generateAndPlaySpeech(text: string) {
    try {
      // Use streaming for lower latency
      await this.elevenLabs.generateSpeechStream(text, (chunk) => {
        this.audioQueue.push(chunk);
        if (!this.isPlaying) {
          this.playAudioQueue();
        }
      });
    } catch (error) {
      console.error('TTS error:', error);
    }
  }

  private async playAudioQueue() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    
    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!;
      await this.playAudioChunk(chunk);
    }
    
    this.isPlaying = false;
  }

  private async playAudioChunk(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      return new Promise((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }

  sendAudioChunk(chunk: ArrayBuffer) {
    this.deepgram.sendAudioChunk(chunk);
  }

  stop() {
    this.deepgram.stopLiveTranscription();
    this.audioQueue = [];
    this.isPlaying = false;
  }

  setUserId(userId: string) {
    this.config.userId = userId;
  }

  setConversationId(conversationId: string) {
    this.config.conversationId = conversationId;
  }
}