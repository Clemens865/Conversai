import { createClient } from '@/lib/supabase/server';
import { EmbeddingService } from '../embeddings/embeddingService';
import { CategoryEvolutionService } from './categoryEvolution';

interface CategoryBatch {
  categoryId: string;
  categoryName: string;
  facts: any[];
  summary: string;
  embedding?: number[];
}

export class CategoryBatchingService {
  /**
   * Process and batch facts into categories with rich embeddings
   */
  static async batchFactsIntoCategories(
    userId: string,
    newFacts: any[]
  ): Promise<void> {
    const supabase = await createClient();

    // Process each fact
    for (const fact of newFacts) {
      // Determine which category this fact belongs to
      const { categoryId, confidence } = await CategoryEvolutionService.categorizeFact(
        fact, 
        userId
      );

      // Add fact to the category
      await CategoryEvolutionService.addFactToCategory(categoryId, fact);
    }

    // Update embeddings for affected categories
    await this.updateCategoryEmbeddings(userId);

    // Check if any categories need evolution (split/merge)
    await this.evaluateCategoryEvolution(userId);
  }

  /**
   * Update embeddings for all categories that have changed
   */
  static async updateCategoryEmbeddings(userId: string): Promise<void> {
    const supabase = await createClient();

    // Get categories that need embedding updates
    const { data: categories } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('user_id', userId)
      .gt('fact_count', 0);

    if (!categories) return;

    for (const category of categories) {
      // Check if embedding exists and is up to date
      const { data: existingEmbedding } = await supabase
        .from('category_embeddings')
        .select('created_at')
        .eq('category_id', category.id)
        .single();

      // Skip if embedding is recent (within last hour)
      if (existingEmbedding && 
          new Date(existingEmbedding.created_at) > 
          new Date(Date.now() - 60 * 60 * 1000)) {
        continue;
      }

      // Generate rich content for embedding
      const content = await this.generateCategoryContent(category);
      
      // Create embedding
      const embedding = await EmbeddingService.generateEmbedding(content);

      // Store or update embedding
      await supabase
        .from('category_embeddings')
        .upsert({
          category_id: category.id,
          embedding,
          content,
          content_type: 'full_batch',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'category_id'
        });
    }
  }

  /**
   * Generate rich content for category embedding
   */
  static async generateCategoryContent(category: any): Promise<string> {
    const facts = category.facts || [];
    const themes = category.themes || [];
    
    // Build comprehensive content
    const sections = [
      `Category: ${category.name}`,
      `Type: ${category.type}`,
      themes.length > 0 ? `Themes: ${themes.join(', ')}` : null,
      `Contains ${facts.length} facts:`,
    ].filter(Boolean);

    // Add fact summaries
    const factSummaries = facts.map((fact: any) => {
      if (typeof fact.value === 'string') {
        return `- ${fact.type}: ${fact.value}`;
      }
      if (fact.value.name) {
        return `- ${fact.type}: ${fact.value.name} ${fact.value.details || ''}`;
      }
      return `- ${fact.type}: ${JSON.stringify(fact.value)}`;
    });

    // Combine everything
    return [...sections, ...factSummaries].join('\n');
  }

  /**
   * Evaluate if categories need splitting or merging
   */
  static async evaluateCategoryEvolution(userId: string): Promise<void> {
    const supabase = await createClient();

    // Get all user categories
    const { data: categories } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('user_id', userId)
      .order('fact_count', { ascending: false });

    if (!categories) return;

    // Check for categories that need splitting
    for (const category of categories) {
      if (await CategoryEvolutionService.evaluateForSplit(category.id)) {
        console.log(`Category ${category.name} is ready for splitting`);
        // TODO: Implement actual splitting logic
      }
    }

    // Check for categories that need merging
    const mergeGroups = await CategoryEvolutionService.evaluateForMerge(userId);
    if (mergeGroups.length > 0) {
      console.log(`Found ${mergeGroups.length} groups of categories to merge`);
      // TODO: Implement actual merging logic
    }
  }

  /**
   * Retrieve category batches for context
   */
  static async retrieveCategoryBatches(
    userId: string,
    query: string,
    limit: number = 3
  ): Promise<CategoryBatch[]> {
    const supabase = await createClient();
    
    // Generate embedding for the query
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    // Search for relevant categories using vector similarity
    const { data: matches } = await supabase.rpc('search_category_embeddings', {
      query_embedding: queryEmbedding,
      user_id: userId,
      similarity_threshold: 0.5,
      match_count: limit
    });

    if (!matches || matches.length === 0) {
      // Fallback to returning general category
      const { data: generalCategory } = await supabase
        .from('memory_categories')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'general')
        .single();

      if (generalCategory) {
        return [{
          categoryId: generalCategory.id,
          categoryName: generalCategory.name,
          facts: generalCategory.facts || [],
          summary: await CategoryEvolutionService.generateCategorySummary(generalCategory.id)
        }];
      }
      
      return [];
    }

    // Build category batches with full context
    const batches: CategoryBatch[] = [];
    
    for (const match of matches) {
      const { data: category } = await supabase
        .from('memory_categories')
        .select('*')
        .eq('id', match.category_id)
        .single();

      if (category) {
        batches.push({
          categoryId: category.id,
          categoryName: category.name,
          facts: category.facts || [],
          summary: await CategoryEvolutionService.generateCategorySummary(category.id),
          embedding: match.embedding
        });
      }
    }

    return batches;
  }

  /**
   * Get or create general category for user
   */
  static async getOrCreateGeneralCategory(userId: string): Promise<string> {
    const supabase = await createClient();
    
    // Check if user has general category
    const { data: existing } = await supabase
      .from('memory_categories')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'general')
      .single();

    if (existing) {
      return existing.id;
    }

    // Create general category
    const { data: newCategory } = await supabase
      .from('memory_categories')
      .insert({
        user_id: userId,
        name: 'General Knowledge',
        type: 'general',
        facts: [],
        themes: []
      })
      .select()
      .single();

    if (!newCategory) {
      throw new Error('Failed to create general category');
    }

    return newCategory.id;
  }
}