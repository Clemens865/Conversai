import { createClient } from '@/lib/supabase/server';

export interface UserProfile {
  userId: string;
  name?: string;
  preferences: {
    preferredName?: string;
    location?: string;
    occupation?: string;
    interests: string[];
    language?: string;
    timezone?: string;
  };
  personalFacts: Array<{
    fact: string;
    confidence: number;
    firstMentioned: Date;
    lastConfirmed: Date;
    source: string; // conversation_id where mentioned
  }>;
  conversationPatterns: {
    commonTopics: string[];
    preferredGreeting?: string;
    communicationStyle?: string;
  };
  lastUpdated: Date;
}

export class UserProfileManager {
  private supabase: any;
  private profileCache: Map<string, UserProfile> = new Map();

  async initialize() {
    this.supabase = await createClient();
  }

  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    // Check cache first
    if (this.profileCache.has(userId)) {
      return this.profileCache.get(userId)!;
    }

    // Check database for existing profile
    const { data: existingProfile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile?.profile_data) {
      const profile = existingProfile.profile_data as UserProfile;
      this.profileCache.set(userId, profile);
      return profile;
    }

    // Create new profile
    const newProfile: UserProfile = {
      userId,
      preferences: {
        interests: []
      },
      personalFacts: [],
      conversationPatterns: {
        commonTopics: []
      },
      lastUpdated: new Date()
    };

    // Save to database
    await this.saveProfile(userId, newProfile);
    this.profileCache.set(userId, newProfile);
    return newProfile;
  }

  async updateProfileFromConversation(
    userId: string, 
    conversationId: string,
    messages: Array<{role: string, content: string}>
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    let updated = false;

    for (const message of messages) {
      if (message.role === 'user') {
        // Extract name
        const nameMatch = message.content.match(/my name is (\w+)/i) ||
                         message.content.match(/i am (\w+)/i) ||
                         message.content.match(/i'm (\w+)/i) ||
                         message.content.match(/call me (\w+)/i);
        
        if (nameMatch && !profile.name) {
          profile.name = nameMatch[1];
          profile.preferences.preferredName = nameMatch[1];
          this.addPersonalFact(profile, `User's name is ${nameMatch[1]}`, conversationId);
          updated = true;
          console.log(`Learned user's name: ${nameMatch[1]}`);
        }

        // Extract location
        const locationMatch = message.content.match(/i (?:live in|am from|am in) ([^.!?]+)/i);
        if (locationMatch && !profile.preferences.location) {
          profile.preferences.location = locationMatch[1].trim();
          this.addPersonalFact(profile, `Lives in ${locationMatch[1]}`, conversationId);
          updated = true;
        }

        // Extract occupation
        const jobMatch = message.content.match(/i (?:work as|am a|work in|do) ([^.!?]+)/i);
        if (jobMatch && !profile.preferences.occupation) {
          profile.preferences.occupation = jobMatch[1].trim();
          this.addPersonalFact(profile, `Works as ${jobMatch[1]}`, conversationId);
          updated = true;
        }

        // Extract interests
        const interestMatch = message.content.match(/i (?:like|love|enjoy|interested in) ([^.!?]+)/i);
        if (interestMatch) {
          const interest = interestMatch[1].trim();
          if (!profile.preferences.interests.includes(interest)) {
            profile.preferences.interests.push(interest);
            this.addPersonalFact(profile, `Interested in ${interest}`, conversationId);
            updated = true;
          }
        }
      }
    }

    if (updated) {
      profile.lastUpdated = new Date();
      await this.saveProfile(userId, profile);
      console.log('Updated user profile with new information');
    }
  }

  private addPersonalFact(profile: UserProfile, fact: string, conversationId: string) {
    const existingFact = profile.personalFacts.find(f => f.fact === fact);
    
    if (existingFact) {
      existingFact.lastConfirmed = new Date();
      existingFact.confidence = Math.min(1, existingFact.confidence + 0.1);
    } else {
      profile.personalFacts.push({
        fact,
        confidence: 0.9,
        firstMentioned: new Date(),
        lastConfirmed: new Date(),
        source: conversationId
      });
    }
  }

  async saveProfile(userId: string, profile: UserProfile): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        name: profile.name,
        profile_data: profile,
        updated_at: new Date()
      });
    
    this.profileCache.set(userId, profile);
  }

  async searchUserHistory(userId: string, query: string): Promise<any[]> {
    // Search across ALL user's conversations
    const { data: allMessages } = await this.supabase
      .from('messages')
      .select('*, conversations!inner(user_id)')
      .eq('conversations.user_id', userId)
      .or(`content.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    return allMessages || [];
  }

  buildUserContext(profile: UserProfile): string {
    const facts: string[] = [];

    if (profile.name) {
      facts.push(`The user's name is ${profile.name}.`);
    }

    if (profile.preferences.location) {
      facts.push(`They live in ${profile.preferences.location}.`);
    }

    if (profile.preferences.occupation) {
      facts.push(`They work as ${profile.preferences.occupation}.`);
    }

    if (profile.preferences.interests.length > 0) {
      facts.push(`They are interested in: ${profile.preferences.interests.join(', ')}.`);
    }

    // Add high-confidence personal facts
    const highConfidenceFacts = profile.personalFacts
      .filter(f => f.confidence > 0.7)
      .map(f => f.fact);
    
    facts.push(...highConfidenceFacts);

    if (facts.length === 0) {
      return "This is a new user. Learn about them as you converse.";
    }

    return `User Profile Information:\n${facts.join('\n')}\n\nUse this information to provide personalized responses.`;
  }
}

// Singleton instance
export const userProfileManager = new UserProfileManager();