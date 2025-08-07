import { createClient } from '@supabase/supabase-js';

// Test database configuration
export const TEST_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || 'test-service-key',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
  TEST_USER_PREFIX: 'test-user-',
  TEST_CONVERSATION_PREFIX: 'test-conv-',
  CLEANUP_ON_TEARDOWN: true
};

// Global test state
export const TEST_STATE = {
  testUsers: new Set<string>(),
  testConversations: new Set<string>(),
  supabaseClient: null as any
};

export async function setupTestDatabase() {
  console.log('🚀 Setting up test database...');
  
  try {
    // Create Supabase client
    TEST_STATE.supabaseClient = createClient(
      TEST_CONFIG.SUPABASE_URL,
      TEST_CONFIG.SUPABASE_SERVICE_KEY
    );

    // Verify connection
    const { data, error } = await TEST_STATE.supabaseClient
      .from('conversations')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.warn('⚠️ Could not connect to test database:', error.message);
      console.log('📝 Using mock database for tests');
      return createMockDatabase();
    }

    console.log('✅ Connected to test database');
    
    // Clean up any existing test data
    await cleanupTestData();
    
    // Insert baseline test data
    await insertTestData();
    
    return TEST_STATE.supabaseClient;
    
  } catch (error) {
    console.warn('⚠️ Test database setup failed, using mocks:', error);
    return createMockDatabase();
  }
}

export async function teardownTestDatabase() {
  if (!TEST_CONFIG.CLEANUP_ON_TEARDOWN) {
    console.log('🧹 Skipping test cleanup (CLEANUP_ON_TEARDOWN = false)');
    return;
  }

  console.log('🧹 Cleaning up test database...');
  
  try {
    await cleanupTestData();
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test cleanup failed:', error);
  }
}

export async function cleanupTestData() {
  if (!TEST_STATE.supabaseClient) return;

  try {
    // Clean up test messages
    await TEST_STATE.supabaseClient
      .from('messages')
      .delete()
      .like('conversation_id', `${TEST_CONFIG.TEST_CONVERSATION_PREFIX}%`);

    // Clean up test conversations
    await TEST_STATE.supabaseClient
      .from('conversations')
      .delete()
      .like('id', `${TEST_CONFIG.TEST_CONVERSATION_PREFIX}%`);

    // Clean up test user profiles
    await TEST_STATE.supabaseClient
      .from('user_profiles')
      .delete()
      .like('id', `${TEST_CONFIG.TEST_USER_PREFIX}%`);

    // Clean up test embeddings
    await TEST_STATE.supabaseClient
      .from('message_embeddings')
      .delete()
      .like('message_id', `${TEST_CONFIG.TEST_CONVERSATION_PREFIX}%`);

    console.log('🗑️ Cleaned up test data');
    
    // Clear tracking sets
    TEST_STATE.testUsers.clear();
    TEST_STATE.testConversations.clear();
    
  } catch (error) {
    console.warn('⚠️ Failed to clean test data:', error);
  }
}

export async function insertTestData() {
  if (!TEST_STATE.supabaseClient) return;

  try {
    // Insert test users
    const testUsers = [
      {
        id: 'test-user-baseline',
        name: 'Baseline Test User',
        profile_data: {
          userId: 'test-user-baseline',
          name: 'Baseline User',
          preferences: {
            interests: ['testing', 'automation']
          },
          personalFacts: [
            {
              fact: 'Works in QA',
              confidence: 0.9,
              firstMentioned: new Date(),
              lastConfirmed: new Date(),
              source: 'test-conv-baseline'
            }
          ],
          conversationPatterns: {
            commonTopics: ['testing', 'quality assurance']
          },
          lastUpdated: new Date()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: userError } = await TEST_STATE.supabaseClient
      .from('user_profiles')
      .upsert(testUsers);

    if (userError) {
      console.warn('⚠️ Failed to insert test users:', userError);
    }

    // Insert test conversations
    const testConversations = [
      {
        id: 'test-conv-baseline',
        user_id: 'test-user-baseline',
        title: 'Baseline Test Conversation',
        summary: 'Test conversation for baseline functionality',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: convError } = await TEST_STATE.supabaseClient
      .from('conversations')
      .upsert(testConversations);

    if (convError) {
      console.warn('⚠️ Failed to insert test conversations:', convError);
    }

    // Insert test messages
    const testMessages = [
      {
        id: 'test-msg-1',
        conversation_id: 'test-conv-baseline',
        role: 'user',
        content: 'My name is Baseline User and I work in QA',
        metadata: { test: true },
        created_at: new Date().toISOString()
      },
      {
        id: 'test-msg-2',
        conversation_id: 'test-conv-baseline',
        role: 'assistant',
        content: 'Nice to meet you! Tell me more about your QA work.',
        metadata: { test: true },
        created_at: new Date().toISOString()
      }
    ];

    const { error: msgError } = await TEST_STATE.supabaseClient
      .from('messages')
      .upsert(testMessages);

    if (msgError) {
      console.warn('⚠️ Failed to insert test messages:', msgError);
    }

    console.log('📝 Inserted baseline test data');
    
    // Track test data for cleanup
    TEST_STATE.testUsers.add('test-user-baseline');
    TEST_STATE.testConversations.add('test-conv-baseline');
    
  } catch (error) {
    console.warn('⚠️ Failed to insert test data:', error);
  }
}

export function createMockDatabase() {
  console.log('🎭 Creating mock database for tests');
  
  const mockData = {
    users: new Map(),
    conversations: new Map(),
    messages: new Map(),
    embeddings: new Map()
  };

  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => {
            if (table === 'user_profiles') {
              return { data: mockData.users.get(value) || null, error: null };
            }
            return { data: null, error: null };
          },
          limit: (count: number) => ({
            data: [],
            error: null
          })
        }),
        like: (column: string, pattern: string) => ({
          data: [],
          error: null
        })
      }),
      upsert: (data: any) => ({
        select: () => ({ data: [data], error: null }),
        data: [data],
        error: null
      }),
      delete: () => ({
        like: () => ({ data: [], error: null }),
        neq: () => ({ data: [], error: null })
      })
    }),
    
    // Mock methods for test data management
    _mockData: mockData,
    _addUser: (id: string, data: any) => mockData.users.set(id, data),
    _addConversation: (id: string, data: any) => mockData.conversations.set(id, data),
    _addMessage: (id: string, data: any) => mockData.messages.set(id, data),
    _clear: () => {
      mockData.users.clear();
      mockData.conversations.clear();
      mockData.messages.clear();
      mockData.embeddings.clear();
    }
  };
}

