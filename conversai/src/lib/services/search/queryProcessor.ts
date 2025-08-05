import { Message } from '@/types/conversation';
import { SearchQuery, QueryContext } from '@/types/search';

export class QueryProcessor {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
  ]);

  private questionWords = new Set([
    'what', 'when', 'where', 'who', 'why', 'how', 'which', 'whose'
  ]);

  private intentKeywords = {
    information: ['what is', 'define', 'explain', 'meaning', 'definition'],
    current_events: ['news', 'latest', 'recent', 'today', 'current', 'breaking', 'update'],
    research: ['study', 'research', 'analysis', 'report', 'paper', 'findings'],
    troubleshooting: ['error', 'problem', 'issue', 'fix', 'solve', 'debug', 'help']
  };

  /**
   * Process a search query with conversation context to create an optimized search
   */
  async processQuery(
    originalQuery: string, 
    conversationContext: Message[], 
    conversationId: string,
    userId?: string
  ): Promise<SearchQuery> {
    const context = this.analyzeContext(conversationContext);
    const enhancedQuery = this.enhanceQuery(originalQuery, context);
    const intent = this.detectIntent(originalQuery, context);
    
    return {
      query: enhancedQuery,
      conversationContext: context.recentMessages,
      userId,
      maxResults: this.getOptimalResultCount(intent),
      allowCache: true,
      timeRange: this.getOptimalTimeRange(intent, originalQuery)
    };
  }

  /**
   * Analyze conversation context to extract relevant information
   */
  private analyzeContext(messages: Message[]): QueryContext {
    const recentMessages = messages
      .slice(-5) // Last 5 messages
      .map(m => m.content)
      .filter(content => content.length > 0);

    const allText = recentMessages.join(' ').toLowerCase();
    const keywords = this.extractKeywords(allText);
    const entities = this.extractEntities(allText);
    
    return {
      conversationId: messages[0]?.id || '',
      recentMessages,
      keywords,
      entities
    };
  }

  /**
   * Enhance the original query with context-aware improvements
   */
  private enhanceQuery(originalQuery: string, context: QueryContext): string {
    let enhancedQuery = originalQuery.trim();
    
    // Add relevant keywords from context if they're not already in the query
    const queryLower = enhancedQuery.toLowerCase();
    const relevantKeywords = context.keywords
      .filter(keyword => 
        !queryLower.includes(keyword.toLowerCase()) && 
        keyword.length > 2 &&
        !this.stopWords.has(keyword.toLowerCase())
      )
      .slice(0, 3); // Limit to 3 additional keywords

    if (relevantKeywords.length > 0) {
      enhancedQuery += ` ${relevantKeywords.join(' ')}`;
    }

    // Add entity context if relevant
    const relevantEntities = context.entities
      .filter(entity => 
        !queryLower.includes(entity.toLowerCase()) && 
        entity.length > 2
      )
      .slice(0, 2); // Limit to 2 entities

    if (relevantEntities.length > 0) {
      enhancedQuery += ` ${relevantEntities.join(' ')}`;
    }

    return enhancedQuery.trim();
  }

  /**
   * Detect user intent from query and context
   */
  private detectIntent(query: string, context: QueryContext): 'information' | 'current_events' | 'research' | 'troubleshooting' {
    const queryLower = query.toLowerCase();
    const contextText = context.recentMessages.join(' ').toLowerCase();
    const combinedText = `${queryLower} ${contextText}`;

    // Check for each intent type
    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      const matchCount = keywords.reduce((count, keyword) => {
        return count + (combinedText.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (matchCount > 0) {
        return intent as any;
      }
    }

    // Default based on question words
    if (this.hasQuestionWords(queryLower)) {
      return 'information';
    }

    return 'information'; // Default intent
  }

  /**
   * Extract keywords from text using frequency analysis
   */
  private extractKeywords(text: string): string[] {
    const words = text
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .map(word => word.toLowerCase())
      .filter(word => 
        word.length > 2 && 
        !this.stopWords.has(word) &&
        !this.questionWords.has(word)
      );

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Return top keywords by frequency
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Extract named entities (simple pattern-based approach)
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Capitalized words (potential proper nouns)
    const capitalizedPattern = /\b[A-Z][a-z]+\b/g;
    const matches = text.match(capitalizedPattern) || [];
    
    // Filter and deduplicate
    const uniqueEntities = new Set(
      matches
        .filter(match => match.length > 2)
        .filter(match => !this.stopWords.has(match.toLowerCase()))
    );

    return Array.from(uniqueEntities).slice(0, 5);
  }

  /**
   * Check if the query contains question words
   */
  private hasQuestionWords(query: string): boolean {
    return Array.from(this.questionWords).some(word => query.includes(word));
  }

  /**
   * Determine optimal number of results based on intent
   */
  private getOptimalResultCount(intent: string): number {
    switch (intent) {
      case 'current_events':
        return 15; // More results for news/current events
      case 'research':
        return 20; // Maximum for research queries
      case 'troubleshooting':
        return 10; // Focused results for problem-solving
      case 'information':
      default:
        return 8; // Standard count for general information
    }
  }

  /**
   * Determine optimal time range based on intent and query
   */
  private getOptimalTimeRange(intent: string, query: string): 'day' | 'week' | 'month' | 'year' | 'all' {
    const queryLower = query.toLowerCase();
    
    // Explicit time indicators in query
    if (queryLower.includes('today') || queryLower.includes('now')) {
      return 'day';
    }
    if (queryLower.includes('this week') || queryLower.includes('recent')) {
      return 'week';
    }
    if (queryLower.includes('this month') || queryLower.includes('latest')) {
      return 'month';
    }
    
    // Intent-based time ranges
    switch (intent) {
      case 'current_events':
        return 'week'; // Recent news
      case 'research':
        return 'year'; // Recent research but not too narrow
      case 'troubleshooting':
        return 'all'; // All available solutions
      case 'information':
      default:
        return 'all'; // No time restriction for general info
    }
  }

  /**
   * Generate search suggestions based on context
   */
  generateSearchSuggestions(context: QueryContext, originalQuery: string): string[] {
    const suggestions: string[] = [];
    const queryLower = originalQuery.toLowerCase();
    
    // Add keyword-based suggestions
    context.keywords.slice(0, 3).forEach(keyword => {
      if (!queryLower.includes(keyword.toLowerCase())) {
        suggestions.push(`${originalQuery} ${keyword}`);
      }
    });

    // Add entity-based suggestions
    context.entities.slice(0, 2).forEach(entity => {
      if (!queryLower.includes(entity.toLowerCase())) {
        suggestions.push(`${originalQuery} ${entity}`);
      }
    });

    // Add question variations
    if (!this.hasQuestionWords(queryLower)) {
      suggestions.push(`what is ${originalQuery}`);
      suggestions.push(`how to ${originalQuery}`);
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }
}