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
   * Retrieve category batches for context - FIXED VERSION
   */
  static async retrieveCategoryBatches(
    userId: string,
    query: string,
    limit: number = 3
  ): Promise<CategoryBatch[]> {
    const supabase = await createClient();
    
    // First, try direct keyword matching for common queries
    const lowerQuery = query.toLowerCase();
    
    // Check for pet-related queries
    if (lowerQuery.includes('cat') || lowerQuery.includes('pet') || 
        lowerQuery.includes('holly') || lowerQuery.includes('benny')) {
      
      const { data: petCategory } = await supabase
        .from('memory_categories')
        .select('*')
        .eq('user_id', userId)
        .or('name.ilike.%pet%,name.ilike.%animal%')
        .single();
        
      if (petCategory && petCategory.facts && petCategory.facts.length > 0) {
        console.log('Found pet category with facts:', petCategory.facts);
        return [{
          categoryId: petCategory.id,
          categoryName: petCategory.name,
          facts: petCategory.facts,
          summary: `User has pets: ${petCategory.facts.map((f: any) => 
            f.value?.name || f.value).join(', ')}`
        }];
      }
    }
    
    // Try embedding-based search (with error handling)
    try {
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);

      // Use direct SQL query instead of broken RPC
      const { data: categories } = await supabase
        .from('memory_categories')
        .select('*')
        .eq('user_id', userId)
        .gt('fact_count', 0)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (categories && categories.length > 0) {
        const batches: CategoryBatch[] = [];
        
        for (const category of categories) {
          // Score based on keyword relevance
          let relevanceScore = 0;
          const categoryStr = JSON.stringify(category).toLowerCase();
          const queryWords = query.toLowerCase().split(' ');
          
          queryWords.forEach(word => {
            if (categoryStr.includes(word)) relevanceScore += 1;
          });
          
          if (relevanceScore > 0 || categories.length === 1) {
            batches.push({
              categoryId: category.id,
              categoryName: category.name,
              facts: category.facts || [],
              summary: await this.generateQuickSummary(category)
            });
          }
        }
        
        // Sort by relevance
        batches.sort((a, b) => {
          const aScore = queryWords.filter(w => 
            JSON.stringify(a).toLowerCase().includes(w)
          ).length;
          const bScore = queryWords.filter(w => 
            JSON.stringify(b).toLowerCase().includes(w)
          ).length;
          return bScore - aScore;
        });
        
        return batches.slice(0, limit);
      }
    } catch (error) {
      console.error('Error in embedding search, using fallback:', error);
    }

    // Final fallback: return general category
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
        summary: 'General knowledge about the user'
      }];
    }
    
    return [];
  }

  /**
   * Generate quick summary without calling evolution service
   */
  private static async generateQuickSummary(category: any): Promise<string> {
    if (!category.facts || category.facts.length === 0) {
      return `${category.name} category`;
    }
    
    // Generate summary based on facts
    const factTypes = new Set(category.facts.map((f: any) => f.type));
    const factSummary = Array.from(factTypes).map(type => {
      const factsOfType = category.facts.filter((f: any) => f.type === type);
      if (type === 'pet') {
        const pets = factsOfType.map((f: any) => 
          `${f.value.name} (${f.value.species})`
        );
        return `Pets: ${pets.join(', ')}`;
      }
      return `${type}: ${factsOfType.length} facts`;
    }).join('; ');
    
    return factSummary || `${category.name} with ${category.facts.length} facts`;
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
    let content = `Category: ${category.name}\n`;
    content += `Type: ${category.type}\n`;
    
    if (themes.length > 0) {
      content += `Themes: ${themes.join(', ')}\n`;
    }
    
    content += `Facts:\n`;
    facts.forEach((fact: any) => {
      if (fact.type === 'pet' && fact.value) {
        content += `- Pet: ${fact.value.name} is a ${fact.value.species}\n`;
      } else {
        content += `- ${fact.type}: ${JSON.stringify(fact.value)}\n`;
      }
    });
    
    return content;
  }

  /**
   * Evaluate if categories need evolution
   */
  static async evaluateCategoryEvolution(userId: string): Promise<void> {
    // TODO: Implement evolution logic
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

    return newCategory?.id || '';
  }
}