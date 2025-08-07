# ConversAI Memory System Testing Strategy

## Overview
This document outlines a comprehensive testing strategy for the ConversAI memory system to ensure reliable fact storage, retrieval, updates, and multi-conversation consistency.

## System Architecture Analysis

The memory system consists of:
- **MemoryManager**: Conversation search and summarization
- **UserProfileManager**: User profile and fact management
- **EntityExtractor**: Pattern-based entity extraction
- **Database Layer**: Supabase with conversations, messages, user_profiles tables

## Critical Issues Identified
1. **Inconsistent fact storage** between `name` column and `profile_data` JSONB
2. **Entity extraction gaps** for complex patterns
3. **Cross-conversation consistency** not guaranteed
4. **Conflicting information handling** missing
5. **Performance degradation** under load
6. **Edge cases** with special characters and empty data

## Test Categories

### 1. Unit Tests - Core Components

#### 1.1 EntityExtractor Tests
**File**: `tests/unit/entityExtractor.test.ts`

```typescript
describe('EntityExtractor', () => {
  describe('Name Extraction', () => {
    test('should extract simple name declarations', async () => {
      const entities = await EntityExtractor.extractEntities("My name is John");
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('name');
      expect(entities[0].value).toBe('John');
    });

    test('should extract name variations', async () => {
      const cases = [
        "I'm Sarah",
        "Call me Mike", 
        "I am David Johnson",
        "Hi, I'm Alex"
      ];
      // Verify all patterns work
    });

    test('should not extract names from questions', async () => {
      const entities = await EntityExtractor.extractEntities("What is your name?");
      expect(entities).toHaveLength(0);
    });
  });

  describe('Pet Extraction', () => {
    test('should extract single pet with name', async () => {
      const entities = await EntityExtractor.extractEntities("I have a cat named Whiskers");
      expect(entities[0].value).toEqual({ species: 'cat', name: 'Whiskers' });
    });

    test('should extract multiple pets', async () => {
      const entities = await EntityExtractor.extractEntities("I have two dogs named Max and Buddy");
      expect(entities[0].value).toEqual({ count: 'two', species: 'dogs', names: 'Max and Buddy' });
    });

    test('should handle complex pet descriptions', async () => {
      // "My golden retriever Buddy is 3 years old"
      // "We adopted a rescue cat called Shadow last year"
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings', async () => {
      const entities = await EntityExtractor.extractEntities("");
      expect(entities).toHaveLength(0);
    });

    test('should handle special characters in names', async () => {
      const entities = await EntityExtractor.extractEntities("My name is José O'Connor-Smith");
      expect(entities[0].value).toBe("José O'Connor-Smith");
    });

    test('should handle very long messages', async () => {
      const longMessage = "A".repeat(10000) + " my name is John";
      const entities = await EntityExtractor.extractEntities(longMessage);
      expect(entities).toHaveLength(1);
    });
  });
});
```

#### 1.2 UserProfileManager Tests
**File**: `tests/unit/userProfileManager.test.ts`

