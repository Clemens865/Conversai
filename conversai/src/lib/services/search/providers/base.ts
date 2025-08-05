import { SearchResult, SearchQuery, SearchResponse, SearchError, SearchProvider } from '@/types/search';

export abstract class BaseSearchProvider {
  protected provider: SearchProvider;
  protected enabled: boolean = true;
  protected priority: number = 1;
  protected rateLimit: { requestsPerMinute: number; requestsPerDay: number };
  protected timeout: number = 10000;
  protected lastRequestTime: Date | null = null;
  protected requestCount: { minute: number; day: number; lastReset: Date } = {
    minute: 0,
    day: 0,
    lastReset: new Date()
  };

  constructor(provider: SearchProvider, config?: Partial<{
    enabled: boolean;
    priority: number;
    rateLimit: { requestsPerMinute: number; requestsPerDay: number };
    timeout: number;
  }>) {
    this.provider = provider;
    if (config) {
      this.enabled = config.enabled ?? this.enabled;
      this.priority = config.priority ?? this.priority;
      this.rateLimit = config.rateLimit ?? { requestsPerMinute: 10, requestsPerDay: 100 };
      this.timeout = config.timeout ?? this.timeout;
    } else {
      this.rateLimit = { requestsPerMinute: 10, requestsPerDay: 100 };
    }
  }

  abstract search(query: SearchQuery): Promise<SearchResponse>;

  isEnabled(): boolean {
    return this.enabled;
  }

  getPriority(): number {
    return this.priority;
  }

  getProvider(): SearchProvider {
    return this.provider;
  }

  protected checkRateLimit(): boolean {
    const now = new Date();
    const timeSinceReset = now.getTime() - this.requestCount.lastReset.getTime();
    
    // Reset counters if needed
    if (timeSinceReset >= 60 * 60 * 1000) { // 1 hour
      this.requestCount.day = 0;
      this.requestCount.lastReset = now;
    }
    
    if (timeSinceReset >= 60 * 1000) { // 1 minute
      this.requestCount.minute = 0;
    }

    // Check limits
    if (this.requestCount.minute >= this.rateLimit.requestsPerMinute) {
      return false;
    }
    
    if (this.requestCount.day >= this.rateLimit.requestsPerDay) {
      return false;
    }

    return true;
  }

  protected incrementRequestCount(): void {
    this.requestCount.minute++;
    this.requestCount.day++;
    this.lastRequestTime = new Date();
  }

  protected async withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
    const timeout = timeoutMs || this.timeout;
    
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  protected createSearchError(error: string, code?: string, retryable: boolean = true): SearchError {
    return {
      provider: this.provider,
      error,
      code,
      retryable
    };
  }

  protected generateResultId(url: string, provider: SearchProvider): string {
    // Create a consistent ID based on URL and provider
    const hash = this.simpleHash(url + provider);
    return `${provider}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  protected sanitizeSnippet(snippet: string): string {
    // Remove HTML tags and normalize whitespace
    return snippet
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 300);
  }

  protected extractImageUrl(result: any): string | undefined {
    // Common patterns for extracting image URLs from search results
    if (result.pagemap?.cse_image?.[0]?.src) {
      return result.pagemap.cse_image[0].src;
    }
    if (result.pagemap?.cse_thumbnail?.[0]?.src) {
      return result.pagemap.cse_thumbnail[0].src;
    }
    if (result.image?.thumbnailLink) {
      return result.image.thumbnailLink;
    }
    return undefined;
  }
}