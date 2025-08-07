import { EntityExtractor } from '../../src/lib/services/memory/entityExtractor';
import { UserProfileManager } from '../../src/lib/services/memory/userProfileManager';

// Mock Supabase for edge case testing
const mockSupabaseError = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: new Error('Database connection failed') }))
      }))
    })),
    upsert: jest.fn(() => ({ data: null, error: new Error('Write failed') }))
  }))
};

jest.mock('../../src/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseError)
}));

describe('Memory System Edge Cases and Boundary Conditions', () => {
  describe('Input Validation and Null Safety', () => {
    test('should handle null and undefined inputs gracefully', async () => {
      // Entity extraction with null/undefined
      expect(() => EntityExtractor.extractEntities(null as any)).not.toThrow();
      expect(() => EntityExtractor.extractEntities(undefined as any)).not.toThrow();
      
      const nullResult = await EntityExtractor.extractEntities(null as any);
      const undefinedResult = await EntityExtractor.extractEntities(undefined as any);
      
      expect(Array.isArray(nullResult)).toBe(true);
      expect(Array.isArray(undefinedResult)).toBe(true);
      expect(nullResult.length).toBe(0);
      expect(undefinedResult.length).toBe(0);
    });

    test('should handle empty strings and whitespace', async () => {
      const testCases = [
        '',           // Empty string
        ' ',          // Single space
        '\t',         // Tab
        '\n',         // Newline
        '\r\n',       // Windows newline
        '   \t\n  ',  // Mixed whitespace
        '　',         // Unicode space
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        expect(Array.isArray(entities)).toBe(true);
        expect(entities.length).toBe(0);
      }
    });

    test('should handle extremely long messages', async () => {
      // Create a very long message (1MB+)
      const longPrefix = 'A'.repeat(1000000);
      const longMessage = longPrefix + ' my name is John and I have a cat named Whiskers';

      const entities = await EntityExtractor.extractEntities(longMessage);
      
      expect(Array.isArray(entities)).toBe(true);
      // Should still extract entities from the meaningful part
      const nameEntity = entities.find(e => e.type === 'name');
      expect(nameEntity?.value).toBe('John');
    });

    test('should handle messages with only special characters', async () => {
      const specialCharMessages = [
        '!@#$%^&*()_+-=[]{}|;:,.<>?',
        '"""\'\'\'```~~~',
        '🎵🎶🎤🎧🎸🥁🎺🎻',
        '→←↑↓↔↕↖↗↘↙',
        '∀∃∄∅∆∇∈∉∋∌∍∎∏',
        '™®©℗℠℡™',
      ];

      for (const message of specialCharMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        // Most special character sequences shouldn't match entity patterns
        expect(entities.length).toBe(0);
      }
    });

    test('should handle mixed valid and invalid characters', async () => {
      const mixedMessages = [
        'My name is José™ and I live in São Paulo®',
        'I have a cat🐱 named Whiskers💫 who is very cute😍',
        'I work as a software engineer💻 at Google🌟 in San Francisco🌉',
        'My email is john@company.com and my phone is +1-555-123-4567',
      ];

      for (const message of mixedMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        // Should extract meaningful entities despite special characters
        expect(entities.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Unicode and International Character Support', () => {
    test('should handle international names correctly', async () => {
      const internationalNames = [
        { input: 'My name is José', expected: 'José' },
        { input: 'I am François Müller', expected: 'François Müller' },
        { input: 'Call me 张伟', expected: '张伟' },
        { input: 'My name is Владимир', expected: 'Владимир' },
        { input: 'I am محمد', expected: 'محمد' },
        { input: 'Call me Åse Øster', expected: 'Åse Øster' },
        { input: 'My name is Björk Guðmundsdóttir', expected: 'Björk Guðmundsdóttir' },
      ];

      for (const testCase of internationalNames) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const nameEntity = entities.find(e => e.type === 'name');
        
        expect(nameEntity).toBeDefined();
        expect(nameEntity?.value).toBe(testCase.expected);
      }
    });

    test('should handle mixed language content', async () => {
      const mixedLanguageMessages = [
        'Bonjour, my name is Pierre and I live in Paris',
        'Hola, me llamo María and I work as a teacher',
        'こんにちは、my name is Tanaka and I love sushi',
        'Guten Tag, I am Hans from München',
      ];

      for (const message of mixedLanguageMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(entities.length).toBeGreaterThan(0);
        
        // Should extract English parts at minimum
        const hasEnglishContent = entities.some(e => 
          e.rawText.includes('name') || e.rawText.includes('live') || e.rawText.includes('work')
        );
        expect(hasEnglishContent).toBe(true);
      }
    });

    test('should handle right-to-left and bidirectional text', async () => {
      const bidiMessages = [
        'My name is علي Ahmed',  // Arabic + English
        'I live in תל אביב (Tel Aviv)',  // Hebrew + English
        'משה Smith is my friend',  // Hebrew + English name
      ];

      for (const message of bidiMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        // Should handle without crashing
      }
    });

    test('should handle various Unicode normalization forms', async () => {
      // Same text in different Unicode normalization forms
      const café_nfc = 'My name is Café'; // NFC (composed)
      const café_nfd = 'My name is Cafe\u0301'; // NFD (decomposed)
      
      const entities_nfc = await EntityExtractor.extractEntities(café_nfc);
      const entities_nfd = await EntityExtractor.extractEntities(café_nfd);
      
      expect(entities_nfc.length).toBeGreaterThan(0);
      expect(entities_nfd.length).toBeGreaterThan(0);
      
      // Both should extract names (though they might differ in exact content)
      const name_nfc = entities_nfc.find(e => e.type === 'name');
      const name_nfd = entities_nfd.find(e => e.type === 'name');
      
      expect(name_nfc).toBeDefined();
      expect(name_nfd).toBeDefined();
    });
  });

  describe('Regex Pattern Edge Cases', () => {
    test('should handle regex-breaking characters safely', async () => {
      const regexBreakers = [
        'My name is John.*+?^${}()|[]\\',
        'I live in (Boston) and work at [Company]',
        'Call me John|Jane or just J',
        'My email is test+tag@domain.com',
        'I have $100 and need \\money\\',
      ];

      for (const message of regexBreakers) {
        // Should not throw errors due to regex issues
        expect(() => EntityExtractor.extractEntities(message)).not.toThrow();
        
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
      }
    });

    test('should handle nested and overlapping patterns', async () => {
      const overlappingMessages = [
        'My name is John and my brother John lives with me',
        'I have a cat named Cat and a dog named Dog',
        'I work at Work Corp and love my work',
        'My friend Mike and I, Mike Johnson, went out',
      ];

      for (const message of overlappingMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        expect(entities.length).toBeGreaterThan(0);
        
        // Should handle overlapping patterns gracefully
        entities.forEach(entity => {
          expect(entity.rawText).toBeDefined();
          expect(entity.confidence).toBeGreaterThan(0);
        });
      }
    });

    test('should handle ambiguous entity boundaries', async () => {
      const ambiguousMessages = [
        'My name is Dr. John Smith Jr. and I live here',
        'I work as a Senior Software Engineer III at Big Corp',
        'My cat Mr. Whiskers Sr. is very old',
        'Call me Mary-Jane O\'Connor-Smith',
      ];

      for (const message of ambiguousMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        
        // Each entity should have clear boundaries
        entities.forEach(entity => {
          expect(entity.rawText.trim()).toBe(entity.rawText);
          expect(entity.rawText.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Database Error Handling', () => {
    let userProfileManager: UserProfileManager;

    beforeEach(async () => {
      userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      jest.clearAllMocks();
    });

    test('should handle database connection failures gracefully', async () => {
      // Mock is already set up to simulate database failures
      
      const userId = 'test-user-db-fail';
      
      // Should not throw errors
      await expect(
        userProfileManager.getOrCreateProfile(userId)
      ).resolves.not.toThrow();
      
      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Should return a valid profile structure even with DB failure
      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(Array.isArray(profile.personalFacts)).toBe(true);
      expect(Array.isArray(profile.preferences.interests)).toBe(true);
    });

    test('should handle save failures without corruption', async () => {
      const userId = 'test-user-save-fail';
      
      // Create profile and attempt to save
      const profile = await userProfileManager.getOrCreateProfile(userId);
      profile.name = 'Test User';
      
      // Should not throw on save failure
      await expect(
        userProfileManager.saveProfile(userId, profile)
      ).resolves.not.toThrow();
      
      // Profile should remain in cache even if save fails
      const cachedProfile = userProfileManager['profileCache'].get(userId);
      expect(cachedProfile).toBe(profile);
      expect(cachedProfile?.name).toBe('Test User');
    });

    test('should handle search failures gracefully', async () => {
      const userId = 'test-user-search-fail';
      
      // Should not throw on search failure
      const results = await userProfileManager.searchUserHistory(userId, 'test query');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0); // Should return empty array on failure
    });

    test('should handle partial data corruption', async () => {
      // Simulate corrupted data returned from database
      const corruptedSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ 
                data: { 
                  profile_data: { 
                    // Missing required fields, malformed data
                    userId: null,
                    preferences: 'not an object',
                    personalFacts: 'not an array',
                    conversationPatterns: null
                  } 
                }, 
                error: null 
              }))
            }))
          }))
        }))
      };

      const corruptedManager = new UserProfileManager();
      corruptedManager['supabase'] = corruptedSupabase;
      
      // Should handle corrupted data gracefully
      const profile = await corruptedManager.getOrCreateProfile('corrupt-user');
      
      expect(profile).toBeDefined();
      expect(profile.userId).toBe('corrupt-user'); // Should use provided ID
      expect(Array.isArray(profile.personalFacts)).toBe(true); // Should fix corruption
      expect(Array.isArray(profile.preferences.interests)).toBe(true);
    });
  });

  describe('Concurrent Access Edge Cases', () => {
    test('should handle rapid successive updates to same profile', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = 'rapid-update-user';
      
      // Fire multiple updates rapidly
      const rapidUpdates = [];
      for (let i = 0; i < 10; i++) {
        rapidUpdates.push(
          userProfileManager.updateProfileFromConversation(userId, `rapid-conv-${i}`, [
            { role: 'user', content: `Update ${i}: My interest${i} is activity${i}` }
          ])
        );
      }
      
      // Should handle all updates without corruption
      await Promise.all(rapidUpdates);
      
      const profile = await userProfileManager.getOrCreateProfile(userId);
      expect(profile.userId).toBe(userId);
      expect(profile.personalFacts.length).toBeGreaterThan(0);
      expect(profile.lastUpdated).toBeInstanceOf(Date);
    });

    test('should handle interleaved read/write operations', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = 'interleaved-user';
      
      // Mix of reads and writes
      const operations = [];
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          // Write operation
          operations.push(
            userProfileManager.updateProfileFromConversation(userId, `interleaved-conv-${i}`, [
              { role: 'user', content: `I like thing${i}` }
            ])
          );
        } else {
          // Read operation
          operations.push(
            userProfileManager.getOrCreateProfile(userId)
          );
        }
      }
      
      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(results.length * 0.8); // 80% success rate
      
      // Final state should be consistent
      const finalProfile = await userProfileManager.getOrCreateProfile(userId);
      expect(finalProfile).toBeDefined();
      expect(finalProfile.userId).toBe(userId);
    });
  });

  describe('Memory and Resource Limits', () => {
    test('should handle profile with extremely large fact lists', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = 'large-facts-user';
      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Add many facts
      for (let i = 0; i < 10000; i++) {
        userProfileManager['addPersonalFact'](profile, `Fact ${i}: Something about ${i}`, `conv-${i}`);
      }
      
      // Should handle large fact list
      expect(profile.personalFacts.length).toBe(10000);
      
      // Context building should handle large profiles
      const context = userProfileManager.buildUserContext(profile);
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    test('should handle cache overflow scenarios', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      // Create many profiles to test cache behavior
      const profiles = [];
      for (let i = 0; i < 1000; i++) {
        const userId = `cache-overflow-${i}`;
        const profile = await userProfileManager.getOrCreateProfile(userId);
        profiles.push(profile);
      }
      
      // Cache should not grow indefinitely (current implementation doesn't limit)
      const cacheSize = userProfileManager['profileCache'].size;
      console.log(`Cache size after 1000 profiles: ${cacheSize}`);
      
      // This test documents the current behavior - cache grows without limit
      expect(cacheSize).toBe(1000);
    });

    test('should handle very long conversation histories', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = 'long-history-user';
      
      // Create conversation with 10,000 messages
      const longConversation = [];
      for (let i = 0; i < 10000; i++) {
        longConversation.push({
          role: (i % 2 === 0 ? 'user' : 'assistant') as const,
          content: `Message ${i}: ${i % 100 === 0 ? `I like hobby${i/100}` : 'Just chatting'}`
        });
      }
      
      // Should handle without memory issues
      await expect(
        userProfileManager.updateProfileFromConversation(userId, 'long-conv', longConversation)
      ).resolves.not.toThrow();
      
      const profile = await userProfileManager.getOrCreateProfile(userId);
      expect(profile.personalFacts.length).toBeGreaterThan(0);
    });
  });

  describe('Time and Date Edge Cases', () => {
    test('should handle edge dates and times', async () => {
      const edgeDateMessages = [
        'My birthday is February 29th, 2000', // Leap year
        'I was born on December 31st, 1999',  // Y2K edge
        'My anniversary is February 30th',     // Invalid date
        'I was born in the year 0000',        // Invalid year
        'My birthday is the 32nd of March',   // Invalid day
        'I was born on Blursday the 45th',    // Nonsense date
      ];

      for (const message of edgeDateMessages) {
        // Should not crash on invalid dates
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        
        const dateEntities = entities.filter(e => e.type === 'dates');
        // May or may not extract invalid dates - behavior should be consistent
        dateEntities.forEach(entity => {
          expect(entity.confidence).toBeGreaterThan(0);
          expect(entity.rawText).toBeDefined();
        });
      }
    });

    test('should handle timezone and locale-specific date formats', async () => {
      const internationalDates = [
        'My birthday is 15/03/1990',      // DD/MM/YYYY
        'I was born on 03/15/1990',       // MM/DD/YYYY  
        'My birthday is 15.03.1990',      // German format
        'I was born 1990年3月15日',         // Japanese format
        'My birthday is 15 mars 1990',    // French month name
      ];

      for (const message of internationalDates) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        // Should handle various formats gracefully
      }
    });
  });

  describe('Entity Extraction Boundary Cases', () => {
    test('should handle entities at message boundaries', async () => {
      const boundaryMessages = [
        'John',                    // Single word, entire message
        'My name is John.',       // Entity at end with punctuation
        'John is my name',        // Entity at start
        'Hi John how are you',    // Entity in middle without punctuation
        'John,Mary,Sue',          // Multiple entities with commas
      ];

      for (const message of boundaryMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        
        if (entities.length > 0) {
          entities.forEach(entity => {
            expect(entity.rawText.trim()).toBe(entity.rawText);
            expect(entity.value).toBeDefined();
            expect(entity.confidence).toBeGreaterThan(0);
          });
        }
      }
    });

    test('should handle malformed entity patterns', async () => {
      const malformedMessages = [
        'My name is',             // Incomplete pattern
        'I have a named',         // Missing entity value
        'My cat is called',       // Trailing pattern
        'I live in and work at',  // Multiple incomplete patterns
        'My name is  ',           // Pattern with only whitespace
      ];

      for (const message of malformedMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        
        // Should not extract incomplete entities
        entities.forEach(entity => {
          expect(entity.value).toBeTruthy();
          expect(typeof entity.value === 'string' ? entity.value.trim() : entity.value).toBeTruthy();
        });
      }
    });

    test('should handle deeply nested entity structures', async () => {
      const complexMessages = [
        'My friend John\'s cat Whiskers belongs to John\'s sister Mary who lives in Boston',
        'I work with Sarah who has a dog named Max that belongs to Sarah\'s roommate Lisa',
        'The book "My Cat Named Dog" by Author McAuthorface is about pets',
      ];

      for (const message of complexMessages) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(Array.isArray(entities)).toBe(true);
        
        // Should extract multiple entities without confusion
        if (entities.length > 1) {
          const entityTexts = entities.map(e => e.rawText);
          const uniqueTexts = new Set(entityTexts);
          // Should have distinct extractions
          expect(uniqueTexts.size).toBeGreaterThan(1);
        }
      }
    });
  });

  describe('Profile Management Edge Cases', () => {
    test('should handle profiles with conflicting timestamps', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = 'timestamp-conflict-user';
      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Manually create facts with conflicting timestamps
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      
      userProfileManager['addPersonalFact'](profile, 'Past fact', 'conv1');
      profile.personalFacts[0].firstMentioned = pastDate;
      profile.personalFacts[0].lastConfirmed = pastDate;
      
      userProfileManager['addPersonalFact'](profile, 'Future fact', 'conv2');
      profile.personalFacts[1].firstMentioned = futureDate;
      profile.personalFacts[1].lastConfirmed = futureDate;
      
      // Should handle gracefully
      const context = userProfileManager.buildUserContext(profile);
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    test('should handle circular references in profile data', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = 'circular-ref-user';
      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Create circular reference (this might happen with malformed data)
      profile.preferences = profile.preferences;
      (profile as any).circularRef = profile;
      
      // Should not crash on circular references
      await expect(
        userProfileManager.saveProfile(userId, profile)
      ).resolves.not.toThrow();
      
      const context = userProfileManager.buildUserContext(profile);
      expect(typeof context).toBe('string');
    });
  });
});