```typescript
describe('UserProfileManager', () => {
  let mockSupabase: any;
  let manager: UserProfileManager;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    manager = new UserProfileManager();
    manager.supabase = mockSupabase;
  });

  describe('Profile Creation', () => {
    test('should create new profile for new user', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({ eq: () => ({ single: () => ({ data: null }) }) })
      });

      const profile = await manager.getOrCreateProfile('user123');
      
      expect(profile.userId).toBe('user123');
      expect(profile.personalFacts).toEqual([]);
      expect(profile.preferences.interests).toEqual([]);
    });
  });

  describe('Fact Storage', () => {
    test('should store facts with confidence scores', async () => {
      const profile: UserProfile = createTestProfile();
      
      manager.addPersonalFact(profile, "User's name is John", "conv123");
      
      expect(profile.personalFacts).toHaveLength(1);
      expect(profile.personalFacts[0].fact).toBe("User's name is John");
      expect(profile.personalFacts[0].confidence).toBe(0.9);
    });

    test('should update confidence on repeated facts', async () => {
      const profile: UserProfile = createTestProfile();
      
      manager.addPersonalFact(profile, "User likes coffee", "conv123");
      manager.addPersonalFact(profile, "User likes coffee", "conv456");
      
      expect(profile.personalFacts).toHaveLength(1);
      expect(profile.personalFacts[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Fact Updates', () => {
    test('should handle name changes', async () => {
      const profile: UserProfile = createTestProfile();
      profile.name = "John";
      
      await manager.updateProfileFromConversation('user123', 'conv123', [
        { role: 'user', content: 'Actually, call me Johnny' }
      ]);
      
      expect(profile.preferences.preferredName).toBe('Johnny');
    });

    test('should handle location updates', async () => {
      const profile: UserProfile = createTestProfile();
      
      await manager.updateProfileFromConversation('user123', 'conv123', [
        { role: 'user', content: 'I moved to New York' },
        { role: 'user', content: 'I now live in Boston' }
      ]);
      
      // Should handle the update properly
      expect(profile.preferences.location).toBe('Boston');
    });
  });

  describe('Context Building', () => {
    test('should build comprehensive user context', () => {
      const profile: UserProfile = {
        userId: 'user123',
        name: 'John',
        preferences: {
          location: 'Boston',
          occupation: 'Engineer',
          interests: ['coding', 'hiking']
        },
        personalFacts: [
          { fact: 'Has two cats', confidence: 0.9, firstMentioned: new Date(), lastConfirmed: new Date(), source: 'conv123' }
        ],
        conversationPatterns: { commonTopics: [] },
        lastUpdated: new Date()
      };

      const context = manager.buildUserContext(profile);
      
      expect(context).toContain("The user's name is John");
      expect(context).toContain("They live in Boston");
      expect(context).toContain("They work as Engineer");
      expect(context).toContain("coding, hiking");
      expect(context).toContain("Has two cats");
    });
  });
});
```

### 2. Integration Tests - System Interactions

#### 2.1 End-to-End Memory Flow Tests
**File**: `tests/integration/memoryFlow.test.ts`

```typescript
describe('Memory System Integration', () => {
  let supabase: any;
  let memoryManager: MemoryManager;
  let userProfileManager: UserProfileManager;

  beforeAll(async () => {
    // Setup test database
    supabase = createTestSupabaseClient();
    memoryManager = new MemoryManager();
    userProfileManager = new UserProfileManager();
    await userProfileManager.initialize();
  });

  describe('Fact Storage and Retrieval Flow', () => {
    test('should store and retrieve basic facts across conversations', async () => {
      const userId = 'test-user-123';
      
      // Conversation 1: User introduces themselves
      await userProfileManager.updateProfileFromConversation(userId, 'conv1', [
        { role: 'user', content: 'My name is Sarah and I have a cat named Mittens' }
      ]);

      // Conversation 2: Different conversation, should remember facts
      const profile = await userProfileManager.getOrCreateProfile(userId);
      const context = userProfileManager.buildUserContext(profile);

      expect(context).toContain('Sarah');
      expect(context).toContain('cat');
    });

    test('should handle fact updates correctly', async () => {
      const userId = 'test-user-456';
      
      // Initial fact
      await userProfileManager.updateProfileFromConversation(userId, 'conv1', [
        { role: 'user', content: 'I live in Boston' }
      ]);

      // Update fact
      await userProfileManager.updateProfileFromConversation(userId, 'conv2', [
        { role: 'user', content: 'I moved to New York last month' }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Should handle the location change
      expect(profile.preferences.location).toBe('New York');
    });
  });

  describe('Cross-Conversation Consistency', () => {
    test('should maintain consistency across multiple conversations', async () => {
      const userId = 'test-user-789';
      
      // Conversation 1
      await userProfileManager.updateProfileFromConversation(userId, 'conv1', [
        { role: 'user', content: 'My name is Mike and I work as a teacher' }
      ]);

      // Conversation 2 (days later)
      await userProfileManager.updateProfileFromConversation(userId, 'conv2', [
        { role: 'user', content: 'I love teaching kids' }
      ]);

      // Conversation 3 (weeks later)
      const profile = await userProfileManager.getOrCreateProfile(userId);
      const context = userProfileManager.buildUserContext(profile);

      expect(context).toContain('Mike');
      expect(context).toContain('teacher');
    });
  });

  describe('Conflicting Information Handling', () => {
    test('should handle conflicting names gracefully', async () => {
      const userId = 'test-user-conflict';
      
      await userProfileManager.updateProfileFromConversation(userId, 'conv1', [
        { role: 'user', content: 'My name is John' }
      ]);

      // Different name mentioned later
      await userProfileManager.updateProfileFromConversation(userId, 'conv2', [
        { role: 'user', content: 'Actually, I prefer to be called Johnny' }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Should prefer the more recent preferred name
      expect(profile.preferences.preferredName).toBe('Johnny');
    });

    test('should handle contradictory location information', async () => {
      const userId = 'test-user-location';
      
      await userProfileManager.updateProfileFromConversation(userId, 'conv1', [
        { role: 'user', content: 'I live in Seattle' }
      ]);

      await userProfileManager.updateProfileFromConversation(userId, 'conv2', [
        { role: 'user', content: 'I live in Portland' }
      ]);

      const profile = await userProfileManager.getOrCreateProfile(userId);
      
      // Should track both facts with confidence scores
      expect(profile.personalFacts.some(f => f.fact.includes('Seattle'))).toBe(true);
      expect(profile.personalFacts.some(f => f.fact.includes('Portland'))).toBe(true);
    });
  });
});
```

