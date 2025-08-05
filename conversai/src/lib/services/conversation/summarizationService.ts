import { OpenAI } from 'openai';
import { createClient } from '@/lib/supabase/server';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface ConversationSummary {
  summary: string;
  topics: string[];
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export class SummarizationService {
  /**
   * Generate a summary of a conversation
   */
  static async summarizeConversation(
    conversationId: string
  ): Promise<ConversationSummary> {
    const supabase = await createClient();

    // Fetch conversation messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !messages?.length) {
      throw new Error('Failed to fetch conversation messages');
    }

    // Format messages for GPT
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes conversations and provides structured summaries. 
            Extract the main topics, key points, and overall sentiment from the conversation.
            Return a JSON object with the following structure:
            {
              "summary": "A concise 2-3 sentence summary",
              "topics": ["topic1", "topic2", ...] (max 5 topics),
              "keyPoints": ["point1", "point2", ...] (max 5 key points),
              "sentiment": "positive" | "neutral" | "negative"
            }`,
          },
          {
            role: 'user',
            content: `Please analyze this conversation:\n\n${conversationText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Store summary in database
      await this.storeSummary(conversationId, result);

      return result;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate conversation summary');
    }
  }

  /**
   * Store conversation summary and topics
   */
  private static async storeSummary(
    conversationId: string,
    summary: ConversationSummary
  ): Promise<void> {
    const supabase = await createClient();

    // Update conversation with summary
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({ summary: summary.summary })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation summary:', conversationError);
    }

    // Store topics
    if (summary.topics.length > 0) {
      const topicData = summary.topics.map((topic, index) => ({
        conversation_id: conversationId,
        topic: topic,
        relevance_score: 1 - (index * 0.15), // Decreasing relevance by order
      }));

      const { error: topicsError } = await supabase
        .from('conversation_topics')
        .upsert(topicData, { onConflict: 'conversation_id,topic' });

      if (topicsError) {
        console.error('Error storing conversation topics:', topicsError);
      }
    }
  }

  /**
   * Extract topics from a single message
   */
  static async extractMessageTopics(content: string): Promise<string[]> {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract key topics from the message. Return a JSON array of up to 3 most relevant topics.
            Topics should be single words or short phrases. Example: ["weather", "machine learning", "travel plans"]`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 100,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.topics || [];
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  /**
   * Generate a title for a conversation based on initial messages
   */
  static async generateConversationTitle(
    messages: Array<{ role: string; content: string }>
  ): Promise<string> {
    if (messages.length === 0) return 'New Conversation';

    const initialMessages = messages.slice(0, 4);
    const conversationStart = initialMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate a concise title (max 5 words) for this conversation based on the main topic.`,
          },
          {
            role: 'user',
            content: conversationStart,
          },
        ],
        temperature: 0.7,
        max_tokens: 20,
      });

      return response.choices[0].message.content?.trim() || 'New Conversation';
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Conversation';
    }
  }

  /**
   * Batch summarize multiple conversations
   */
  static async batchSummarize(
    conversationIds: string[]
  ): Promise<Map<string, ConversationSummary>> {
    const results = new Map<string, ConversationSummary>();

    // Process in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);
      const summaries = await Promise.all(
        batch.map(async (id) => {
          try {
            const summary = await this.summarizeConversation(id);
            return { id, summary };
          } catch (error) {
            console.error(`Failed to summarize conversation ${id}:`, error);
            return null;
          }
        })
      );

      summaries.forEach((result) => {
        if (result) {
          results.set(result.id, result.summary);
        }
      });

      // Add delay between batches
      if (i + batchSize < conversationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}