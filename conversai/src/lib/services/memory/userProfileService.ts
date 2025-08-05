import { createClient } from '@/lib/supabase/server';
import { EntityExtractor } from './entityExtractor';
import { CategoryBatchingService } from './categoryBatchingService';

export interface UserProfile {
  userId: string;
  name?: string;
  preferences?: Record<string, any>;
  facts?: Record<string, any>;
  lastUpdated?: Date;
}

export class UserProfileService {
  /**
   * Extract and store user's name from their message
   */
  static async extractAndStoreName(userId: string, message: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    
    // Pattern matching for name introduction
    const namePatterns = [
      /my name is (\w+)/i,
      /i am (\w+)/i,
      /i'm (\w+)/i,
      /call me (\w+)/i,
      /this is (\w+)/i,
      /^(\w+)$/i, // Just a name by itself
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const name = match[1];
        await this.updateUserProfile(userId, { name });
        return name;
      }
    }
    
    return null;
  }
  
  /**
   * Get user profile data
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createClient();
    
    // Using 'id' column which is the actual column name
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Extract data from the existing structure
    const profileData = data.profile_data || {};
    
    return {
      userId: data.id,
      name: data.name || profileData.name,
      preferences: profileData.preferences || {},
      facts: profileData.personalFacts || {},
      lastUpdated: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  }
  
  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string, 
    updates: Partial<Omit<UserProfile, 'userId'>>
  ): Promise<void> {
    const supabase = await createClient();
    
    // First, get existing profile data
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('profile_data')
      .eq('id', userId)
      .single();
    
    const currentProfileData = existing?.profile_data || {
      userId,
      preferences: {},
      personalFacts: [],
      conversationPatterns: {}
    };
    
    // Update the profile_data with new information
    if (updates.name) {
      currentProfileData.name = updates.name;
    }
    if (updates.preferences) {
      currentProfileData.preferences = { ...currentProfileData.preferences, ...updates.preferences };
    }
    if (updates.facts) {
      currentProfileData.personalFacts = { ...currentProfileData.personalFacts, ...updates.facts };
    }
    
    currentProfileData.lastUpdated = new Date().toISOString();
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        name: updates.name || existing?.name,
        profile_data: currentProfileData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error updating user profile:', error);
    }
  }
  
  /**
   * Add a fact about the user
   */
  static async addUserFact(userId: string, key: string, value: any): Promise<void> {
    const profile = await this.getUserProfile(userId);
    const facts = profile?.facts || {};
    facts[key] = value;
    
    await this.updateUserProfile(userId, { facts });
  }
  
  /**
   * Check if this is a name-related query and get the name
   */
  static async handleNameQuery(userId: string, query: string): Promise<string | null> {
    const lowerQuery = query.toLowerCase();
    
    // Check if this is asking about name
    const isAskingName = 
      lowerQuery.includes('my name') ||
      lowerQuery.includes('what am i called') ||
      lowerQuery.includes('who am i') ||
      lowerQuery.includes('do you know me') ||
      lowerQuery.includes('remember me');
    
    if (isAskingName) {
      const profile = await this.getUserProfile(userId);
      return profile?.name || null;
    }
    
    return null;
  }

  /**
   * Process a message to extract entities and store them in categories
   */
  static async processMessageForMemory(userId: string, message: string): Promise<void> {
    try {
      // Extract entities from the message
      const entities = await EntityExtractor.extractEntities(message);
      
      if (entities.length === 0) {
        return;
      }

      // Batch entities into categories
      await CategoryBatchingService.batchFactsIntoCategories(userId, entities);

      // Special handling for name entities
      for (const entity of entities) {
        if (entity.type === 'name' && typeof entity.value === 'string') {
          // Update the user profile with the name for quick access
          await this.updateUserProfile(userId, { name: entity.value });
        }
      }

      console.log(`Processed ${entities.length} entities into categories for user ${userId}`);
    } catch (error) {
      console.error('Error processing message for memory:', error);
    }
  }

  /**
   * Ensure user has a general category initialized
   */
  static async ensureUserCategoriesInitialized(userId: string): Promise<void> {
    try {
      await CategoryBatchingService.getOrCreateGeneralCategory(userId);
    } catch (error) {
      console.error('Error initializing user categories:', error);
    }
  }
}