### 3. Performance Tests

#### 3.1 Load Testing
**File**: `tests/performance/memoryLoad.test.ts`

```typescript
describe('Memory System Performance', () => {
  describe('High Volume Operations', () => {
    test('should handle 1000 concurrent fact extractions', async () => {
      const promises = Array(1000).fill(null).map((_, i) => 
        EntityExtractor.extractEntities(`My name is User${i} and I have a pet cat`)
      );

      const start = performance.now();
      const results = await Promise.all(promises);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.every(r => r.length > 0)).toBe(true);
    });

    test('should handle large conversation histories', async () => {
      const userId = 'performance-test-user';
      const largeMessages = Array(500).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `Message ${i}: I like activity${i % 20} and I have interest${i % 15}`
      }));

      const start = performance.now();
      await userProfileManager.updateProfileFromConversation(userId, 'large-conv', largeMessages);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await EntityExtractor.extractEntities(`Test message ${i} with name John${i}`);
      }

      global.gc?.(); // Force garbage collection if available

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe('Database Performance', () => {
    test('should efficiently search across large message history', async () => {
      // Create test data with 10,000 messages
      await createLargeTestDataset();

      const start = performance.now();
      const results = await memoryManager.searchMemory('coffee', 'test-user', 10);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
```

### 4. Edge Case Tests

#### 4.1 Boundary Conditions
**File**: `tests/edge-cases/boundaryConditions.test.ts`

