// Fallback client for when Railway service is unavailable
// Uses OpenAI API directly for basic RAG functionality

interface FallbackQueryResponse {
  answer: string;
  sources: string[];
  confidence: number;
  mode: 'fallback' | 'railway';
}

export class FallbackRAGClient {
  private railwayUrl: string;
  private maxRetries = 2;
  private retryDelay = 1000;

  constructor(railwayUrl?: string) {
    this.railwayUrl = railwayUrl || process.env.NEXT_PUBLIC_CONVERSAI_RAG_SERVICE_URL || '';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async query(question: string): Promise<FallbackQueryResponse> {
    // First, try Railway service if URL is configured
    if (this.railwayUrl) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          console.log(`Attempting Railway service (attempt ${attempt + 1}/${this.maxRetries})...`);
          
          const response = await fetch(`${this.railwayUrl}/api/query`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: question }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Railway service responded successfully');
            return {
              answer: data.answer || data.response || 'No answer provided',
              sources: data.sources || [],
              confidence: data.confidence || 0.8,
              mode: 'railway'
            };
          }

          // If we get a 502 or 503, the service might be starting up
          if (response.status === 502 || response.status === 503) {
            console.log(`Railway service unavailable (${response.status}), will retry...`);
            if (attempt < this.maxRetries - 1) {
              await this.sleep(this.retryDelay);
              continue;
            }
          }
        } catch (error) {
          console.error('Railway service error:', error);
          if (attempt < this.maxRetries - 1) {
            await this.sleep(this.retryDelay);
            continue;
          }
        }
      }
    }

    // Fallback to OpenAI API
    console.log('Falling back to OpenAI API...');
    return this.queryWithOpenAI(question);
  }

  private async queryWithOpenAI(question: string): Promise<FallbackQueryResponse> {
    try {
      // Use the OpenAI API through our Next.js API route
      const response = await fetch('/api/openai-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        answer: data.answer,
        sources: data.sources || ['OpenAI Knowledge Base'],
        confidence: 0.75,
        mode: 'fallback'
      };
    } catch (error) {
      console.error('OpenAI fallback error:', error);
      
      // Ultimate fallback - return a helpful error message
      return {
        answer: `I'm having trouble connecting to the RAG service. The system is currently being deployed. Your question was: "${question}". Please try again in a few moments.`,
        sources: ['System Message'],
        confidence: 0,
        mode: 'fallback'
      };
    }
  }

  // Health check method to test Railway availability
  async checkHealth(): Promise<{ available: boolean; mode: string }> {
    if (!this.railwayUrl) {
      return { available: false, mode: 'fallback' };
    }

    try {
      const response = await fetch(`${this.railwayUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (response.ok) {
        console.log('Railway service is healthy');
        return { available: true, mode: 'railway' };
      }
    } catch (error) {
      console.log('Railway service health check failed:', error);
    }

    return { available: false, mode: 'fallback' };
  }
}

// Singleton instance
let fallbackClient: FallbackRAGClient | null = null;

export function getFallbackRAGClient(): FallbackRAGClient {
  if (!fallbackClient) {
    fallbackClient = new FallbackRAGClient();
  }
  return fallbackClient;
}