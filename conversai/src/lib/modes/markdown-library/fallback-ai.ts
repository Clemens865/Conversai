// Fallback to standard OpenAI API when Realtime API is not available
import { OpenAIService } from '@/lib/services/ai/openai'
import { Message } from '@/types/conversation'

export class MarkdownLibraryFallbackAI {
  private openAI: OpenAIService | null = null
  
  initialize(apiKey: string): void {
    this.openAI = new OpenAIService(apiKey)
  }
  
  async generateResponse(text: string, context: string): Promise<string> {
    if (!this.openAI) {
      throw new Error('OpenAI service not initialized')
    }
    
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: text,
        timestamp: new Date()
      }
    ]
    
    const systemPrompt = `You are ConversAI, a helpful AI assistant with access to detailed personal information about the user.

${context}

Use this information naturally in conversations. Remember details about the user and reference them when relevant.`
    
    return await this.openAI.generateResponse({
      messages,
      systemPrompt,
      temperature: 0.7
    })
  }
}