// Test data generators
export function createTestUserId(prefix: string = 'test'): string {
  const id = `${TEST_CONFIG.TEST_USER_PREFIX}${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  TEST_STATE.testUsers.add(id);
  return id;
}

export function createTestConversationId(prefix: string = 'test'): string {
  const id = `${TEST_CONFIG.TEST_CONVERSATION_PREFIX}${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  TEST_STATE.testConversations.add(id);
  return id;
}

export function createTestProfile(overrides: any = {}) {
  return {
    userId: createTestUserId(),
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

export function generateTestMessage(index: number, type: 'simple' | 'complex' | 'entities' = 'simple'): string {
  switch (type) {
    case 'simple':
      return `Test message ${index}: Hello world`;
    
    case 'complex':
      return `Test message ${index}: My name is User${index} and I work as a professional${index % 10} in City${index % 20}. I have ${index % 3 + 1} pets and love activity${index % 15}.`;
    
    case 'entities':
      const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
      const locations = ['Boston', 'Seattle', 'Portland', 'Denver', 'Austin'];
      const pets = ['cat', 'dog', 'bird', 'fish', 'hamster'];
      const jobs = ['engineer', 'teacher', 'doctor', 'artist', 'chef'];
      
      return `My name is ${names[index % names.length]} and I live in ${locations[index % locations.length]}. I work as a ${jobs[index % jobs.length]} and have a ${pets[index % pets.length]} named Pet${index}.`;
    
    default:
      return `Test message ${index}`;
  }
}

// Performance monitoring utilities
export class TestPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
      return duration;
    };
  }
  
  recordMetric(label: string, value: number) {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(value);
  }
  
  getMetrics(label: string) {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, total: 0 };
    }
    
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { count: values.length, average, min, max, total };
  }
  
  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [label, values] of this.metrics) {
      result[label] = this.getMetrics(label);
    }
    return result;
  }
  
  reset() {
    this.metrics.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new TestPerformanceMonitor();

// Test utilities for assertions
export const testUtils = {
  expectWithinThreshold: (actual: number, threshold: number, message?: string) => {
    if (actual > threshold) {
      throw new Error(
        message || `Expected ${actual}ms to be within threshold of ${threshold}ms`
      );
    }
  },
  
  expectArrayNotEmpty: (arr: any[], message?: string) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error(message || 'Expected non-empty array');
    }
  },
  
  expectValidEntity: (entity: any, message?: string) => {
    if (!entity || typeof entity !== 'object') {
      throw new Error(message || 'Expected valid entity object');
    }
    
    if (!entity.type || !entity.value || typeof entity.confidence !== 'number') {
      throw new Error(message || 'Entity missing required fields: type, value, confidence');
    }
    
    if (entity.confidence < 0 || entity.confidence > 1) {
      throw new Error(message || `Entity confidence ${entity.confidence} not in range [0,1]`);
    }
  },
  
  expectValidProfile: (profile: any, message?: string) => {
    if (!profile || typeof profile !== 'object') {
      throw new Error(message || 'Expected valid profile object');
    }
    
    const requiredFields = ['userId', 'preferences', 'personalFacts', 'conversationPatterns', 'lastUpdated'];
    for (const field of requiredFields) {
      if (!(field in profile)) {
        throw new Error(message || `Profile missing required field: ${field}`);
      }
    }
    
    if (!Array.isArray(profile.personalFacts)) {
      throw new Error(message || 'Profile.personalFacts must be an array');
    }
    
    if (!Array.isArray(profile.preferences.interests)) {
      throw new Error(message || 'Profile.preferences.interests must be an array');
    }
  }
};

// Export test configuration for Jest
export const jestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testDatabase.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 4, // Limit concurrent tests to prevent database conflicts
  verbose: true
};