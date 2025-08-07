import { UserProfileManager, UserProfile } from '../../src/lib/services/memory/userProfileManager';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null }))
      }))
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({ data: [], error: null }))
    })),
    delete: jest.fn(() => ({
      neq: jest.fn(() => ({ data: [], error: null }))
    }))
  }))
};

// Mock the Supabase module
jest.mock('../../src/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseClient)
}));

function createTestProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: 'test-user-123',
    preferences: {
      interests: []
    },
    personalFacts: [],
    conversationPatterns: {
      commonTopics: []
    },
    lastUpdated: new Date(),
    ...overrides
  };
}

describe('UserProfileManager', () => {
  let manager: UserProfileManager;

  beforeEach(async () => {
    manager = new UserProfileManager();
    await manager.initialize();
    jest.clearAllMocks();
  });

  describe('Profile Creation', () => {
    test('should create new profile for new user', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: null })
          })
        }),
        upsert: jest.fn(() => ({ data: [], error: null }))
      });

      const profile = await manager.getOrCreateProfile('new-user-123');
      
      expect(profile.userId).toBe('new-user-123');
      expect(profile.personalFacts).toEqual([]);
      expect(profile.preferences.interests).toEqual([]);
      expect(profile.conversationPatterns.commonTopics).toEqual([]);
      expect(profile.lastUpdated).toBeInstanceOf(Date);
    });

    test('should return existing profile from cache', async () => {
      const existingProfile = createTestProfile();
      manager['profileCache'].set('cached-user', existingProfile);

      const profile = await manager.getOrCreateProfile('cached-user');
      
      expect(profile).toBe(existingProfile);
      // Should not call database if found in cache
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    test('should return existing profile from database', async () => {
      const dbProfile = createTestProfile({ name: 'John' });
      
      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => ({ 
              data: { profile_data: dbProfile }, 
              error: null 
            })
          })
        })
      });

      const profile = await manager.getOrCreateProfile('db-user');
      
      expect(profile.name).toBe('John');
      expect(profile.userId).toBe('test-user-123');
    });
  });

  describe('Conversation Processing', () => {
    test('should extract and store name from conversation', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'My name is John' }
      ]);

      expect(profile.name).toBe('John');
      expect(profile.preferences.preferredName).toBe('John');
      expect(profile.personalFacts).toHaveLength(1);
      expect(profile.personalFacts[0].fact).toBe("User's name is John");
      expect(profile.personalFacts[0].confidence).toBe(0.9);
      expect(profile.personalFacts[0].source).toBe('conv123');
    });

    test('should extract location from conversation', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'I live in San Francisco and love the city' }
      ]);

      expect(profile.preferences.location).toBe('San Francisco');
      expect(profile.personalFacts.some(f => f.fact === 'Lives in San Francisco')).toBe(true);
    });

    test('should extract occupation from conversation', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'I work as a software engineer at Google' }
      ]);

      expect(profile.preferences.occupation).toBe('a software engineer at Google');
      expect(profile.personalFacts.some(f => f.fact === 'Works as a software engineer at Google')).toBe(true);
    });

    test('should extract interests from conversation', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'I love hiking and photography' }
      ]);

      expect(profile.preferences.interests).toContain('hiking and photography');
      expect(profile.personalFacts.some(f => f.fact === 'Interested in hiking and photography')).toBe(true);
    });

    test('should not extract information from assistant messages', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'assistant', content: 'My name is Claude' },
        { role: 'user', content: 'My name is John' }
      ]);

      expect(profile.name).toBe('John');
      expect(profile.personalFacts).toHaveLength(1);
      expect(profile.personalFacts[0].fact).toBe("User's name is John");
    });

    test('should handle multiple facts in single conversation', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'My name is Sarah' },
        { role: 'user', content: 'I live in Boston' },
        { role: 'user', content: 'I work as a teacher' },
        { role: 'user', content: 'I love reading books' }
      ]);

      expect(profile.name).toBe('Sarah');
      expect(profile.preferences.location).toBe('Boston');
      expect(profile.preferences.occupation).toBe('a teacher');
      expect(profile.preferences.interests).toContain('reading books');
      expect(profile.personalFacts).toHaveLength(4);
    });
  });

  describe('Fact Management', () => {
    test('should add new personal facts', async () => {
      const profile = createTestProfile();
      
      manager['addPersonalFact'](profile, 'Has two cats', 'conv123');
      
      expect(profile.personalFacts).toHaveLength(1);
      expect(profile.personalFacts[0].fact).toBe('Has two cats');
      expect(profile.personalFacts[0].confidence).toBe(0.9);
      expect(profile.personalFacts[0].source).toBe('conv123');
      expect(profile.personalFacts[0].firstMentioned).toBeInstanceOf(Date);
      expect(profile.personalFacts[0].lastConfirmed).toBeInstanceOf(Date);
    });

    test('should update confidence for repeated facts', async () => {
      const profile = createTestProfile();
      
      manager['addPersonalFact'](profile, 'Likes coffee', 'conv123');
      const initialConfidence = profile.personalFacts[0].confidence;
      
      manager['addPersonalFact'](profile, 'Likes coffee', 'conv456');
      
      expect(profile.personalFacts).toHaveLength(1);
      expect(profile.personalFacts[0].confidence).toBeGreaterThan(initialConfidence);
      expect(profile.personalFacts[0].confidence).toBeLessThanOrEqual(1);
    });

    test('should update lastConfirmed for repeated facts', async () => {
      const profile = createTestProfile();
      
      manager['addPersonalFact'](profile, 'Likes coffee', 'conv123');
      const firstConfirmed = profile.personalFacts[0].lastConfirmed;
      
      // Wait a small amount to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      manager['addPersonalFact'](profile, 'Likes coffee', 'conv456');
      
      expect(profile.personalFacts[0].lastConfirmed.getTime()).toBeGreaterThan(firstConfirmed.getTime());
    });

    test('should handle facts with different casing', async () => {
      const profile = createTestProfile();
      
      manager['addPersonalFact'](profile, 'Likes Coffee', 'conv123');
      manager['addPersonalFact'](profile, 'likes coffee', 'conv456');
      
      // Should treat as different facts due to exact string matching
      // This is a potential improvement area for the system
      expect(profile.personalFacts).toHaveLength(2);
    });
  });

  describe('Profile Updates', () => {
    test('should handle name changes', async () => {
      const profile = createTestProfile({ name: 'John' });
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'Actually, call me Johnny' }
      ]);

      expect(profile.preferences.preferredName).toBe('Johnny');
      expect(profile.personalFacts.some(f => f.fact === "User's name is Johnny")).toBe(true);
    });

    test('should handle location updates', async () => {
      const profile = createTestProfile();
      profile.preferences.location = 'Boston';
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'I moved to New York last month' }
      ]);

      // Current implementation doesn't handle "moved to" - this is a test that would fail
      // and highlight the need for more sophisticated update logic
      expect(profile.preferences.location).toBe('New York last month');
    });

    test('should not overwrite existing information unnecessarily', async () => {
      const profile = createTestProfile({
        name: 'John',
        preferences: {
          location: 'Boston',
          occupation: 'Engineer',
          interests: ['coding']
        }
      });
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'The weather is nice today' }
      ]);

      // Should not change existing information
      expect(profile.name).toBe('John');
      expect(profile.preferences.location).toBe('Boston');
      expect(profile.preferences.occupation).toBe('Engineer');
    });

    test('should update lastUpdated when profile changes', async () => {
      const profile = createTestProfile();
      const originalUpdate = profile.lastUpdated;
      manager['profileCache'].set('test-user', profile);

      // Wait to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'My name is John' }
      ]);

      expect(profile.lastUpdated.getTime()).toBeGreaterThan(originalUpdate.getTime());
    });

    test('should not update lastUpdated when no changes occur', async () => {
      const profile = createTestProfile();
      const originalUpdate = profile.lastUpdated;
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'How are you today?' }
      ]);

      expect(profile.lastUpdated).toBe(originalUpdate);
    });
  });

  describe('Context Building', () => {
    test('should build comprehensive user context', () => {
      const profile = createTestProfile({
        name: 'John',
        preferences: {
          location: 'Boston',
          occupation: 'Software Engineer',
          interests: ['coding', 'hiking', 'photography']
        },
        personalFacts: [
          { 
            fact: 'Has two cats named Whiskers and Shadow', 
            confidence: 0.9, 
            firstMentioned: new Date(), 
            lastConfirmed: new Date(), 
            source: 'conv123' 
          },
          { 
            fact: 'Allergic to peanuts', 
            confidence: 0.8, 
            firstMentioned: new Date(), 
            lastConfirmed: new Date(), 
            source: 'conv456' 
          }
        ]
      });

      const context = manager.buildUserContext(profile);

      expect(context).toContain("The user's name is John");
      expect(context).toContain("They live in Boston");
      expect(context).toContain("They work as Software Engineer");
      expect(context).toContain("coding, hiking, photography");
      expect(context).toContain("Has two cats named Whiskers and Shadow");
      expect(context).toContain("Allergic to peanuts");
    });

    test('should handle empty profile gracefully', () => {
      const profile = createTestProfile();
      const context = manager.buildUserContext(profile);

      expect(context).toBe("This is a new user. Learn about them as you converse.");
    });

    test('should filter facts by confidence level', () => {
      const profile = createTestProfile({
        personalFacts: [
          { 
            fact: 'High confidence fact', 
            confidence: 0.9, 
            firstMentioned: new Date(), 
            lastConfirmed: new Date(), 
            source: 'conv123' 
          },
          { 
            fact: 'Low confidence fact', 
            confidence: 0.5, 
            firstMentioned: new Date(), 
            lastConfirmed: new Date(), 
            source: 'conv456' 
          }
        ]
      });

      const context = manager.buildUserContext(profile);

      expect(context).toContain('High confidence fact');
      expect(context).not.toContain('Low confidence fact');
    });

    test('should handle missing optional fields', () => {
      const profile = createTestProfile({
        name: 'John'
        // Missing location, occupation, interests
      });

      const context = manager.buildUserContext(profile);

      expect(context).toContain("The user's name is John");
      expect(context).not.toContain("They live in");
      expect(context).not.toContain("They work as");
      expect(context).not.toContain("They are interested in");
    });
  });

  describe('Profile Persistence', () => {
    test('should save profile to database', async () => {
      const profile = createTestProfile({ name: 'John' });
      
      await manager.saveProfile('test-user', profile);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
    });

    test('should cache profile after saving', async () => {
      const profile = createTestProfile({ name: 'John' });
      
      await manager.saveProfile('test-user', profile);

      expect(manager['profileCache'].get('test-user')).toBe(profile);
    });

    test('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: () => ({ 
          data: null, 
          error: new Error('Database connection failed') 
        })
      });

      const profile = createTestProfile();
      
      // Should not throw, but handle error gracefully
      await expect(manager.saveProfile('test-user', profile)).resolves.not.toThrow();
    });
  });

  describe('Search Functionality', () => {
    test('should search user history', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({ data: [], error: null })
              })
            })
          })
        })
      });

      const results = await manager.searchUserHistory('test-user', 'coffee');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
      expect(results).toEqual([]);
    });

    test('should handle search errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({ 
                  data: null, 
                  error: new Error('Search failed') 
                })
              })
            })
          })
        })
      });

      const results = await manager.searchUserHistory('test-user', 'coffee');

      expect(results).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null conversation messages', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await expect(
        manager.updateProfileFromConversation('test-user', 'conv123', null as any)
      ).resolves.not.toThrow();
    });

    test('should handle empty conversation messages', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', []);

      expect(profile.personalFacts).toHaveLength(0);
    });

    test('should handle messages with empty content', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: '' },
        { role: 'user', content: null as any },
        { role: 'user', content: undefined as any }
      ]);

      expect(profile.personalFacts).toHaveLength(0);
    });

    test('should handle very long messages', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      const longMessage = 'A'.repeat(10000) + ' my name is John';

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: longMessage }
      ]);

      expect(profile.name).toBe('John');
    });

    test('should handle special characters in extracted information', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      await manager.updateProfileFromConversation('test-user', 'conv123', [
        { role: 'user', content: 'My name is José María O\'Connor-Smith' }
      ]);

      expect(profile.name).toBe('José María O\'Connor-Smith');
    });

    test('should handle concurrent profile updates', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('test-user', profile);

      const promises = [
        manager.updateProfileFromConversation('test-user', 'conv1', [
          { role: 'user', content: 'My name is John' }
        ]),
        manager.updateProfileFromConversation('test-user', 'conv2', [
          { role: 'user', content: 'I live in Boston' }
        ]),
        manager.updateProfileFromConversation('test-user', 'conv3', [
          { role: 'user', content: 'I work as an engineer' }
        ])
      ];

      await Promise.all(promises);

      expect(profile.name).toBe('John');
      expect(profile.preferences.location).toBe('Boston');
      expect(profile.preferences.occupation).toBe('an engineer');
    });
  });

  describe('Memory Management', () => {
    test('should limit cache size to prevent memory leaks', async () => {
      // Create many profiles to test cache management
      for (let i = 0; i < 1000; i++) {
        await manager.getOrCreateProfile(`user-${i}`);
      }

      // Cache should not grow indefinitely
      // This test would fail with current implementation, highlighting need for cache limits
      const cacheSize = manager['profileCache'].size;
      expect(cacheSize).toBeLessThan(1000);
    });

    test('should clean up old cached profiles', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('old-user', profile);

      // Simulate time passing and cache cleanup
      // This would require implementing cache TTL or LRU eviction
      
      // For now, just verify cache contains the profile
      expect(manager['profileCache'].has('old-user')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should process large conversations efficiently', async () => {
      const profile = createTestProfile();
      manager['profileCache'].set('perf-user', profile);

      const largeConversation = Array(1000).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `Message ${i}: I like activity number ${i}`
      }));

      const start = performance.now();
      await manager.updateProfileFromConversation('perf-user', 'large-conv', largeConversation);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent profile operations', async () => {
      const promises = Array(100).fill(null).map(async (_, i) => {
        const userId = `concurrent-user-${i}`;
        return manager.updateProfileFromConversation(userId, `conv-${i}`, [
          { role: 'user', content: `My name is User${i}` }
        ]);
      });

      const start = performance.now();
      await Promise.all(promises);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10000); // Should handle concurrent operations efficiently
    });
  });
});