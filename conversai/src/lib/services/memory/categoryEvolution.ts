import { createClient } from '@/lib/supabase/server';
import { EmbeddingService } from '../embeddings/embeddingService';

interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'primary' | 'sub' | 'general';
  factCount: number;
  facts: any[];
  themes: string[];
  createdAt: Date;
  parentId?: string;
}

interface CategoryRule {
  keywords: string[];
  primaryCategory: string;
  confidence: number;
}

export class CategoryEvolutionService {
  private static SPLIT_THRESHOLD = 20;
  private static MERGE_THRESHOLD = 3;
  private static MIN_CLUSTER_SIZE = 3;

  // Simple rules for initial categorization
  private static CATEGORY_RULES: CategoryRule[] = [
    {
      keywords: ['name', 'family', 'brother', 'sister', 'wife', 'husband', 'parent', 'friend'],
      primaryCategory: 'identity_relationships',
      confidence: 0.8
    },
    {
      keywords: ['cat', 'dog', 'pet', 'live', 'home', 'house', 'apartment', 'city'],
      primaryCategory: 'living_environment',
      confidence: 0.8
    },
    {
      keywords: ['work', 'job', 'developer', 'engineer', 'company', 'skill', 'project'],
      primaryCategory: 'professional',
      confidence: 0.8
    },
    {
      keywords: ['like', 'love', 'hate', 'enjoy', 'favorite', 'hobby', 'prefer'],
      primaryCategory: 'interests_preferences',
      confidence: 0.7
    },
    {
      keywords: ['allergic', 'allergy', 'medical', 'health', 'doctor', 'condition'],
      primaryCategory: 'health_medical',
      confidence: 0.9
    },
    {
      keywords: ['birthday', 'anniversary', 'date', 'year', 'month'],
      primaryCategory: 'events_dates',
      confidence: 0.7
    }
  ];

  /**
   * Initialize a new user with a general category
   */
  static async initializeUserCategories(userId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('memory_categories')
      .insert({
        user_id: userId,
        name: 'General Knowledge',
        type: 'general',
        fact_count: 0,
        facts: [],
        themes: [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error initializing categories:', error);
      throw error;
    }

    return data;
  }

  /**
   * Determine which category a new fact belongs to
   */
  static async categorizeFact(
    fact: any,
    userId: string
  ): Promise<{ categoryId: string; confidence: number }> {
    const supabase = await createClient();
    
    // Get user's existing categories
    const { data: categories } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('user_id', userId);

    if (!categories || categories.length === 0) {
      // Initialize if no categories exist
      const generalCategory = await this.initializeUserCategories(userId);
      return { categoryId: generalCategory.id, confidence: 1.0 };
    }

    // Try rule-based categorization first
    const ruleMatch = this.findCategoryByRules(fact);
    if (ruleMatch) {
      // Find or create the matched category
      const existingCategory = categories.find(c => 
        c.name.toLowerCase().includes(ruleMatch.primaryCategory.replace('_', ' '))
      );
      
      if (existingCategory) {
        return { categoryId: existingCategory.id, confidence: ruleMatch.confidence };
      }
    }

    // If no rule match or category, use general category
    const generalCategory = categories.find(c => c.type === 'general');
    if (generalCategory) {
      return { categoryId: generalCategory.id, confidence: 0.5 };
    }

    // Fallback to first category
    return { categoryId: categories[0].id, confidence: 0.3 };
  }

  /**
   * Find category based on keyword rules
   */
  private static findCategoryByRules(fact: any): CategoryRule | null {
    const factText = JSON.stringify(fact).toLowerCase();
    
    for (const rule of this.CATEGORY_RULES) {
      const matchCount = rule.keywords.filter(keyword => 
        factText.includes(keyword)
      ).length;
      
      if (matchCount > 0) {
        return rule;
      }
    }
    
    return null;
  }

  /**
   * Evaluate if a category should be split
   */
  static async evaluateForSplit(categoryId: string): Promise<boolean> {
    const supabase = await createClient();
    
    const { data: category } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (!category || category.fact_count < this.SPLIT_THRESHOLD) {
      return false;
    }

    // TODO: Implement clustering logic
    // For now, return true if over threshold
    return category.fact_count >= this.SPLIT_THRESHOLD;
  }

  /**
   * Check if small categories should be merged
   */
  static async evaluateForMerge(userId: string): Promise<string[][]> {
    const supabase = await createClient();
    
    const { data: categories } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('user_id', userId)
      .lt('fact_count', this.MERGE_THRESHOLD);

    if (!categories || categories.length < 2) {
      return [];
    }

    // Simple merge strategy: group small categories together
    // TODO: Implement similarity-based merging
    const mergeGroups: string[][] = [];
    const processed = new Set<string>();

    for (const category of categories) {
      if (processed.has(category.id)) continue;
      
      const group = [category.id];
      processed.add(category.id);
      
      // Find other small categories that could merge
      for (const other of categories) {
        if (!processed.has(other.id) && other.id !== category.id) {
          group.push(other.id);
          processed.add(other.id);
          
          // Limit merge groups to 3 categories
          if (group.length >= 3) break;
        }
      }
      
      if (group.length > 1) {
        mergeGroups.push(group);
      }
    }

    return mergeGroups;
  }

  /**
   * Add a fact to a category and update counts
   */
  static async addFactToCategory(
    categoryId: string, 
    fact: any
  ): Promise<void> {
    const supabase = await createClient();
    
    // Get current category
    const { data: category } = await supabase
      .from('memory_categories')
      .select('facts, fact_count')
      .eq('id', categoryId)
      .single();

    if (!category) {
      throw new Error('Category not found');
    }

    // Update category with new fact
    const updatedFacts = [...(category.facts || []), fact];
    
    const { error } = await supabase
      .from('memory_categories')
      .update({
        facts: updatedFacts,
        fact_count: updatedFacts.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId);

    if (error) {
      console.error('Error adding fact to category:', error);
      throw error;
    }

    // Check if category needs splitting
    if (updatedFacts.length >= this.SPLIT_THRESHOLD) {
      // Queue for evaluation (could be async job)
      console.log(`Category ${categoryId} ready for split evaluation`);
    }
  }

  /**
   * Generate a rich summary for a category
   */
  static async generateCategorySummary(categoryId: string): Promise<string> {
    const supabase = await createClient();
    
    const { data: category } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (!category || !category.facts || category.facts.length === 0) {
      return 'No facts in this category yet.';
    }

    // Extract key information from facts
    const factTypes = new Map<string, number>();
    const values = new Set<string>();

    category.facts.forEach((fact: any) => {
      factTypes.set(fact.type, (factTypes.get(fact.type) || 0) + 1);
      if (typeof fact.value === 'string') {
        values.add(fact.value);
      } else if (fact.value.name) {
        values.add(fact.value.name);
      }
    });

    // Build summary
    const summary = [
      `This category contains ${category.facts.length} facts`,
      `including ${Array.from(factTypes.keys()).join(', ')}.`,
      values.size > 0 ? `Key items: ${Array.from(values).slice(0, 5).join(', ')}` : ''
    ].filter(Boolean).join(' ');

    return summary;
  }
}