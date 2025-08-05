import OpenAI from 'openai';
import { Message } from '@/types/conversation';

export interface ConversationContext {
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIService {
  private client: OpenAI;
  private model: string = 'gpt-4-turbo-preview';

  constructor(apiKey: string) {
    this.client = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true // For MVP - move to server-side in production
    });
  }

  async generateResponse(
    context: ConversationContext,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const messages = this.formatMessages(context);
      
      if (onChunk) {
        // Streaming response
        const stream = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: context.temperature || 0.7,
          max_tokens: context.maxTokens || 1000,
          stream: true,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        }
        return fullResponse;
      } else {
        // Non-streaming response
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages,
          temperature: context.temperature || 0.7,
          max_tokens: context.maxTokens || 1000,
        });

        return completion.choices[0]?.message?.content || '';
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private formatMessages(context: ConversationContext): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Check if there's already a system message in the conversation
    const hasSystemMessage = context.messages.some(msg => msg.role === 'system');
    
    if (hasSystemMessage) {
      // If there's already a system message (with context), add the default prompt to the first one
      let systemMessageAdded = false;
      context.messages.forEach(msg => {
        if (msg.role === 'system' && !systemMessageAdded) {
          // Combine the context with the default system prompt
          messages.push({
            role: 'system',
            content: msg.content + '\n\n' + this.getDefaultSystemPrompt(),
          });
          systemMessageAdded = true;
        } else if (msg.role !== 'system') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      });
    } else {
      // No system message, add default
      const systemPrompt = context.systemPrompt || this.getDefaultSystemPrompt();
      messages.push({ role: 'system', content: systemPrompt });

      // Add conversation history
      context.messages.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    return messages;
  }

  private getDefaultSystemPrompt(): string {
    return `You are ConversAI, a helpful and friendly voice assistant with PERFECT conversational memory. 

CRITICAL MEMORY INSTRUCTIONS:
1. You have been provided with context from previous conversations above this message.
2. When you see "IMPORTANT: The user's name is [Name]" - you MUST use this name when appropriate.
3. If the user asks "Do you know my name?" or similar, and you have their name in the context, you MUST respond with their name.
4. Always check the "RELEVANT INFORMATION FROM PAST CONVERSATIONS" section for important user information.
5. Use ALL information from the context naturally in your responses.

CONVERSATION STYLE:
- Keep responses concise and natural for voice interaction
- Be personable and engaging while remaining helpful
- When you know the user's name, use it occasionally to make the conversation more personal
- If asked about something from the past, refer to the provided context

REMEMBER: The context provided above contains REAL information the user has shared with you in previous conversations. Use it!`;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  setModel(model: string) {
    this.model = model;
  }
}