# Intelligent Category Evolution System

## Core Design Principles

### 1. Dynamic Category System
Instead of fixed categories, use an adaptive system that evolves based on data density and relationships.

### 2. Hierarchical Categories with Auto-Merging

```typescript
// Primary Categories (Broader)
const PRIMARY_CATEGORIES = {
  IDENTITY: {
    // Merges: personal info, family, relationships
    minFacts: 3,
    includes: ['name', 'age', 'family', 'friends', 'background']
  },
  
  LIVING: {
    // Merges: pets, home, locations, daily life
    minFacts: 5,
    includes: ['pets', 'residence', 'routine', 'environment']
  },
  
  INTERESTS: {
    // Merges: hobbies, preferences, activities
    minFacts: 5,
    includes: ['likes', 'dislikes', 'hobbies', 'entertainment', 'food']
  },
  
  PROFESSIONAL: {
    // Merges: work, skills, education, projects
    minFacts: 5,
    includes: ['job', 'skills', 'education', 'career', 'goals']
  },
  
  HEALTH_LIFESTYLE: {
    // Merges: medical, fitness, diet, wellness
    minFacts: 3,
    includes: ['medical', 'allergies', 'fitness', 'diet', 'conditions']
  },
  
  MEMORIES_EVENTS: {
    // Merges: dates, experiences, stories
    minFacts: 4,
    includes: ['birthdays', 'anniversaries', 'experiences', 'travel']
  },
  
  KNOWLEDGE_DOCS: {
    // Merges: uploaded documents, learned information
    minFacts: 1,
    includes: ['documents', 'notes', 'references', 'learned_facts']
  }
};
```

### 3. Evolution Logic

```typescript
class CategoryEvolutionService {
  // Start with one general category
  async initializeUser(userId: string) {
    return {
      'general': {
        facts: [],
        factCount: 0,
        lastSplit: null
      }
    };
  }

  // Split when a category gets too large
  async evaluateForSplit(category: Category) {
    if (category.factCount > 20) {
      // Analyze facts using embeddings clustering
      const clusters = await this.clusterFacts(category.facts);
      
      // Only split if we have meaningful clusters
      if (clusters.length > 1 && clusters.every(c => c.size >= 3)) {
        return this.splitCategory(category, clusters);
      }
    }
  }

  // Merge when categories are too small
  async evaluateForMerge(categories: Category[]) {
    const smallCategories = categories.filter(c => c.factCount < 3);
    
    if (smallCategories.length > 1) {
      // Find most similar categories to merge
      const similarity = await this.calculateCategorySimilarity(smallCategories);
      return this.mergeSimilarCategories(similarity);
    }
  }

  // Auto-categorize new facts
  async categorizeFact(fact: ExtractedEntity, userCategories: Category[]) {
    // First, try rule-based categorization
    const primaryCategory = this.findPrimaryCategoryByRules(fact);
    
    // Then, use embedding similarity to existing categories
    const bestMatch = await this.findBestCategoryMatch(fact, userCategories);
    
    // If no good match, consider creating new category or adding to general
    if (bestMatch.similarity < 0.6) {
      return 'general';
    }
    
    return bestMatch.categoryId;
  }
}
```

### 4. Smart Batching Strategy

```typescript
interface CategoryBatch {
  id: string;
  name: string;
  type: 'primary' | 'sub' | 'merged';
  factCount: number;
  density: number; // facts per topic
  cohesion: number; // how related the facts are
  
  // Rich context for better embeddings
  summary: string;
  themes: string[];
  relationships: Map<string, string[]>;
  
  // Evolution metadata
  createdAt: Date;
  lastModified: Date;
  splitFrom?: string;
  mergedFrom?: string[];
}
```

### 5. Example Evolution Timeline

**Week 1: Initial State**
```
└── General (all facts)
    ├── "My name is Clemens"
    ├── "I have two cats"
    └── "I work as a developer"
```

**Week 2: First Split (>10 facts)**
```
├── Personal (5 facts)
│   ├── "My name is Clemens"
│   └── "I live in Berlin"
└── General (7 facts)
    ├── "I have two cats"
    └── "I work as a developer"
```

**Month 1: Natural Categories Emerge**
```
├── Identity & Living (12 facts)
│   ├── Personal info
│   ├── Pets (Holly, Benny)
│   └── Home life
├── Professional (8 facts)
│   ├── Work details
│   └── Skills
└── Interests (6 facts)
    ├── Hobbies
    └── Preferences
```

**Month 3: Refined Categories**
```
├── Life & Identity (18 facts) [cohesion: 0.85]
├── Professional Journey (15 facts) [cohesion: 0.92]
├── Interests & Activities (11 facts) [cohesion: 0.78]
└── Knowledge Base (30 facts) [from uploaded docs]
```

### 6. Benefits of This Approach

1. **Natural Evolution**: Categories grow organically based on what you actually talk about
2. **Optimal Density**: No sparse categories - they merge when too small
3. **Better Embeddings**: Richer context from related facts grouped together
4. **Flexible Growth**: System adapts as you share more information
5. **Document Integration**: Uploaded documents create their own knowledge categories

### 7. Implementation Priority

1. Start with a simple "general" category
2. Implement fact counting and basic splitting at 20 facts
3. Add embedding-based clustering for intelligent splits
4. Implement merge logic for sparse categories
5. Add document processing as a special category type