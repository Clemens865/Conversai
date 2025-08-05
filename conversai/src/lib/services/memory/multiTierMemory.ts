import { EventEmitter } from 'events';

export interface MemoryItem {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    timestamp: Date;
    conversationId?: string;
    userId?: string;
    relevanceScore?: number;
    accessCount: number;
    lastAccessed: Date;
    tags?: string[];
    source: 'user' | 'assistant' | 'system' | 'web';
  };
}

export interface PromptTreeNode {
  id: string;
  prompt: string;
  probability: number;
  children: PromptTreeNode[];
  preloadedContext?: MemoryItem[];
  metadata: {
    depth: number;
    totalUses: number;
    successRate: number;
  };
}

export interface MemoryStrategy {
  name: string;
  initialize(): Promise<void>;
  store(item: MemoryItem): Promise<void>;
  retrieve(query: string, limit?: number): Promise<MemoryItem[]>;
  predictNext(currentContext: MemoryItem[]): Promise<PromptTreeNode>;
  getMetrics(): MemoryMetrics;
}

export interface MemoryMetrics {
  hitRate: number;
  avgLatency: number;
  memoryUsage: number;
  predictionAccuracy: number;
  itemsInSTM: number;
  itemsInLTM: number;
  activePromptTrees: number;
}

// Base class for all memory strategies
export abstract class BaseMemoryStrategy extends EventEmitter implements MemoryStrategy {
  abstract name: string;
  protected metrics: MemoryMetrics = {
    hitRate: 0,
    avgLatency: 0,
    memoryUsage: 0,
    predictionAccuracy: 0,
    itemsInSTM: 0,
    itemsInLTM: 0,
    activePromptTrees: 0
  };

  abstract initialize(): Promise<void>;
  abstract store(item: MemoryItem): Promise<void>;
  abstract retrieve(query: string, limit?: number): Promise<MemoryItem[]>;
  abstract predictNext(currentContext: MemoryItem[]): Promise<PromptTreeNode>;

  getMetrics(): MemoryMetrics {
    return { ...this.metrics };
  }

  protected updateMetric(key: keyof MemoryMetrics, value: number) {
    this.metrics[key] = value;
    this.emit('metrics-updated', this.metrics);
  }
}

// Hierarchical Memory Strategy (Default)
export class HierarchicalMemoryStrategy extends BaseMemoryStrategy {
  name = 'Hierarchical Memory';
  private stm: Map<string, MemoryItem> = new Map(); // Short-term memory
  private ltm: Map<string, MemoryItem> = new Map(); // Long-term memory (simulated)
  private workingMemory: Map<string, MemoryItem> = new Map();
  private promptTrees: Map<string, PromptTreeNode> = new Map();

  async initialize(): Promise<void> {
    // Initialize memory tiers
    this.stm.clear();
    this.ltm.clear();
    this.workingMemory.clear();
    this.promptTrees.clear();
    
    // Load frequently accessed items into STM
    // This would connect to Redis/in-memory cache in production
    console.log('Hierarchical memory initialized');
  }

  async store(item: MemoryItem): Promise<void> {
    const startTime = Date.now();
    
    // Store in STM first
    this.stm.set(item.id, item);
    this.updateMetric('itemsInSTM', this.stm.size);
    
    // If STM is full, move oldest items to LTM
    if (this.stm.size > 20) {
      const oldestItem = this.findOldestItem(this.stm);
      if (oldestItem) {
        this.ltm.set(oldestItem.id, oldestItem);
        this.stm.delete(oldestItem.id);
        this.updateMetric('itemsInLTM', this.ltm.size);
      }
    }
    
    // Update metrics
    const latency = Date.now() - startTime;
    this.updateMetric('avgLatency', (this.metrics.avgLatency + latency) / 2);
    
    // Trigger predictive loading
    this.triggerPredictiveLoading(item);
  }

  async retrieve(query: string, limit: number = 10): Promise<MemoryItem[]> {
    const startTime = Date.now();
    const results: MemoryItem[] = [];
    
    // Check STM first (fastest)
    for (const item of this.stm.values()) {
      if (this.isRelevant(item, query)) {
        results.push(item);
        item.metadata.accessCount++;
        item.metadata.lastAccessed = new Date();
      }
    }
    
    // Check working memory
    for (const item of this.workingMemory.values()) {
      if (this.isRelevant(item, query) && !results.find(r => r.id === item.id)) {
        results.push(item);
      }
    }
    
    // If not enough results, check LTM
    if (results.length < limit) {
      for (const item of this.ltm.values()) {
        if (this.isRelevant(item, query) && !results.find(r => r.id === item.id)) {
          results.push(item);
          // Promote to STM for faster future access
          this.stm.set(item.id, item);
        }
      }
    }
    
    // Update metrics
    const latency = Date.now() - startTime;
    this.updateMetric('avgLatency', (this.metrics.avgLatency + latency) / 2);
    this.updateMetric('hitRate', results.length > 0 ? 
      (this.metrics.hitRate * 0.9 + 100 * 0.1) : 
      (this.metrics.hitRate * 0.9)
    );
    
    return results.slice(0, limit);
  }

