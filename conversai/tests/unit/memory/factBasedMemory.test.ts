import { factBasedMemory, FactCategory } from '../factBasedMemory';

describe('FactBasedMemory', () => {
  const testUserId = 'test-user-123';
  
  beforeEach(() => {
    // Clear all facts before each test
    factBasedMemory.clearAllFacts();
  });

  describe('Fact Extraction', () => {
    it('should extract name from various patterns', async () => {
      const testCases = [
        { input: 'My name is Clemens', expectedName: 'Clemens' },
        { input: "I'm John", expectedName: 'John' },
        { input: 'I am Sarah', expectedName: 'Sarah' },
        { input: 'call me Mike', expectedName: 'Mike' },
      ];

      for (const testCase of testCases) {
        factBasedMemory.clearAllFacts();
        const facts = await factBasedMemory.extractFactsFromMessage(testCase.input, testUserId);
        
        expect(facts).toHaveLength(1);
        expect(facts[0].category).toBe(FactCategory.IDENTITY);
        expect(facts[0].key).toBe('user.name');
        expect(facts[0].value).toBe(testCase.expectedName);
      }
    });

    it('should extract pets with names', async () => {
      const input = 'I have two cats named Holly and Jasper';
      const facts = await factBasedMemory.extractFactsFromMessage(input, testUserId);
      
      expect(facts).toHaveLength(2);
      expect(facts[0].category).toBe(FactCategory.RELATIONSHIPS);
      expect(facts[0].key).toBe('pet.cats.holly');
      expect(facts[0].value).toBe('cats named Holly');
      
      expect(facts[1].key).toBe('pet.cats.jasper');
      expect(facts[1].value).toBe('cats named Jasper');
    });

    it('should extract location', async () => {
      const testCases = [
        { input: 'I live in San Francisco', expectedLocation: 'San Francisco' },
        { input: 'I am from New York', expectedLocation: 'New York' },
        { input: 'I reside in London', expectedLocation: 'London' },
      ];

      for (const testCase of testCases) {
        factBasedMemory.clearAllFacts();
        const facts = await factBasedMemory.extractFactsFromMessage(testCase.input, testUserId);
        
        expect(facts).toHaveLength(1);
        expect(facts[0].category).toBe(FactCategory.LOCATION);
        expect(facts[0].key).toBe('user.location.home');
        expect(facts[0].value).toBe(testCase.expectedLocation);
      }
    });

    it('should extract occupation', async () => {
      const testCases = [
        { input: 'I work as a software engineer', expectedOccupation: 'software engineer' },
        { input: 'I am a doctor', expectedOccupation: 'doctor' },
        { input: 'I work in marketing', expectedOccupation: 'marketing' },
      ];

      for (const testCase of testCases) {
        factBasedMemory.clearAllFacts();
        const facts = await factBasedMemory.extractFactsFromMessage(testCase.input, testUserId);
        
        expect(facts).toHaveLength(1);
        expect(facts[0].category).toBe(FactCategory.IDENTITY);
        expect(facts[0].key).toBe('user.occupation');
        expect(facts[0].value).toBe(testCase.expectedOccupation);
      }
    });

    it('should extract preferences', async () => {
      const testCases = [
        { input: 'I like pizza', expectedPreference: 'pizza' },
        { input: 'I love coding', expectedPreference: 'coding' },
        { input: 'I enjoy hiking', expectedPreference: 'hiking' },
      ];

      for (const testCase of testCases) {
        factBasedMemory.clearAllFacts();
        const facts = await factBasedMemory.extractFactsFromMessage(testCase.input, testUserId);
        
        expect(facts).toHaveLength(1);
        expect(facts[0].category).toBe(FactCategory.PREFERENCES);
        expect(facts[0].key).toBe(`user.likes.${testCase.expectedPreference}`);
        expect(facts[0].value).toBe(testCase.expectedPreference);
      }
    });

    it('should extract multiple facts from a complex message', async () => {
      const input = "My name is Clemens and I'm a software engineer. I live in Vienna and I have a cat named Holly.";
      const facts = await factBasedMemory.extractFactsFromMessage(input, testUserId);
      
      expect(facts.length).toBeGreaterThanOrEqual(3);
      
      // Check for name
      const nameFact = facts.find(f => f.key === 'user.name');
      expect(nameFact).toBeDefined();
      expect(nameFact?.value).toBe('Clemens');
      
      // Check for occupation
      const occupationFact = facts.find(f => f.key === 'user.occupation');
      expect(occupationFact).toBeDefined();
      expect(occupationFact?.value).toBe('software engineer');
      
      // Check for location
      const locationFact = facts.find(f => f.key === 'user.location.home');
      expect(locationFact).toBeDefined();
      expect(locationFact?.value).toBe('Vienna');
    });
  });

  describe('Fact Retrieval', () => {
    it('should retrieve facts by exact key', async () => {
      // Store a fact
      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.IDENTITY,
        key: 'user.name',
        value: 'Clemens',
        rawText: 'My name is Clemens',
        confidence: 0.95
      });

      const fact = await factBasedMemory.getFactByKey('user.name');
      expect(fact).toBeDefined();
      expect(fact?.value).toBe('Clemens');
    });

    it('should retrieve facts by category', async () => {
      // Store multiple facts
      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.IDENTITY,
        key: 'user.name',
        value: 'Clemens',
        rawText: 'My name is Clemens',
        confidence: 0.95
      });

      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.IDENTITY,
        key: 'user.occupation',
        value: 'software engineer',
        rawText: 'I am a software engineer',
        confidence: 0.8
      });

      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.PREFERENCES,
        key: 'user.likes.coding',
        value: 'coding',
        rawText: 'I like coding',
        confidence: 0.75
      });

      const identityFacts = await factBasedMemory.retrieveFacts({
        categories: [FactCategory.IDENTITY]
      });

      expect(identityFacts).toHaveLength(2);
      expect(identityFacts.every(f => f.category === FactCategory.IDENTITY)).toBe(true);
    });

    it('should retrieve facts by keywords', async () => {
      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.RELATIONSHIPS,
        key: 'pet.cat.holly',
        value: 'cat named Holly',
        rawText: 'I have a cat named Holly',
        confidence: 0.9
      });

      const facts = await factBasedMemory.retrieveFacts({
        keywords: ['holly', 'cat']
      });

      expect(facts).toHaveLength(1);
      expect(facts[0].value).toBe('cat named Holly');
    });

    it('should update fact with higher confidence', async () => {
      // Store initial fact
      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.IDENTITY,
        key: 'user.name',
        value: 'John',
        rawText: "I think I'm John",
        confidence: 0.5
      });

      // Store same key with higher confidence
      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.IDENTITY,
        key: 'user.name',
        value: 'Clemens',
        rawText: 'My name is definitely Clemens',
        confidence: 0.95
      });

      const fact = await factBasedMemory.getFactByKey('user.name');
      expect(fact?.value).toBe('Clemens');
      expect(fact?.confidence).toBe(0.95);
    });
  });

  describe('Context Building', () => {
    it('should build formatted context from facts', async () => {
      // Store various facts
      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.IDENTITY,
        key: 'user.name',
        value: 'Clemens',
        rawText: 'My name is Clemens',
        confidence: 0.95
      });

      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.LOCATION,
        key: 'user.location.home',
        value: 'Vienna',
        rawText: 'I live in Vienna',
        confidence: 0.85
      });

      await factBasedMemory.storeFact({
        userId: testUserId,
        category: FactCategory.RELATIONSHIPS,
        key: 'pet.cat.holly',
        value: 'cat named Holly',
        rawText: 'I have a cat named Holly',
        confidence: 0.9
      });

      const allFacts = await factBasedMemory.getAllUserFacts(testUserId);
      const context = factBasedMemory.buildContextFromFacts(allFacts);

      expect(context).toContain('=== USER FACTS ===');
      expect(context).toContain('Identity:');
      expect(context).toContain('- Clemens');
      expect(context).toContain('Location:');
      expect(context).toContain('- Vienna');
      expect(context).toContain('Relationships:');
      expect(context).toContain('- cat named Holly');
      expect(context).toContain('=== END USER FACTS ===');
    });
  });
});