import { StorageProcessor, Message, UserProfile } from '../types';
import { ModeConfig } from '../types';
import { localFirstStorage, LocalConversationState } from '@/lib/services/memory/localFirstStorage';

export class ClaudeLocalFirstStorage implements StorageProcessor {
  private config: ModeConfig;
  private currentConversationId: string = '';
  private currentUserId: string = '';
  
  constructor(config: ModeConfig) {
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    await localFirstStorage.initialize();
  }
  
  setCurrentConversation(conversationId: string, userId: string) {
    this.currentConversationId = conversationId;
    this.currentUserId = userId;
  }
  
  async saveMessage(message: Message): Promise<void> {
    if (!this.currentConversationId || !this.currentUserId) {
      console.error('No conversation context set');
      return;
    }
    
    // Get or create conversation state
    let state = await localFirstStorage.getState(this.currentConversationId);
    if (!state) {
      state = localFirstStorage.createInitialState(this.currentConversationId, this.currentUserId);
    }
    
    // Add message to short-term memory
    state.shortTermMemory.push({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    });
    
    // Keep only last 10 messages in short-term memory
    if (state.shortTermMemory.length > 10) {
      state.shortTermMemory = state.shortTermMemory.slice(-10);
    }
    
    // Update metadata
    state.metadata.updated = new Date();
    state.metadata.interactionCount++;
    
    // Extract entities and update profile if it's a user message
    if (message.role === 'user') {
      await this.extractAndSaveFacts(message.content, state);
    }
    
    await localFirstStorage.saveState(state);
  }
  
  async getConversationHistory(conversationId: string): Promise<Message[]> {
    const state = await localFirstStorage.getState(conversationId);
    if (!state) {
      return [];
    }
    
    return state.shortTermMemory.map((msg, index) => ({
      id: `msg-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }
  
  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!this.currentConversationId) {
      console.error('No conversation context set');
      return;
    }
    
    const state = await localFirstStorage.getState(this.currentConversationId);
    if (!state) {
      return;
    }
    
    // Update profile in state
    state.userProfile.name = profile.name;
    state.userProfile.preferences = profile.preferences;
    state.userProfile.facts = profile.facts;
    
    await localFirstStorage.saveState(state);
  }
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // In local-first mode, we aggregate profiles from all conversations
    const conversations = await localFirstStorage.getUserConversations(userId);
    
    if (conversations.length === 0) {
      return null;
    }
    
    // Get the most recent conversation's profile
    const mostRecent = conversations.sort((a, b) => 
      b.metadata.updated.getTime() - a.metadata.updated.getTime()
    )[0];
    
    return {
      id: userId,
      name: mostRecent.userProfile.name,
      preferences: mostRecent.userProfile.preferences,
      facts: mostRecent.userProfile.facts
    };
  }
  
  private async extractAndSaveFacts(message: string, state: LocalConversationState): Promise<void> {
    const lowerMessage = message.toLowerCase();
    console.log('Extracting facts from message:', message);
    
    // Name extraction - expanded patterns
    const namePatterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /i am (\w+)/i,
      /call me (\w+)/i,
      /this is (\w+)/i
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = message.match(pattern);
      if (nameMatch && !state.userProfile.name) {
        state.userProfile.name = nameMatch[1];
        state.userProfile.facts.push({
          fact: `User's name is ${nameMatch[1]}`,
          confidence: 0.95,
          timestamp: new Date(),
          source: 'user'
        });
        console.log('Extracted name:', nameMatch[1]);
        break;
      }
    }
    
    // Pet extraction
    const petMatch = message.match(/(?:i have|my) (?:a |an )?(\w+) (?:cat|dog|pet)s? (?:named|called) (\w+)/i);
    if (petMatch) {
      const fact = `Has a ${petMatch[1]} named ${petMatch[2]}`;
      if (!state.userProfile.facts.some(f => f.fact === fact)) {
        state.userProfile.facts.push({
          fact,
          confidence: 0.9,
          timestamp: new Date(),
          source: 'user'
        });
      }
    }
    
    // Location extraction
    const locationMatch = message.match(/i (?:live|am from|reside) (?:in|at) ([\w\s]+)/i);
    if (locationMatch) {
      state.userProfile.preferences.location = locationMatch[1].trim();
      const fact = `Lives in ${locationMatch[1].trim()}`;
      if (!state.userProfile.facts.some(f => f.fact === fact)) {
        state.userProfile.facts.push({
          fact,
          confidence: 0.85,
          timestamp: new Date(),
          source: 'user'
        });
      }
    }
    
    // Preference extraction
    if (lowerMessage.includes('like') || lowerMessage.includes('love')) {
      const prefMatch = message.match(/(?:like|love) ([\w\s]+)/i);
      if (prefMatch) {
        const preference = prefMatch[1].trim();
        if (!state.userProfile.preferences.interests) {
          state.userProfile.preferences.interests = [];
        }
        if (!state.userProfile.preferences.interests.includes(preference)) {
          state.userProfile.preferences.interests.push(preference);
          state.userProfile.facts.push({
            fact: `Likes ${preference}`,
            confidence: 0.8,
            timestamp: new Date(),
            source: 'user'
          });
        }
      }
    }
    
    // Update conversation state based on content
    state.currentState = localFirstStorage.transitionState(state, message);
  }
}