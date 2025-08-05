import { CachedSearchResult, SearchResult } from '@/types/search';

export class SearchCache {
  private cache = new Map<string, CachedSearchResult>();
  private defaultTTL = 30 * 60 * 1000; // 30 minutes
  private maxCacheSize = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup process
    this.startCleanup();
  }

  /**
   * Get cached search results
   */
  async get(query: string, userId?: string): Promise<SearchResult[] | null> {
    const cacheKey = this.generateCacheKey(query, userId);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access time (LRU)
    cached.timestamp = new Date();
    
    return cached.results;
  }

  /**
   * Store search results in cache
   */
  async set(
    query: string, 
    results: SearchResult[], 
    userId?: string, 
    ttlMs?: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(query, userId);
    const ttl = ttlMs || this.defaultTTL;
    const expiresAt = new Date(Date.now() + ttl);

    const cachedResult: CachedSearchResult = {
      id: cacheKey,
      query,
      results,
      timestamp: new Date(),
      expiresAt,
      userId
    };

    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, cachedResult);
  }

  /**
   * Check if a query is cached and not expired
   */
  has(query: string, userId?: string): boolean {
    const cacheKey = this.generateCacheKey(query, userId);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return false;
    }

    return new Date() <= cached.expiresAt;
  }

  /**
   * Invalidate cache for a specific query
   */
  invalidate(query: string, userId?: string): void {
    const cacheKey = this.generateCacheKey(query, userId);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries for a user
   */
  invalidateUser(userId: string): void {
    for (const [key, cached] of this.cache.entries()) {
      if (cached.userId === userId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Generate cache key from query and user
   */
  private generateCacheKey(query: string, userId?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const userPart = userId ? `::${userId}` : '';
    return `search:${this.hashString(normalizedQuery)}${userPart}`;
  }

  /**
   * Simple string hashing for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Evict oldest cache entry (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Search cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup process
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const cached of this.cache.values()) {
      // Rough estimation of object size in bytes
      totalSize += JSON.stringify(cached).length * 2; // UTF-16 encoding
    }
    
    return totalSize;
  }

  /**
   * Get similar cached queries for suggestions
   */
  getSimilarQueries(query: string, limit: number = 5): string[] {
    const queryLower = query.toLowerCase();
    const similar: Array<{ query: string; score: number }> = [];

    for (const cached of this.cache.values()) {
      const cachedQueryLower = cached.query.toLowerCase();
      const similarity = this.calculateSimilarity(queryLower, cachedQueryLower);
      
      if (similarity > 0.3 && similarity < 1.0) { // Not identical but similar
        similar.push({ query: cached.query, score: similarity });
      }
    }

    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.query);
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}