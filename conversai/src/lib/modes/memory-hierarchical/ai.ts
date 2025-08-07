import { AIProcessor, ConversationContext, Entity } from '../types';
import { ModeConfig } from '../types';

export class MemoryHierarchicalAI implements AIProcessor {
  private config: ModeConfig;
  
  constructor(config: ModeConfig) {
    this.config = config;
  }
  
  async generateResponse(
    message: string,
    context: ConversationContext
  ): Promise<string> {
    // This is handled server-side in the /api/voice/process endpoint
    // which uses GPT-4 with the hierarchical memory context
    throw new Error('Memory Hierarchical mode uses server-side AI processing');
  }
  
  async extractEntities(message: string): Promise<Entity[]> {
    // Entity extraction is handled by the server-side EntityExtractor
    // This is just a placeholder for the interface
    const entities: Entity[] = [];
    
    // Simple client-side extraction for immediate feedback
    const nameMatch = message.match(/my name is (\w+)/i);
    if (nameMatch) {
      entities.push({
        type: 'name',
        value: nameMatch[1],
        confidence: 0.9
      });
    }
    
    return entities;
  }
}