export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  provider: SearchProvider;
  timestamp: Date;
  relevanceScore?: number;
  imageUrl?: string;
  source?: string;
}

export interface SearchQuery {
  query: string;
  conversationContext?: string[];
  userId?: string;
  maxResults?: number;
  allowCache?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  searchTime: number;
  provider: SearchProvider;
  fromCache: boolean;
  nextPageToken?: string;
}

export interface CachedSearchResult {
  id: string;
  query: string;
  results: SearchResult[];
  timestamp: Date;
  expiresAt: Date;
  userId?: string;
}

export interface SearchProviderConfig {
  name: SearchProvider;
  enabled: boolean;
  priority: number;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  timeout: number;
}

export interface SearchError {
  provider: SearchProvider;
  error: string;
  code?: string;
  retryable: boolean;
}

export type SearchProvider = 'claude' | 'google' | 'bing' | 'duckduckgo';

export interface QueryContext {
  conversationId: string;
  recentMessages: string[];
  userIntent?: 'information' | 'current_events' | 'research' | 'troubleshooting';
  keywords: string[];
  entities: string[];
}

export interface SearchMetrics {
  provider: SearchProvider;
  queryTime: number;
  resultCount: number;
  cacheHit: boolean;
  error?: string;
  timestamp: Date;
}

export interface SearchPreferences {
  userId: string;
  preferredProviders: SearchProvider[];
  maxResults: number;
  cacheEnabled: boolean;
  contextAware: boolean;
  timeRange: 'day' | 'week' | 'month' | 'year' | 'all';
}