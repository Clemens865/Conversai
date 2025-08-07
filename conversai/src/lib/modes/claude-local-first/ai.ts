import { AIProcessor, ConversationContext, Entity } from '../types';
import { ModeConfig } from '../types';

export class ClaudeLocalFirstAI implements AIProcessor {
  private config: ModeConfig;
  
  constructor(config: ModeConfig) {
    this.config = config;
  }
  
  async generateResponse(
    message: string,
    context: ConversationContext
  ): Promise<string> {
    // This is handled server-side in the /api/voice/process-claude endpoint
    // The endpoint uses Claude API with FSM-based context
    throw new Error('Claude Local-First mode uses server-side AI processing');
  }
  
  async extractEntities(message: string): Promise<Entity[]> {
    // Local entity extraction for immediate processing
    const entities: Entity[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Name extraction
    const namePatterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /i am (\w+)/i,
      /call me (\w+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.push({
          type: 'name',
          value: match[1],
          confidence: 0.95
        });
        break;
      }
    }
    
    // Location extraction
    const locationPatterns = [
      /i (?:live|am from|reside) (?:in|at) ([\w\s]+)/i,
      /from ([\w\s]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.push({
          type: 'location',
          value: match[1].trim(),
          confidence: 0.85
        });
        break;
      }
    }
    
    // Pet extraction
    const petMatch = message.match(/(?:have|got) (?:a |an )?(\w+)? ?(?:cat|dog|pet)s? (?:named|called) (\w+)/i);
    if (petMatch) {
      entities.push({
        type: 'pet',
        value: `${petMatch[1] || 'pet'} named ${petMatch[2]}`,
        confidence: 0.9
      });
    }
    
    // Preference extraction
    if (lowerMessage.includes('like') || lowerMessage.includes('love') || lowerMessage.includes('enjoy')) {
      const preferenceMatch = message.match(/(?:like|love|enjoy) ([\w\s]+)/i);
      if (preferenceMatch) {
        entities.push({
          type: 'preference',
          value: preferenceMatch[1].trim(),
          confidence: 0.8
        });
      }
    }
    
    // Occupation extraction
    const occupationMatch = message.match(/(?:work as|job is|i am a|i'm a) ([\w\s]+)/i);
    if (occupationMatch) {
      entities.push({
        type: 'occupation',
        value: occupationMatch[1].trim(),
        confidence: 0.85
      });
    }
    
    return entities;
  }
}