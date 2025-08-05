import { UserProfileService } from './userProfileService';

export interface ExtractedEntity {
  type: 'name' | 'pet' | 'location' | 'relationship' | 'preference' | 'date' | 'medical' | 'work';
  value: any;
  confidence: number;
  rawText: string;
}

export class EntityExtractor {
  private static patterns = {
    pets: [
      {
        pattern: /(?:my|i have a?|the) (\w+) (?:cat|dog|pet|bird|fish|hamster|rabbit)s? (?:is |are )?(?:named|called|is) (\w+)/gi,
        extract: (match: RegExpMatchArray) => ({ count: match[1], species: 'pet', name: match[2] })
      },
      {
        pattern: /(\w+) (?:is|are) my (\w+)s?/gi,
        extract: (match: RegExpMatchArray) => ({ name: match[1], species: match[2] })
      },
      {
        pattern: /(?:i have|we have) (\w+) (\w+)s? (?:named|called) (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ count: match[1], species: match[2], names: match[3] })
      }
    ],
    
    locations: [
      {
        pattern: /i (?:live|reside|stay) (?:in|at) ([A-Za-z\s]+)/gi,
        extract: (match: RegExpMatchArray) => ({ type: 'residence', location: match[1].trim() })
      },
      {
        pattern: /i(?:'m| am) from ([A-Za-z\s]+)/gi,
        extract: (match: RegExpMatchArray) => ({ type: 'origin', location: match[1].trim() })
      },
      {
        pattern: /i work (?:in|at) ([A-Za-z\s]+)/gi,
        extract: (match: RegExpMatchArray) => ({ type: 'work', location: match[1].trim() })
      }
    ],
    
    relationships: [
      {
        pattern: /my (\w+) (?:is |is named |is called )?(\w+)/gi,
        extract: (match: RegExpMatchArray) => {
          const relationshipTypes = ['wife', 'husband', 'partner', 'brother', 'sister', 'mother', 'father', 'son', 'daughter', 'friend'];
          if (relationshipTypes.includes(match[1].toLowerCase())) {
            return { relationship: match[1], name: match[2] };
          }
          return null;
        }
      }
    ],
    
    preferences: [
      {
        pattern: /i (?:love|like|enjoy|prefer) (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ preference: 'likes', value: match[1].trim() })
      },
      {
        pattern: /i (?:hate|dislike|don't like|can't stand) (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ preference: 'dislikes', value: match[1].trim() })
      },
      {
        pattern: /my favorite (\w+) is (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ preference: 'favorite', type: match[1], value: match[2].trim() })
      }
    ],
    
    dates: [
      {
        pattern: /my (\w+) is (?:on )?(\w+ \d+(?:st|nd|rd|th)?(?:,? \d{4})?)/gi,
        extract: (match: RegExpMatchArray) => {
          const dateTypes = ['birthday', 'anniversary', 'wedding'];
          if (dateTypes.includes(match[1].toLowerCase())) {
            return { type: match[1], date: match[2] };
          }
          return null;
        }
      }
    ],
    
    medical: [
      {
        pattern: /i(?:'m| am) allergic to (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ type: 'allergy', value: match[1].trim() })
      },
      {
        pattern: /i (?:have|suffer from) (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ type: 'condition', value: match[1].trim() })
      }
    ],
    
    work: [
      {
        pattern: /i(?:'m| am) (?:a|an) (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ profession: match[1].trim() })
      },
      {
        pattern: /i work (?:as|in|at|for) (.+?)(?:\.|,|$)/gi,
        extract: (match: RegExpMatchArray) => ({ work: match[1].trim() })
      }
    ]
  };
  
  /**
   * Extract all entities from a message
   */
  static async extractEntities(message: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
    // Skip extraction if this is a question
    const isQuestion = /\?$/.test(message.trim()) || 
                      /^(what|who|where|when|why|how|do you|can you|could you|would you|will you|are you|is)\s/i.test(message.trim());
    
    if (isQuestion) {
      return entities; // Don't extract entities from questions
    }
    
    // Check each pattern category
    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const { pattern, extract } of patterns) {
        const regex = new RegExp(pattern);
        let match;
        
        while ((match = regex.exec(message)) !== null) {
          const extracted = extract(match);
          if (extracted) {
            entities.push({
              type: category as any,
              value: extracted,
              confidence: 0.8, // Could be improved with NLP confidence scoring
              rawText: match[0]
            });
          }
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Process and store extracted entities using the new category system
   */
  static async processAndStoreEntities(userId: string, message: string): Promise<void> {
    // Use the new category-based memory processing
    await UserProfileService.processMessageForMemory(userId, message);
  }
}