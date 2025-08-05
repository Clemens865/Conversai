import { BaseSearchProvider } from './providers/base';
import { ClaudeSearchProvider } from './providers/claude';
import { QueryProcessor } from './queryProcessor';
import { SearchCache } from './searchCache';
import { MemoryManager } from '../memory/memoryManager';
import { 
  SearchQuery, 
  SearchResponse, 
  SearchResult, 
  SearchError, 
  SearchMetrics, 
  SearchPreferences,
  SearchProvider 
} from '@/types/search';
import { Message } from '@/types/conversation';

export class WebSearchService {
  private providers: Map<SearchProvider, BaseSearchProvider> = new Map();
  private queryProcessor: QueryProcessor;
  private cache: SearchCache;
  private memoryManager: MemoryManager;
  private metrics: SearchMetrics[] = [];
  private maxMetricsHistory = 1000;

  constructor(memoryManager: MemoryManager) {
    this.queryProcessor = new QueryProcessor();
    this.cache = new SearchCache();
    this.memoryManager = memoryManager;
    
    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Main search method that coordinates all providers and features
   */
  async search(
    query: string,
    conversationContext: Message[] = [],
    conversationId: string,
    userId?: string,
    preferences?: Partial<SearchPreferences>
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    let searchResponse: SearchResponse;
    let fromCache = false;

    try {
      // Process query with context
      const processedQuery = await this.queryProcessor.processQuery(
        query,
        conversationContext,
        conversationId,
        userId
      );

      // Apply user preferences
      if (preferences) {
        Object.assign(processedQuery, preferences);
      }

      // Check cache first
      if (processedQuery.allowCache) {
        const cachedResults = await this.cache.get(processedQuery.query, userId);
        if (cachedResults) {
          fromCache = true;
          searchResponse = {
            results: cachedResults,
            query: processedQuery.query,
            totalResults: cachedResults.length,
            searchTime: Date.now() - startTime,
            provider: 'claude', // Primary provider
            fromCache: true
          };

          await this.recordMetrics('claude', Date.now() - startTime, cachedResults.length, true);
          return searchResponse;
        }
      }

      // Execute search with fallback providers
      searchResponse = await this.executeSearchWithFallback(processedQuery);
      
      // Rank and filter results
      searchResponse.results = await this.rankResults(searchResponse.results, processedQuery);
      
      // Cache results
      if (processedQuery.allowCache && searchResponse.results.length > 0) {
        await this.cache.set(processedQuery.query, searchResponse.results, userId);
      }

      // Store in memory for future reference
      await this.storeInMemory(searchResponse, conversationId, userId);

      // Record metrics
      await this.recordMetrics(
        searchResponse.provider,
        searchResponse.searchTime,
        searchResponse.results.length,
        false
      );

      return searchResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown search error';
      await this.recordMetrics('claude', Date.now() - startTime, 0, false, errorMessage);
      
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  /**
   * Execute search with automatic fallback to alternative providers
   */
  private async executeSearchWithFallback(query: SearchQuery): Promise<SearchResponse> {
    const providers = this.getOrderedProviders();
    const errors: SearchError[] = [];

    for (const provider of providers) {
      if (!provider.isEnabled()) {
        continue;
      }

      try {
        const response = await provider.search(query);
        return response;
      } catch (error) {
        const searchError = error as SearchError;
        errors.push(searchError);
        
        console.warn(`Search provider ${provider.getProvider()} failed:`, searchError.error);
        
        // If not retryable, skip to next provider
        if (!searchError.retryable) {
          continue;
        }
      }
    }

    // All providers failed
    throw new Error(`All search providers failed. Errors: ${errors.map(e => e.error).join(', ')}`);
  }

  /**
   * Rank search results based on relevance and context
   */
  private async rankResults(results: SearchResult[], query: SearchQuery): Promise<SearchResult[]> {
    if (results.length <= 1) {
      return results;
    }

    // Calculate enhanced relevance scores
    const rankedResults = results.map(result => ({
      ...result,
      relevanceScore: this.calculateEnhancedRelevanceScore(result, query)
    }));

    // Sort by relevance score (descending)
    rankedResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Apply diversity filter to avoid too many results from the same domain
    return this.applyDiversityFilter(rankedResults, query.maxResults || 10);
  }

  /**
   * Calculate enhanced relevance score based on multiple factors
   */
  private calculateEnhancedRelevanceScore(result: SearchResult, query: SearchQuery): number {
    let score = result.relevanceScore || 0;
    
    const queryTerms = query.query.toLowerCase().split(/\s+/);
    const title = result.title.toLowerCase();
    const snippet = result.snippet.toLowerCase();
    
    // Title matching boost
    queryTerms.forEach(term => {
      if (title.includes(term)) {
        score += 0.4;
      }
      if (snippet.includes(term)) {
        score += 0.2;
      }
    });

    // Exact phrase matching
    if (title.includes(query.query.toLowerCase())) {
      score += 0.6;
    }
    if (snippet.includes(query.query.toLowerCase())) {
      score += 0.3;
    }

    // Domain authority boost (simplified)
    const domain = this.extractDomain(result.url);
    const authorityBoost = this.getDomainAuthorityBoost(domain);
    score += authorityBoost;

    // Context relevance boost
    if (query.conversationContext) {
      const contextScore = this.calculateContextRelevance(result, query.conversationContext);
      score += contextScore;
    }

    // Recency boost for time-sensitive queries
    if (query.timeRange && query.timeRange !== 'all') {
      const recencyScore = this.calculateRecencyScore(result, query.timeRange);
      score += recencyScore;
    }

    return Math.max(0, score);
  }

  /**
   * Apply diversity filter to results
   */
  private applyDiversityFilter(results: SearchResult[], maxResults: number): SearchResult[] {
    const domainCounts = new Map<string, number>();
    const filteredResults: SearchResult[] = [];
    const maxPerDomain = Math.max(2, Math.floor(maxResults / 4)); // Max 25% from same domain

    for (const result of results) {
      if (filteredResults.length >= maxResults) {
        break;
      }

      const domain = this.extractDomain(result.url);
      const currentCount = domainCounts.get(domain) || 0;

      if (currentCount < maxPerDomain) {
        filteredResults.push(result);
        domainCounts.set(domain, currentCount + 1);
      }
    }

    return filteredResults;
  }

  /**
   * Store search results in memory for future reference
   */
  private async storeInMemory(
    response: SearchResponse,
    conversationId: string,
    userId?: string
  ): Promise<void> {
    try {
      if (!userId) return;

      const memoryKey = `search_${Date.now()}_${conversationId}`;
      const memoryData = {
        query: response.query,
        results: response.results.slice(0, 5), // Store top 5 results
        timestamp: new Date().toISOString(),
        conversationId,
        provider: response.provider
      };

      // Store in memory manager (assuming it has a generic storage method)
      // This would need to be implemented based on the actual MemoryManager interface
      console.log(`Storing search results in memory: ${memoryKey}`, memoryData);
      
    } catch (error) {
      console.error('Failed to store search results in memory:', error);
    }
  }

  /**
   * Get search suggestions based on query and context
   */
  async getSearchSuggestions(
    query: string,
    conversationContext: Message[] = [],
    limit: number = 5
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Get cache-based suggestions
    const cacheSuggestions = this.cache.getSimilarQueries(query, 3);
    suggestions.push(...cacheSuggestions);

    // Get context-based suggestions
    if (conversationContext.length > 0) {
      const context = await this.queryProcessor.processQuery(
        query,
        conversationContext,
        'suggestions'
      );
      const contextSuggestions = this.queryProcessor.generateSearchSuggestions(
        {
          conversationId: 'suggestions',
          recentMessages: context.conversationContext || [],
          keywords: [],
          entities: []
        },
        query
      );
      suggestions.push(...contextSuggestions);
    }

    // Remove duplicates and limit
    return Array.from(new Set(suggestions)).slice(0, limit);
  }

  /**
   * Get search metrics
   */
  getMetrics(): SearchMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return this.cache.getStats();
  }

  // Private helper methods

  private initializeProviders(): void {
    // Initialize Claude provider (primary)
    this.providers.set('claude', new ClaudeSearchProvider());
    
    // Additional providers can be added here
    // this.providers.set('google', new GoogleSearchProvider());
    // this.providers.set('bing', new BingSearchProvider());
    // this.providers.set('duckduckgo', new DuckDuckGoSearchProvider());
  }

  private getOrderedProviders(): BaseSearchProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.isEnabled())
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private getDomainAuthorityBoost(domain: string): number {
    // Simple domain authority scoring
    const highAuthority = ['wikipedia.org', 'github.com', 'stackoverflow.com', 'medium.com'];
    const mediumAuthority = ['reddit.com', 'quora.com', 'youtube.com'];
    
    if (highAuthority.includes(domain)) return 0.3;
    if (mediumAuthority.includes(domain)) return 0.1;
    return 0;
  }

  private calculateContextRelevance(result: SearchResult, context: string[]): number {
    if (!context || context.length === 0) return 0;
    
    const contextText = context.join(' ').toLowerCase();
    const resultText = `${result.title} ${result.snippet}`.toLowerCase();
    
    const contextWords = contextText.split(/\s+/);
    const matchCount = contextWords.reduce((count, word) => {
      return count + (resultText.includes(word) ? 1 : 0);
    }, 0);
    
    return Math.min(0.3, matchCount * 0.05); // Cap at 0.3
  }

  private calculateRecencyScore(result: SearchResult, timeRange: string): number {
    // This would need actual publication date from the result
    // For now, return a small boost for recent queries
    return 0.1;
  }

  private async recordMetrics(
    provider: SearchProvider,
    queryTime: number,
    resultCount: number,
    cacheHit: boolean,
    error?: string
  ): Promise<void> {
    const metric: SearchMetrics = {
      provider,
      queryTime,
      resultCount,
      cacheHit,
      error,
      timestamp: new Date()
    };

    this.metrics.push(metric);
    
    // Keep metrics history limited
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }
}