import { BaseSearchProvider } from './base';
import { SearchResult, SearchQuery, SearchResponse } from '@/types/search';

export class ClaudeSearchProvider extends BaseSearchProvider {
  constructor() {
    super('claude', {
      enabled: true,
      priority: 1, // Highest priority
      rateLimit: { requestsPerMinute: 20, requestsPerDay: 500 },
      timeout: 15000
    });
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    if (!this.checkRateLimit()) {
      throw this.createSearchError('Rate limit exceeded', 'RATE_LIMIT', true);
    }

    try {
      this.incrementRequestCount();
      
      // Prepare the search query with context if available
      let searchQuery = query.query;
      if (query.conversationContext && query.conversationContext.length > 0) {
        // Add context to improve search relevance
        const context = query.conversationContext.slice(-3).join(' '); // Last 3 messages
        searchQuery = `${query.query} context: ${context}`;
      }

      // Add time range filter if specified
      if (query.timeRange && query.timeRange !== 'all') {
        searchQuery += ` site:recent ${query.timeRange}`;
      }

      // Use the WebSearch tool (this would be implemented in the API route)
      const results = await this.performClaudeSearch(searchQuery, query.maxResults || 10);
      
      const searchTime = Date.now() - startTime;
      
      return {
        results,
        query: query.query,
        totalResults: results.length,
        searchTime,
        provider: 'claude',
        fromCache: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw this.createSearchError(`Claude search failed: ${errorMessage}`, 'SEARCH_ERROR', true);
    }
  }

  private async performClaudeSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    // This is a placeholder for the actual Claude WebSearch implementation
    // In practice, this would be called from the API route where WebSearch tool is available
    
    // For now, return a mock structure that shows what the results would look like
    // The actual implementation will be in the API route
    return [];
  }

  // Helper method to format results from Claude WebSearch tool
  static formatClaudeResults(rawResults: any[], query: string): SearchResult[] {
    if (!Array.isArray(rawResults)) {
      return [];
    }

    return rawResults.map((result, index) => ({
      id: `claude_${this.generateId(result.url || result.title || index.toString())}`,
      title: result.title || 'Untitled',
      url: result.url || '',
      snippet: this.sanitizeSnippet(result.snippet || result.description || ''),
      provider: 'claude' as const,
      timestamp: new Date(),
      relevanceScore: this.calculateRelevanceScore(result, query, index),
      imageUrl: result.imageUrl,
      source: result.source || this.extractDomain(result.url)
    }));
  }

  private static generateId(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private static sanitizeSnippet(snippet: string): string {
    return snippet
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 300);
  }

  private static calculateRelevanceScore(result: any, query: string, position: number): number {
    let score = 1.0 - (position * 0.1); // Position-based scoring
    
    // Boost score based on query term matches in title
    const queryTerms = query.toLowerCase().split(/\s+/);
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || result.description || '').toLowerCase();
    
    queryTerms.forEach(term => {
      if (title.includes(term)) {
        score += 0.3;
      }
      if (snippet.includes(term)) {
        score += 0.1;
      }
    });

    // Boost for recent content
    if (result.publishedDate) {
      const daysSincePublished = (Date.now() - new Date(result.publishedDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished < 7) {
        score += 0.2; // Boost recent content
      }
    }

    return Math.min(score, 2.0); // Cap at 2.0
  }

  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }
}