  async predictNext(currentContext: MemoryItem[]): Promise<PromptTreeNode> {
    // Build prompt tree based on current context
    const root: PromptTreeNode = {
      id: 'root',
      prompt: this.extractPrompt(currentContext),
      probability: 1.0,
      children: [],
      metadata: {
        depth: 0,
        totalUses: 0,
        successRate: 0
      }
    };
    
    // Generate possible next directions
    const predictions = this.generatePredictions(currentContext);
    
    for (const prediction of predictions) {
      const node: PromptTreeNode = {
        id: prediction.id,
        prompt: prediction.prompt,
        probability: prediction.probability,
        children: [],
        preloadedContext: await this.preloadContext(prediction.prompt),
        metadata: {
          depth: 1,
          totalUses: 0,
          successRate: 0
        }
      };
      root.children.push(node);
    }
    
    // Store prompt tree for learning
    this.promptTrees.set(root.id, root);
    this.updateMetric('activePromptTrees', this.promptTrees.size);
    
    return root;
  }

  private isRelevant(item: MemoryItem, query: string): boolean {
    // Simple relevance check - in production, use embeddings
    return item.content.toLowerCase().includes(query.toLowerCase());
  }

  private findOldestItem(memory: Map<string, MemoryItem>): MemoryItem | null {
    let oldest: MemoryItem | null = null;
    let oldestTime = Date.now();
    
    for (const item of memory.values()) {
      if (item.metadata.lastAccessed.getTime() < oldestTime) {
        oldest = item;
        oldestTime = item.metadata.lastAccessed.getTime();
      }
    }
    
    return oldest;
  }

  private triggerPredictiveLoading(item: MemoryItem): void {
    // Async predictive loading based on new information
    setTimeout(async () => {
      const predictions = this.generatePredictions([item]);
      for (const prediction of predictions) {
        const context = await this.preloadContext(prediction.prompt);
        // Store in working memory for fast access
        context.forEach(ctx => this.workingMemory.set(ctx.id, ctx));
      }
    }, 0);
  }

  private extractPrompt(context: MemoryItem[]): string {
    // Extract key prompt from context
    return context.map(item => item.content).join(' ').slice(-100);
  }

  private generatePredictions(context: MemoryItem[]): Array<{id: string, prompt: string, probability: number}> {
    // Simulate prediction generation
    // In production, use ML model for actual predictions
    const lastMessage = context[context.length - 1]?.content || '';
    
    const predictions = [];
    
    if (lastMessage.includes('weather')) {
      predictions.push(
        { id: 'weather-details', prompt: 'temperature humidity forecast', probability: 0.8 },
        { id: 'weather-activities', prompt: 'outdoor activities recommendations', probability: 0.6 },
        { id: 'weather-travel', prompt: 'travel planning weather impact', probability: 0.4 }
      );
    }
    
    if (lastMessage.includes('travel') || lastMessage.includes('trip')) {
      predictions.push(
        { id: 'travel-destinations', prompt: 'popular destinations attractions', probability: 0.9 },
        { id: 'travel-logistics', prompt: 'flights hotels transportation', probability: 0.7 },
        { id: 'travel-tips', prompt: 'local customs safety tips', probability: 0.5 }
      );
    }
    
    // Default predictions
    if (predictions.length === 0) {
      predictions.push(
        { id: 'clarification', prompt: 'more details specific questions', probability: 0.5 },
        { id: 'related-topics', prompt: 'similar topics related information', probability: 0.4 },
        { id: 'action-items', prompt: 'next steps recommendations', probability: 0.3 }
      );
    }
    
    return predictions;
  }

  private async preloadContext(prompt: string): Promise<MemoryItem[]> {
    // Simulate context preloading
    // In production, this would search vector DB and web
    const contexts: MemoryItem[] = [];
    
    // Search existing memory
    const relevant = await this.retrieve(prompt, 5);
    contexts.push(...relevant);
    
    // Add synthetic context for demo
    if (prompt.includes('weather')) {
      contexts.push({
        id: `synthetic-${Date.now()}`,
        content: 'Current weather patterns show mild temperatures with occasional rain.',
        metadata: {
          timestamp: new Date(),
          relevanceScore: 0.8,
          accessCount: 0,
          lastAccessed: new Date(),
          source: 'system'
        }
      });
    }
    
    return contexts;
  }
}

// Memory Manager - Coordinates different strategies
export class MultiTierMemoryManager {
  private strategies: Map<string, MemoryStrategy> = new Map();
  private currentStrategy: MemoryStrategy;
  private eventEmitter = new EventEmitter();

  constructor() {
    // Initialize default strategy
    const hierarchical = new HierarchicalMemoryStrategy();
    this.strategies.set('hierarchical', hierarchical);
    this.currentStrategy = hierarchical;
  }

  async initialize(): Promise<void> {
    // Initialize all strategies
    for (const strategy of this.strategies.values()) {
      await strategy.initialize();
    }
  }

  async switchStrategy(strategyName: string): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy ${strategyName} not found`);
    }
    
    this.currentStrategy = strategy;
    this.eventEmitter.emit('strategy-changed', strategyName);
  }

  async store(item: MemoryItem): Promise<void> {
    return this.currentStrategy.store(item);
  }

  async retrieve(query: string, limit?: number): Promise<MemoryItem[]> {
    return this.currentStrategy.retrieve(query, limit);
  }

  async predictNext(currentContext: MemoryItem[]): Promise<PromptTreeNode> {
    return this.currentStrategy.predictNext(currentContext);
  }

  getMetrics(): MemoryMetrics {
    return this.currentStrategy.getMetrics();
  }

  getCurrentStrategy(): string {
    return this.currentStrategy.name;
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.off(event, handler);
  }
}

// Singleton instance
export const memoryManager = new MultiTierMemoryManager();