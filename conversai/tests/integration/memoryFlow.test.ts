import { MemoryManager } from '../../src/lib/services/memory/memoryManager';
import { UserProfileManager } from '../../src/lib/services/memory/userProfileManager';
import { EntityExtractor } from '../../src/lib/services/memory/entityExtractor';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-key';

// Mock OpenAI service for testing
class MockOpenAIService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Return a mock embedding based on text hash for consistency
    const hash = this.simpleHash(text);
    return Array(1536).fill(0).map((_, i) => (hash + i) % 100 / 100);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

function createTestUserId(): string {
  return `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createTestConversationId(): string {
  return `test-conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

describe('Memory System Integration Tests', () => {
  let memoryManager: MemoryManager;
  let userProfileManager: UserProfileManager;
  let supabase: any;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test database connection
    supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_KEY);
    
    // Initialize managers
    memoryManager = new MemoryManager();
    memoryManager.setOpenAIService(new MockOpenAIService() as any);
    
    userProfileManager = new UserProfileManager();
    await userProfileManager.initialize();
    
    testUserId = createTestUserId();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(() => {
    testUserId = createTestUserId();
  });

  async function cleanupTestData() {
    if (supabase) {
      // Clean up test data
      await supabase.from('messages').delete().like('conversation_id', 'test-conv-%');
      await supabase.from('conversations').delete().like('id', 'test-conv-%');
      await supabase.from('user_profiles').delete().like('id', 'test-user-%');
    }
  }

  describe('End-to-End Memory Flow', () => {
    test('should store and retrieve basic facts across conversations', async () => {
      const conversationId1 = createTestConversationId();
      const conversationId2 = createTestConversationId();

      // Conversation 1: User introduces themselves
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'Hi, my name is Sarah and I have a cat named Mittens' },
        { role: 'assistant', content: 'Nice to meet you Sarah! Tell me more about Mittens.' },
        { role: 'user', content: 'Mittens is a tabby cat who loves to sleep in sunny spots' }
      ]);

      // Verify facts were extracted and stored
      const profile1 = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile1.name).toBe('Sarah');
      expect(profile1.personalFacts.some(f => f.fact.includes('cat named Mittens'))).toBe(true);

      // Conversation 2: Different conversation, should remember facts
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'I also live in Portland and work as a designer' }
      ]);

      // Check that both old and new facts are preserved
      const profile2 = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile2.name).toBe('Sarah');
      expect(profile2.personalFacts.some(f => f.fact.includes('cat named Mittens'))).toBe(true);
      expect(profile2.preferences.location).toBe('Portland');
      expect(profile2.preferences.occupation).toBe('a designer');

      // Build context and verify it contains all information
      const context = userProfileManager.buildUserContext(profile2);
      expect(context).toContain('Sarah');
      expect(context).toContain('Portland');
      expect(context).toContain('designer');
    });

    test('should handle fact updates and corrections', async () => {
      const conversationId1 = createTestConversationId();
      const conversationId2 = createTestConversationId();

      // Initial fact
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'I live in Boston and work as a teacher' }
      ]);

      const profile1 = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile1.preferences.location).toBe('Boston');
      expect(profile1.preferences.occupation).toBe('a teacher');

      // Update/correction in later conversation
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'Actually, I moved to New York last month and now work as a software engineer' }
      ]);

      const profile2 = await userProfileManager.getOrCreateProfile(testUserId);
      // Current implementation might not handle "moved to" properly - this test documents expected behavior
      expect(profile2.personalFacts.some(f => f.fact.includes('Boston'))).toBe(true);
      expect(profile2.personalFacts.some(f => f.fact.includes('New York'))).toBe(true);
    });

    test('should maintain consistency across multiple conversation sessions', async () => {
      const conversations = [
        createTestConversationId(),
        createTestConversationId(),
        createTestConversationId()
      ];

      // Conversation 1: Basic info
      await userProfileManager.updateProfileFromConversation(testUserId, conversations[0], [
        { role: 'user', content: 'Hi, I\'m Mike and I work as a teacher' },
        { role: 'assistant', content: 'Hello Mike! What subjects do you teach?' },
        { role: 'user', content: 'I teach high school math and really enjoy helping students understand complex concepts' }
      ]);

      // Verify initial extraction
      let profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.name).toBe('Mike');
      expect(profile.preferences.occupation).toBe('a teacher');

      // Conversation 2: Additional interests (simulating days later)
      await userProfileManager.updateProfileFromConversation(testUserId, conversations[1], [
        { role: 'user', content: 'I love hiking on weekends and playing guitar in my free time' },
        { role: 'assistant', content: 'That sounds wonderful! How long have you been playing guitar?' },
        { role: 'user', content: 'About 5 years now. I also have two dogs named Max and Buddy' }
      ]);

      // Verify information accumulation
      profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.name).toBe('Mike');
      expect(profile.preferences.occupation).toBe('a teacher');
      expect(profile.preferences.interests.some(i => i.includes('hiking'))).toBe(true);
      expect(profile.preferences.interests.some(i => i.includes('guitar'))).toBe(true);

      // Conversation 3: Reference to previous information (simulating weeks later)
      await userProfileManager.updateProfileFromConversation(testUserId, conversations[2], [
        { role: 'user', content: 'Max and Buddy had a great time at the dog park today' },
        { role: 'assistant', content: 'I remember you mentioned your dogs! How are they doing?' },
        { role: 'user', content: 'They\'re doing great. Teaching has been stressful lately, but hiking helps me relax' }
      ]);

      // Final verification - all information should be preserved
      profile = await userProfileManager.getOrCreateProfile(testUserId);
      const context = userProfileManager.buildUserContext(profile);
      
      expect(context).toContain('Mike');
      expect(context).toContain('teacher');
      expect(context).toContain('hiking');
      expect(context).toContain('guitar');
      expect(profile.personalFacts.some(f => f.fact.includes('dogs named Max and Buddy'))).toBe(true);
    });
  });

  describe('Conflicting Information Handling', () => {
    test('should handle contradictory names gracefully', async () => {
      const conversationId1 = createTestConversationId();
      const conversationId2 = createTestConversationId();

      // Initial name
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'My name is Jonathan' }
      ]);

      let profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.name).toBe('Jonathan');

      // Preference for different name
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'Actually, I prefer to be called John' }
      ]);

      profile = await userProfileManager.getOrCreateProfile(testUserId);
      // Should track both names with preference
      expect(profile.preferences.preferredName).toBe('John');
      expect(profile.personalFacts.some(f => f.fact.includes('Jonathan'))).toBe(true);
      expect(profile.personalFacts.some(f => f.fact.includes('John'))).toBe(true);
    });

    test('should handle conflicting location information', async () => {
      const conversationId1 = createTestConversationId();
      const conversationId2 = createTestConversationId();

      // Initial location
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'I live in Seattle and love the rain' }
      ]);

      let profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.preferences.location).toBe('Seattle');

      // Conflicting location
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'I live in Portland and enjoy the food scene here' }
      ]);

      profile = await userProfileManager.getOrCreateProfile(testUserId);
      
      // Should track both locations as facts
      expect(profile.personalFacts.some(f => f.fact.includes('Seattle'))).toBe(true);
      expect(profile.personalFacts.some(f => f.fact.includes('Portland'))).toBe(true);
      // Current location should be updated to most recent
      expect(profile.preferences.location).toBe('Portland');
    });

    test('should handle contradictory occupations', async () => {
      const conversationId1 = createTestConversationId();
      const conversationId2 = createTestConversationId();

      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'I work as a software engineer at Google' }
      ]);

      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'I work as a teacher at the local high school' }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      
      // Should track both occupations
      expect(profile.personalFacts.some(f => f.fact.includes('software engineer'))).toBe(true);
      expect(profile.personalFacts.some(f => f.fact.includes('teacher'))).toBe(true);
    });

    test('should maintain confidence scores for repeated vs new information', async () => {
      const conversationId1 = createTestConversationId();
      const conversationId2 = createTestConversationId();
      const conversationId3 = createTestConversationId();

      // Initial fact
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'I love coffee' }
      ]);

      let profile = await userProfileManager.getOrCreateProfile(testUserId);
      const coffeeFactInitial = profile.personalFacts.find(f => f.fact.includes('coffee'));
      expect(coffeeFactInitial?.confidence).toBe(0.9);

      // Reinforce the same fact
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'I really love coffee, especially in the morning' }
      ]);

      profile = await userProfileManager.getOrCreateProfile(testUserId);
      const coffeeFactReinforced = profile.personalFacts.find(f => f.fact.includes('coffee'));
      expect(coffeeFactReinforced?.confidence).toBeGreaterThan(0.9);

      // Add conflicting information
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId3, [
        { role: 'user', content: 'I prefer tea over coffee these days' }
      ]);

      profile = await userProfileManager.getOrCreateProfile(testUserId);
      const teaFact = profile.personalFacts.find(f => f.fact.includes('tea'));
      expect(teaFact?.confidence).toBe(0.9); // New fact starts with standard confidence
    });
  });

  describe('Entity Extraction Integration', () => {
    test('should properly integrate entity extraction with profile management', async () => {
      const conversationId = createTestConversationId();
      const complexMessage = "Hi, I'm Sarah from Boston. I work as a software engineer and have two cats named Whiskers and Shadow. I love hiking and my birthday is March 15th.";

      // Test entity extraction first
      const entities = await EntityExtractor.extractEntities(complexMessage);
      expect(entities.length).toBeGreaterThan(0);

      // Test integration with profile management
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, [
        { role: 'user', content: complexMessage }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      
      // Verify various types of information were extracted and stored
      expect(profile.name).toBe('Sarah');
      expect(profile.preferences.location).toBe('Boston');
      expect(profile.preferences.occupation).toBe('a software engineer');
      expect(profile.personalFacts.some(f => f.fact.includes('cats named Whiskers and Shadow'))).toBe(true);
      expect(profile.preferences.interests.some(i => i.includes('hiking'))).toBe(true);
    });

    test('should handle messages with no extractable entities', async () => {
      const conversationId = createTestConversationId();

      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, [
        { role: 'user', content: 'How are you doing today?' },
        { role: 'assistant', content: 'I\'m doing well, thank you for asking!' },
        { role: 'user', content: 'That\'s great to hear.' }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.personalFacts).toHaveLength(0);
    });

    test('should handle mixed entity types in conversation flow', async () => {
      const conversationId = createTestConversationId();

      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, [
        { role: 'user', content: 'My name is Alex' },
        { role: 'assistant', content: 'Nice to meet you Alex!' },
        { role: 'user', content: 'I have a dog named Buddy' },
        { role: 'assistant', content: 'Buddy sounds like a great companion!' },
        { role: 'user', content: 'I live in Denver and work as a graphic designer' },
        { role: 'assistant', content: 'Denver is a beautiful city!' },
        { role: 'user', content: 'I love mountain biking and craft beer' }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      
      expect(profile.name).toBe('Alex');
      expect(profile.preferences.location).toBe('Denver');
      expect(profile.preferences.occupation).toBe('a graphic designer');
      expect(profile.personalFacts.some(f => f.fact.includes('dog named Buddy'))).toBe(true);
      expect(profile.preferences.interests.some(i => i.includes('mountain biking'))).toBe(true);
      expect(profile.preferences.interests.some(i => i.includes('craft beer'))).toBe(true);
    });
  });

  describe('Memory Search Integration', () => {
    test('should find relevant information across conversations', async () => {
      const conversationIds = [
        createTestConversationId(),
        createTestConversationId(),
        createTestConversationId()
      ];

      // Seed conversations with searchable content
      await userProfileManager.updateProfileFromConversation(testUserId, conversationIds[0], [
        { role: 'user', content: 'I love drinking coffee in the morning' },
        { role: 'assistant', content: 'What\'s your favorite type of coffee?' },
        { role: 'user', content: 'I prefer dark roast Ethiopian beans' }
      ]);

      await userProfileManager.updateProfileFromConversation(testUserId, conversationIds[1], [
        { role: 'user', content: 'The coffee shop downtown has the best espresso' },
        { role: 'assistant', content: 'Do you go there often?' },
        { role: 'user', content: 'Almost every day before work' }
      ]);

      await userProfileManager.updateProfileFromConversation(testUserId, conversationIds[2], [
        { role: 'user', content: 'I tried a new tea blend today, but still prefer coffee' }
      ]);

      // Test memory search
      const searchResults = await userProfileManager.searchUserHistory(testUserId, 'coffee');
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Should find multiple references to coffee across conversations
      const coffeeMessages = searchResults.filter(msg => 
        msg.content.toLowerCase().includes('coffee')
      );
      expect(coffeeMessages.length).toBeGreaterThan(1);
    });

    test('should integrate search results with profile context', async () => {
      const conversationId = createTestConversationId();

      // Create profile with stored facts
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, [
        { role: 'user', content: 'My name is Lisa and I love photography' },
        { role: 'user', content: 'I have a Canon camera and enjoy landscape photography' },
        { role: 'user', content: 'I live in Colorado which has amazing mountain views' }
      ]);

      // Get profile context
      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      const context = userProfileManager.buildUserContext(profile);

      // Search for related content
      const searchResults = await userProfileManager.searchUserHistory(testUserId, 'photography');

      // Context should include stored facts, search should find relevant messages
      expect(context).toContain('Lisa');
      expect(context).toContain('Colorado');
      expect(profile.preferences.interests.some(i => i.includes('photography'))).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Session Persistence', () => {
    test('should persist information across simulated sessions', async () => {
      const conversationId1 = createTestConversationId();
      
      // First "session"
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId1, [
        { role: 'user', content: 'My name is David and I work as a chef' },
        { role: 'user', content: 'I have a passion for Italian cuisine' }
      ]);

      // Clear cache to simulate new session
      userProfileManager['profileCache'].clear();

      const conversationId2 = createTestConversationId();
      
      // Second "session" - should retrieve from database
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId2, [
        { role: 'user', content: 'I also enjoy French cooking techniques' }
      ]);

      // Verify information from both sessions is preserved
      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.name).toBe('David');
      expect(profile.preferences.occupation).toBe('a chef');
      expect(profile.preferences.interests.some(i => i.includes('Italian cuisine'))).toBe(true);
      expect(profile.preferences.interests.some(i => i.includes('French cooking'))).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures gracefully', async () => {
      // This test would require mocking database failures
      // For now, it's documented as important behavior to test
      const conversationId = createTestConversationId();

      // Should not crash when database is unavailable
      await expect(
        userProfileManager.updateProfileFromConversation(testUserId, conversationId, [
          { role: 'user', content: 'My name is Test User' }
        ])
      ).resolves.not.toThrow();
    });

    test('should handle malformed message data', async () => {
      const conversationId = createTestConversationId();

      // Test with various malformed data
      const malformedMessages = [
        { role: 'user', content: null },
        { role: null, content: 'test message' } as any,
        { role: 'user' } as any,
        { content: 'missing role' } as any,
        null as any,
        undefined as any
      ];

      await expect(
        userProfileManager.updateProfileFromConversation(testUserId, conversationId, malformedMessages)
      ).resolves.not.toThrow();
    });

    test('should recover from partial failures', async () => {
      const conversationId = createTestConversationId();

      // Mix of valid and invalid messages
      const mixedMessages = [
        { role: 'user', content: 'My name is Alice' },
        null as any,
        { role: 'user', content: 'I live in Boston' },
        { role: 'user', content: undefined as any },
        { role: 'user', content: 'I love reading' }
      ];

      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, mixedMessages);

      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      
      // Valid messages should be processed despite invalid ones
      expect(profile.name).toBe('Alice');
      expect(profile.preferences.location).toBe('Boston');
      expect(profile.preferences.interests.some(i => i.includes('reading'))).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    test('should handle large conversation histories efficiently', async () => {
      const conversationId = createTestConversationId();
      
      // Create a large conversation with mixed content
      const largeConversation = [];
      for (let i = 0; i < 500; i++) {
        largeConversation.push(
          { role: 'user' as const, content: `Message ${i}: I like activity${i % 20}` },
          { role: 'assistant' as const, content: `That's interesting! Tell me more about activity${i % 20}` }
        );
      }

      const start = performance.now();
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, largeConversation);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify some information was extracted
      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.preferences.interests.length).toBeGreaterThan(0);
    });

    test('should maintain performance with complex entity extraction', async () => {
      const conversationId = createTestConversationId();
      
      const complexMessages = [
        { role: 'user', content: 'Hi, I\'m Dr. Sarah Johnson-Martinez from San Francisco. I work as a pediatric surgeon at UCSF and have three cats named Whiskers, Shadow, and Luna. I love hiking in Yosemite, playing violin, and reading medical journals. My birthday is March 15th, 1985, and I\'m allergic to shellfish.' },
        { role: 'user', content: 'I also enjoy photography with my Canon 5D Mark IV, especially macro photography of flowers. My husband Mark is a software engineer at Google, and we have a daughter named Emma who just turned 5. We live in a Victorian house in the Mission District.' },
        { role: 'user', content: 'On weekends, I volunteer at the free clinic downtown and teach violin lessons to underprivileged kids. My favorite food is sushi (except the shellfish parts!), and I prefer green tea over coffee. I speak fluent Spanish and basic Mandarin.' }
      ];

      const start = performance.now();
      await userProfileManager.updateProfileFromConversation(testUserId, conversationId, complexMessages);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should handle complex extraction efficiently

      // Verify comprehensive extraction
      const profile = await userProfileManager.getOrCreateProfile(testUserId);
      expect(profile.name).toBe('Dr. Sarah Johnson-Martinez');
      expect(profile.preferences.location).toBe('San Francisco');
      expect(profile.preferences.occupation).toBe('a pediatric surgeon at UCSF');
      expect(profile.personalFacts.length).toBeGreaterThan(5);
    });
  });
});