```typescript
describe('Memory System Edge Cases', () => {
  describe('Input Validation', () => {
    test('should handle null and undefined inputs', async () => {
      expect(() => EntityExtractor.extractEntities(null)).not.toThrow();
      expect(() => EntityExtractor.extractEntities(undefined)).not.toThrow();
    });

    test('should handle extremely long messages', async () => {
      const veryLongMessage = 'A'.repeat(100000) + ' my name is John';
      const entities = await EntityExtractor.extractEntities(veryLongMessage);
      
      expect(entities).toHaveLength(1);
      expect(entities[0].value).toBe('John');
    });

    test('should handle messages with only special characters', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const entities = await EntityExtractor.extractEntities(specialChars);
      
      expect(entities).toHaveLength(0);
    });
  });

  describe('Unicode and International Support', () => {
    test('should handle non-ASCII names', async () => {
      const testCases = [
        'My name is José',
        'I am Müller',
        'Call me 张伟',
        'My name is Владимир'
      ];

      for (const message of testCases) {
        const entities = await EntityExtractor.extractEntities(message);
        expect(entities.length).toBeGreaterThan(0);
      }
    });

    test('should handle emojis in messages', async () => {
      const entities = await EntityExtractor.extractEntities('My cat 🐱 is named Fluffy');
      expect(entities.some(e => e.value.name === 'Fluffy')).toBe(true);
    });
  });

  describe('Database Edge Cases', () => {
    test('should handle database connection failures gracefully', async () => {
      // Mock database failure
      const mockSupabase = {
        from: () => ({
          select: () => ({ eq: () => ({ single: () => ({ data: null, error: new Error('Connection failed') }) }) })
        })
      };

      const manager = new UserProfileManager();
      manager.supabase = mockSupabase;

      const profile = await manager.getOrCreateProfile('test-user');
      expect(profile).toBeDefined(); // Should fallback gracefully
    });

    test('should handle concurrent updates to same user profile', async () => {
      const userId = 'concurrent-test-user';
      
      const promises = [
        userProfileManager.updateProfileFromConversation(userId, 'conv1', [
          { role: 'user', content: 'My name is John' }
        ]),
        userProfileManager.updateProfileFromConversation(userId, 'conv2', [
          { role: 'user', content: 'I live in Boston' }
        ]),
        userProfileManager.updateProfileFromConversation(userId, 'conv3', [
          { role: 'user', content: 'I have a dog named Max' }
        ])
      ];

      await Promise.all(promises);

      const profile = await userProfileManager.getOrCreateProfile(userId);
      expect(profile.name).toBe('John');
      expect(profile.preferences.location).toBe('Boston');
      expect(profile.personalFacts.some(f => f.fact.includes('dog named Max'))).toBe(true);
    });
  });
});
```

## Test Data Management

### Test Database Setup
**File**: `tests/setup/testDatabase.ts`

```typescript
export async function setupTestDatabase() {
  const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_KEY);
  
  // Clean test tables
  await supabase.from('messages').delete().neq('id', '');
  await supabase.from('conversations').delete().neq('id', '');
  await supabase.from('user_profiles').delete().neq('id', '');
  
  // Insert test data
  await insertTestUsers();
  await insertTestConversations();
  await insertTestMessages();
}

export function createTestProfile(): UserProfile {
  return {
    userId: 'test-user',
    preferences: { interests: [] },
    personalFacts: [],
    conversationPatterns: { commonTopics: [] },
    lastUpdated: new Date()
  };
}
```

## Acceptance Criteria

### Critical Bug Prevention Tests

1. **Name Storage Consistency**: 
   - ✅ Names stored in both `name` column and `profile_data.name`
   - ✅ No conflicts between storage locations
   - ✅ Updates reflected in both places

2. **Entity Extraction Accuracy**:
   - ✅ 95%+ accuracy for common patterns (names, pets, locations)
   - ✅ Handles variations and edge cases
   - ✅ No false positives from questions

3. **Cross-Conversation Memory**:
   - ✅ Facts persist across conversation boundaries
   - ✅ Context building includes historical facts
   - ✅ No data loss between sessions

4. **Conflict Resolution**:
   - ✅ Conflicting information tracked with confidence scores
   - ✅ Recent information weighted higher
   - ✅ No data corruption from conflicts

5. **Performance Standards**:
   - ✅ Entity extraction < 100ms per message
   - ✅ Profile retrieval < 500ms
   - ✅ Memory search < 1s for 10k+ messages
   - ✅ No memory leaks under load

## Test Execution Strategy

### Automated Testing Pipeline

1. **Pre-commit hooks**: Run unit tests
2. **CI/CD pipeline**: Full test suite on every PR
3. **Nightly builds**: Performance and load tests
4. **Production monitoring**: Continuous health checks

### Test Environment Setup

```bash
# Install test dependencies
npm install --save-dev jest @testing-library/jest-dom supertest

# Run test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:performance   # Performance tests
npm run test:all          # Complete test suite

# Test coverage
npm run test:coverage     # Generate coverage report
```

### Monitoring and Alerting

- **Test failure alerts**: Immediate notification on test failures
- **Performance degradation**: Alert when response times exceed thresholds
- **Data consistency checks**: Regular validation of stored vs retrieved data
- **Memory leak detection**: Monitor memory usage patterns

This comprehensive testing strategy will catch the current bugs and prevent future regressions in the ConversAI memory system.