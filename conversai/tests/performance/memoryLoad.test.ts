import { EntityExtractor } from '../../src/lib/services/memory/entityExtractor';
import { UserProfileManager } from '../../src/lib/services/memory/userProfileManager';
import { MemoryManager } from '../../src/lib/services/memory/memoryManager';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  ENTITY_EXTRACTION_SINGLE: 100, // ms
  ENTITY_EXTRACTION_BATCH_100: 5000, // ms
  ENTITY_EXTRACTION_BATCH_1000: 30000, // ms
  PROFILE_UPDATE_SINGLE: 500, // ms
  PROFILE_UPDATE_LARGE_CONVERSATION: 10000, // ms
  MEMORY_SEARCH_SMALL_DATASET: 1000, // ms
  MEMORY_SEARCH_LARGE_DATASET: 5000, // ms
  MAX_MEMORY_INCREASE: 100 * 1024 * 1024, // 100MB
  CONCURRENT_OPERATIONS: 20000 // ms for 100 concurrent ops
};

function generateTestMessage(index: number): string {
  const templates = [
    `My name is User${index} and I work as a software engineer`,
    `I live in City${index % 50} and have a pet cat named Cat${index}`,
    `I love activity${index % 20} and my favorite food is food${index % 15}`,
    `My birthday is ${(index % 12) + 1}/${(index % 28) + 1} and I'm from State${index % 50}`,
    `I have ${index % 3 + 1} siblings and work at Company${index % 100}`
  ];
  
  return templates[index % templates.length];
}

function createTestUserId(index: number): string {
  return `perf-test-user-${index}-${Date.now()}`;
}

