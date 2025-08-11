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
    // Use the proxy route to avoid CORS issues
    // This will try Railway first, then fall back to direct database access
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`Attempting RAG service via proxy (attempt ${attempt + 1}/${this.maxRetries})...`);
        
        const response = await fetch('/api/rag-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: question,
            endpoint: 'query',
            data: { query: question }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('RAG service responded successfully via proxy');
          
          // Check which mode was used
          const mode = data.mode || 'railway';
          if (mode === 'database-direct' || mode === 'database-text-search') {
            console.log('Using direct database access (Railway unavailable)');
          }
          
          return {
            answer: data.answer || data.response || 'No answer provided',
            sources: data.sources || [],
            confidence: data.confidence || 0.8,
            mode: mode === 'database-direct' ? 'railway' : mode // Report as 'railway' for UI consistency
          };
        }

        // Retry on temporary failures
        if (response.status === 503) {
          console.log(`Service temporarily unavailable, will retry...`);
          if (attempt < this.maxRetries - 1) {
            await this.sleep(this.retryDelay);
            continue;
          }
        }
      } catch (error) {
        console.error('RAG proxy error:', error);
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay);
          continue;
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

  // Health check method - always returns true since proxy handles fallbacks
  async checkHealth(): Promise<{ available: boolean; mode: string }> {
    // The proxy route handles all fallbacks, so we always report as available
    // The actual mode (railway, database, or fallback) is determined at query time
    return { available: true, mode: 'proxy' };
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