describe('Memory System Performance Tests', () => {
  describe('Entity Extraction Performance', () => {
    test('should extract entities from single message within performance threshold', async () => {
      const message = "My name is John Smith and I live in San Francisco. I work as a software engineer at Google and have two cats named Whiskers and Shadow.";

      const start = performance.now();
      const entities = await EntityExtractor.extractEntities(message);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_EXTRACTION_SINGLE);
      expect(entities.length).toBeGreaterThan(0);
    });

    test('should handle 100 concurrent entity extractions efficiently', async () => {
      const messages = Array(100).fill(null).map((_, i) => generateTestMessage(i));

      const start = performance.now();
      const results = await Promise.all(
        messages.map(msg => EntityExtractor.extractEntities(msg))
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_EXTRACTION_BATCH_100);
      expect(results.every(r => Array.isArray(r))).toBe(true);
      expect(results.some(r => r.length > 0)).toBe(true);
    });

    test('should handle 1000 entity extractions within reasonable time', async () => {
      const messages = Array(1000).fill(null).map((_, i) => generateTestMessage(i));

      const start = performance.now();
      const results = await Promise.all(
        messages.map(msg => EntityExtractor.extractEntries(msg))
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_EXTRACTION_BATCH_1000);
      expect(results.length).toBe(1000);
    });

    test('should maintain consistent performance across different message types', async () => {
      const messageTypes = [
        // Simple name
        "My name is John",
        // Complex personal info
        "Hi, I'm Dr. Sarah Johnson-Martinez from San Francisco, working as a pediatric surgeon with three cats named Whiskers, Shadow, and Luna",
        // Multiple entities
        "I live in Boston, work as a teacher, love hiking, have a dog named Max, and my birthday is March 15th",
        // Minimal entities
        "How are you doing today?",
        // Special characters
        "My name is José María O'Connor-Smith and I'm from São Paulo, Brazil"
      ];

      const durations = [];
      
      for (const message of messageTypes) {
        const start = performance.now();
        await EntityExtractor.extractEntities(message);
        const duration = performance.now() - start;
        durations.push(duration);
      }

      // All should be within threshold
      durations.forEach(duration => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_EXTRACTION_SINGLE);
      });

      // Variance should be reasonable (no single message takes 10x longer)
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      expect(maxDuration).toBeLessThan(minDuration * 10);
    });
  });

  describe('Profile Management Performance', () => {
    let userProfileManager: UserProfileManager;

    beforeAll(async () => {
      userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
    });

    test('should update profile efficiently for single conversation', async () => {
      const userId = createTestUserId(1);
      const conversationId = `perf-conv-${Date.now()}`;
      const messages = [
        { role: 'user' as const, content: 'My name is Alice and I live in Seattle' },
        { role: 'assistant' as const, content: 'Nice to meet you Alice!' },
        { role: 'user' as const, content: 'I work as a designer and love photography' }
      ];

      const start = performance.now();
      await userProfileManager.updateProfileFromConversation(userId, conversationId, messages);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_UPDATE_SINGLE);

      // Verify data was processed
      const profile = await userProfileManager.getOrCreateProfile(userId);
      expect(profile.name).toBe('Alice');
    });

    test('should handle large conversations efficiently', async () => {
      const userId = createTestUserId(2);
      const conversationId = `large-conv-${Date.now()}`;
      
      // Create a large conversation (1000 messages)
      const largeConversation = [];
      for (let i = 0; i < 500; i++) {
        largeConversation.push(
          { role: 'user' as const, content: generateTestMessage(i) },
          { role: 'assistant' as const, content: `That's interesting! Tell me more.` }
        );
      }

      const start = performance.now();
      await userProfileManager.updateProfileFromConversation(userId, conversationId, largeConversation);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_UPDATE_LARGE_CONVERSATION);

      // Verify some information was extracted
      const profile = await userProfileManager.getOrCreateProfile(userId);
      expect(profile.personalFacts.length).toBeGreaterThan(0);
    });

    test('should handle concurrent profile updates efficiently', async () => {
      const userIds = Array(50).fill(null).map((_, i) => createTestUserId(i + 100));
      
      const updatePromises = userIds.map(async (userId, index) => {
        const conversationId = `concurrent-conv-${index}-${Date.now()}`;
        const messages = [
          { role: 'user' as const, content: `My name is User${index} and I work as a professional${index % 10}` }
        ];
        
        return userProfileManager.updateProfileFromConversation(userId, conversationId, messages);
      });

      const start = performance.now();
      await Promise.all(updatePromises);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS);

      // Verify all profiles were created
      const profiles = await Promise.all(
        userIds.map(userId => userProfileManager.getOrCreateProfile(userId))
      );
      
      expect(profiles.every(p => p.userId.startsWith('perf-test-user'))).toBe(true);
    });

    test('should maintain performance with repeated profile access', async () => {
      const userId = createTestUserId(3);
      
      // Create initial profile
      await userProfileManager.updateProfileFromConversation(userId, 'init-conv', [
        { role: 'user', content: 'My name is Bob and I live in Portland' }
      ]);

      // Time repeated access
      const accessTimes = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await userProfileManager.getOrCreateProfile(userId);
        const duration = performance.now() - start;
        accessTimes.push(duration);
      }

      // Cache should make subsequent accesses very fast
      const averageTime = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;
      expect(averageTime).toBeLessThan(10); // Should be very fast due to caching

      // Later accesses should be faster than first (cache warming)
      const firstAccess = accessTimes[0];
      const laterAccesses = accessTimes.slice(10); // Skip first few for cache warming
      const averageLaterAccess = laterAccesses.reduce((a, b) => a + b, 0) / laterAccesses.length;
      
      expect(averageLaterAccess).toBeLessThanOrEqual(firstAccess);
    });
  });

  describe('Memory Search Performance', () => {
    let memoryManager: MemoryManager;
    let userProfileManager: UserProfileManager;

    beforeAll(async () => {
      memoryManager = new MemoryManager();
      userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
    });

    test('should search memory efficiently with small dataset', async () => {
      const userId = createTestUserId(4);
      
      // Create some searchable content
      const conversations = [
        { id: 'search-conv-1', messages: [
          { role: 'user' as const, content: 'I love drinking coffee in the morning' },
          { role: 'user' as const, content: 'My favorite coffee shop is downtown' }
        ]},
        { id: 'search-conv-2', messages: [
          { role: 'user' as const, content: 'Tea is nice too, but coffee is better' },
          { role: 'user' as const, content: 'I prefer dark roast coffee beans' }
        ]}
      ];

      // Populate data
      for (const conv of conversations) {
        await userProfileManager.updateProfileFromConversation(userId, conv.id, conv.messages);
      }

      const start = performance.now();
      const results = await userProfileManager.searchUserHistory(userId, 'coffee');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_SEARCH_SMALL_DATASET);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should handle search across large message history', async () => {
      const userId = createTestUserId(5);
      
      // Create large searchable dataset
      const searchTerms = ['coffee', 'hiking', 'music', 'books', 'travel'];
      
      for (let i = 0; i < 100; i++) {
        const conversationId = `large-search-conv-${i}`;
        const messages = [];
        
        for (let j = 0; j < 20; j++) {
          const term = searchTerms[j % searchTerms.length];
          messages.push({
            role: 'user' as const,
            content: `Message ${i}-${j}: I really enjoy ${term} and ${term} activities`
          });
        }
        
        await userProfileManager.updateProfileFromConversation(userId, conversationId, messages);
      }

      const start = performance.now();
      const results = await userProfileManager.searchUserHistory(userId, 'coffee');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_SEARCH_LARGE_DATASET);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should maintain consistent search performance across different query types', async () => {
      const userId = createTestUserId(6);
      
      // Create diverse content
      await userProfileManager.updateProfileFromConversation(userId, 'diverse-conv', [
        { role: 'user', content: 'I work as a software engineer and love programming' },
        { role: 'user', content: 'My hobbies include hiking, photography, and reading' },
        { role: 'user', content: 'I live in San Francisco and enjoy the city life' },
        { role: 'user', content: 'My cat Whiskers is very playful and loves toys' }
      ]);

      const queries = [
        'software',      // Exact word match
        'engineer',      // Partial word
        'San Francisco', // Multi-word
        'cat',           // Short word
        'programming'    // Longer word
      ];

      const searchTimes = [];
      
      for (const query of queries) {
        const start = performance.now();
        await userProfileManager.searchUserHistory(userId, query);
        const duration = performance.now() - start;
        searchTimes.push(duration);
      }

      // All searches should be within threshold
      searchTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_SEARCH_SMALL_DATASET);
      });

      // Performance should be consistent across query types
      const maxTime = Math.max(...searchTimes);
      const minTime = Math.min(...searchTimes);
      expect(maxTime).toBeLessThan(minTime * 5); // No query should take 5x longer
    });
  });

  describe('Memory Usage and Leak Detection', () => {
    test('should not leak memory during repeated entity extractions', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many entity extractions
      for (let i = 0; i < 1000; i++) {
        await EntityExtractor.extractEntities(generateTestMessage(i));
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_INCREASE);
    });

    test('should not leak memory during profile operations', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();

      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Create and process many profiles
      for (let i = 0; i < 100; i++) {
        const userId = createTestUserId(i + 1000);
        const conversationId = `leak-test-conv-${i}`;
        
        await userProfileManager.updateProfileFromConversation(userId, conversationId, [
          { role: 'user', content: generateTestMessage(i) }
        ]);
        
        await userProfileManager.getOrCreateProfile(userId);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_MEMORY_INCREASE);
    });

    test('should handle cache size limits properly', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();

      // Create many profiles to test cache behavior
      const userIds = [];
      for (let i = 0; i < 500; i++) {
        const userId = createTestUserId(i + 2000);
        userIds.push(userId);
        
        await userProfileManager.updateProfileFromConversation(userId, `cache-conv-${i}`, [
          { role: 'user', content: `My name is CacheUser${i}` }
        ]);
      }

      // Check cache size (this test documents the need for cache limits)
      const cacheSize = userProfileManager['profileCache'].size;
      
      // Current implementation doesn't limit cache size - this test will fail
      // highlighting the need for cache management
      expect(cacheSize).toBeLessThan(100); // Reasonable cache limit
    });
  });

  describe('Concurrent Operations Stress Test', () => {
    test('should handle mixed concurrent operations efficiently', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();

      const operations = [];

      // Mix of different operations
      for (let i = 0; i < 50; i++) {
        const userId = createTestUserId(i + 3000);
        const conversationId = `stress-conv-${i}`;

        // Profile updates
        operations.push(
          userProfileManager.updateProfileFromConversation(userId, conversationId, [
            { role: 'user', content: generateTestMessage(i) }
          ])
        );

        // Profile retrievals
        operations.push(
          userProfileManager.getOrCreateProfile(userId)
        );

        // Entity extractions
        operations.push(
          EntityExtractor.extractEntities(generateTestMessage(i + 1000))
        );

        // Searches
        if (i > 10) { // Only search after some data exists
          operations.push(
            userProfileManager.searchUserHistory(userId, 'user')
          );
        }
      }

      const start = performance.now();
      const results = await Promise.allSettled(operations);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS * 2);

      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const total = results.length;
      expect(successful / total).toBeGreaterThan(0.9); // 90% success rate
    });

    test('should maintain data consistency under concurrent load', async () => {
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      
      const userId = createTestUserId(4000);
      
      // Concurrent updates to same user profile
      const concurrentUpdates = [];
      for (let i = 0; i < 20; i++) {
        concurrentUpdates.push(
          userProfileManager.updateProfileFromConversation(userId, `concurrent-${i}`, [
            { role: 'user', content: `I have interest${i} and hobby${i}` }
          ])
        );
      }

      await Promise.all(concurrentUpdates);

      // Verify profile consistency
      const profile = await userProfileManager.getOrCreateProfile(userId);
      expect(profile.userId).toBe(userId);
      expect(profile.personalFacts.length).toBeGreaterThan(0);
      expect(profile.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should establish baseline performance metrics', async () => {
      const metrics = {
        entityExtraction: 0,
        profileUpdate: 0,
        profileRetrieval: 0,
        memorySearch: 0
      };

      // Entity extraction baseline
      const start1 = performance.now();
      await EntityExtractor.extractEntities("My name is John and I work as an engineer in Boston");
      metrics.entityExtraction = performance.now() - start1;

      // Profile update baseline
      const userProfileManager = new UserProfileManager();
      await userProfileManager.initialize();
      const userId = createTestUserId(5000);

      const start2 = performance.now();
      await userProfileManager.updateProfileFromConversation(userId, 'baseline-conv', [
        { role: 'user', content: 'My name is Baseline User and I live in Test City' }
      ]);
      metrics.profileUpdate = performance.now() - start2;

      // Profile retrieval baseline
      const start3 = performance.now();
      await userProfileManager.getOrCreateProfile(userId);
      metrics.profileRetrieval = performance.now() - start3;

      // Memory search baseline
      const start4 = performance.now();
      await userProfileManager.searchUserHistory(userId, 'baseline');
      metrics.memorySearch = performance.now() - start4;

      // Log metrics for regression tracking
      console.log('Performance Baseline Metrics:', metrics);

      // Ensure all operations complete within reasonable time
      expect(metrics.entityExtraction).toBeLessThan(PERFORMANCE_THRESHOLDS.ENTITY_EXTRACTION_SINGLE);
      expect(metrics.profileUpdate).toBeLessThan(PERFORMANCE_THRESHOLDS.PROFILE_UPDATE_SINGLE);
      expect(metrics.profileRetrieval).toBeLessThan(100); // Should be very fast
      expect(metrics.memorySearch).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_SEARCH_SMALL_DATASET);
    });
  });
});