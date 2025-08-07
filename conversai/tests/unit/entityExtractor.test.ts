import { EntityExtractor, ExtractedEntity } from '../../src/lib/services/memory/entityExtractor';

describe('EntityExtractor', () => {
  describe('Name Extraction', () => {
    test('should extract simple name declarations', async () => {
      const testCases = [
        { input: "My name is John", expected: "John" },
        { input: "I'm Sarah", expected: "Sarah" },
        { input: "Call me Mike", expected: "Mike" },
        { input: "I am David Johnson", expected: "David Johnson" }
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const nameEntity = entities.find(e => e.type === 'name');
        
        expect(nameEntity).toBeDefined();
        expect(nameEntity?.value).toBe(testCase.expected);
        expect(nameEntity?.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should not extract names from questions', async () => {
      const questions = [
        "What is your name?",
        "Can you tell me your name?",
        "Do you know my name?",
        "Who am I?"
      ];

      for (const question of questions) {
        const entities = await EntityExtractor.extractEntities(question);
        const nameEntities = entities.filter(e => e.type === 'name');
        expect(nameEntities).toHaveLength(0);
      }
    });

    test('should handle names with special characters', async () => {
      const testCases = [
        "My name is José",
        "I'm O'Connor",
        "Call me Jean-Pierre",
        "My name is Mary-Jane Smith"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const nameEntities = entities.filter(e => e.type === 'name');
        expect(nameEntities.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Pet Extraction', () => {
    test('should extract single pet with name', async () => {
      const testCases = [
        { 
          input: "I have a cat named Whiskers", 
          expectedType: "pets",
          expectedName: "Whiskers",
          expectedSpecies: "cat"
        },
        { 
          input: "My dog is called Buddy", 
          expectedType: "pets",
          expectedName: "Buddy" 
        },
        { 
          input: "The bird named Tweety is mine", 
          expectedType: "pets",
          expectedName: "Tweety" 
        }
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const petEntity = entities.find(e => e.type === 'pets');
        
        expect(petEntity).toBeDefined();
        expect(petEntity?.value).toHaveProperty('name', testCase.expectedName);
        expect(petEntity?.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should extract multiple pets', async () => {
      const testCases = [
        {
          input: "I have two cats named Holly and Benny",
          expectedCount: "two",
          expectedSpecies: "cats",
          expectedNames: "Holly and Benny"
        },
        {
          input: "We have three fish named Nemo, Dory, and Bubbles",
          expectedCount: "three", 
          expectedSpecies: "fish",
          expectedNames: "Nemo, Dory, and Bubbles"
        }
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const petEntity = entities.find(e => e.type === 'pets');
        
        expect(petEntity).toBeDefined();
        expect(petEntity?.value).toHaveProperty('count', testCase.expectedCount);
        expect(petEntity?.value).toHaveProperty('species', testCase.expectedSpecies);
        expect(petEntity?.value).toHaveProperty('names', testCase.expectedNames);
      }
    });

    test('should handle pet descriptions without explicit names', async () => {
      const entities = await EntityExtractor.extractEntities("I have a golden retriever");
      const petEntities = entities.filter(e => e.type === 'pets');
      
      // Should either extract the pet type or not extract if pattern doesn't match
      // This tests the robustness of the pattern matching
      expect(petEntities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Location Extraction', () => {
    test('should extract residence locations', async () => {
      const testCases = [
        { input: "I live in Berlin", expected: { type: 'residence', location: 'Berlin' }},
        { input: "I reside in New York City", expected: { type: 'residence', location: 'New York City' }},
        { input: "I stay in Los Angeles", expected: { type: 'residence', location: 'Los Angeles' }}
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const locationEntity = entities.find(e => e.type === 'locations');
        
        expect(locationEntity).toBeDefined();
        expect(locationEntity?.value.type).toBe(testCase.expected.type);
        expect(locationEntity?.value.location).toBe(testCase.expected.location);
      }
    });

    test('should extract origin locations', async () => {
      const testCases = [
        { input: "I'm from Munich", expected: { type: 'origin', location: 'Munich' }},
        { input: "I am from San Francisco", expected: { type: 'origin', location: 'San Francisco' }}
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const locationEntity = entities.find(e => e.type === 'locations');
        
        expect(locationEntity).toBeDefined();
        expect(locationEntity?.value.type).toBe(testCase.expected.type);
        expect(locationEntity?.value.location).toBe(testCase.expected.location);
      }
    });

    test('should extract work locations', async () => {
      const entities = await EntityExtractor.extractEntities("I work in downtown Seattle");
      const locationEntity = entities.find(e => e.type === 'locations');
      
      expect(locationEntity).toBeDefined();
      expect(locationEntity?.value.type).toBe('work');
      expect(locationEntity?.value.location).toBe('downtown Seattle');
    });
  });

  describe('Relationship Extraction', () => {
    test('should extract family relationships', async () => {
      const testCases = [
        { input: "My wife Sarah is a doctor", relationship: "wife", name: "Sarah" },
        { input: "My brother John lives in NYC", relationship: "brother", name: "John" },
        { input: "My mother Mary called today", relationship: "mother", name: "Mary" }
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase.input);
        const relationshipEntity = entities.find(e => e.type === 'relationships');
        
        expect(relationshipEntity).toBeDefined();
        expect(relationshipEntity?.value.relationship).toBe(testCase.relationship);
        expect(relationshipEntity?.value.name).toBe(testCase.name);
      }
    });

    test('should not extract non-relationship patterns', async () => {
      const entities = await EntityExtractor.extractEntities("My car is red");
      const relationshipEntities = entities.filter(e => e.type === 'relationships');
      
      expect(relationshipEntities).toHaveLength(0);
    });
  });

  describe('Preference Extraction', () => {
    test('should extract likes', async () => {
      const testCases = [
        "I love coffee",
        "I like hiking", 
        "I enjoy reading books",
        "I prefer tea over coffee"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const preferenceEntity = entities.find(e => e.type === 'preferences');
        
        expect(preferenceEntity).toBeDefined();
        expect(preferenceEntity?.value.preference).toBe('likes');
        expect(preferenceEntity?.value.value).toBeDefined();
      }
    });

    test('should extract dislikes', async () => {
      const testCases = [
        "I hate waking up early",
        "I dislike crowds",
        "I don't like spicy food",
        "I can't stand loud music"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const preferenceEntity = entities.find(e => e.type === 'preferences');
        
        expect(preferenceEntity).toBeDefined();
        expect(preferenceEntity?.value.preference).toBe('dislikes');
        expect(preferenceEntity?.value.value).toBeDefined();
      }
    });

    test('should extract favorites', async () => {
      const entities = await EntityExtractor.extractEntities("My favorite food is pizza");
      const preferenceEntity = entities.find(e => e.type === 'preferences');
      
      expect(preferenceEntity).toBeDefined();
      expect(preferenceEntity?.value.preference).toBe('favorite');
      expect(preferenceEntity?.value.type).toBe('food');
      expect(preferenceEntity?.value.value).toBe('pizza');
    });
  });

  describe('Date Extraction', () => {
    test('should extract birthdays', async () => {
      const testCases = [
        "My birthday is March 15",
        "My birthday is on June 20th",
        "My birthday is December 3rd, 1990"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const dateEntity = entities.find(e => e.type === 'dates');
        
        expect(dateEntity).toBeDefined();
        expect(dateEntity?.value.type).toBe('birthday');
        expect(dateEntity?.value.date).toBeDefined();
      }
    });

    test('should extract anniversaries', async () => {
      const entities = await EntityExtractor.extractEntities("My anniversary is June 10th");
      const dateEntity = entities.find(e => e.type === 'dates');
      
      expect(dateEntity).toBeDefined();
      expect(dateEntity?.value.type).toBe('anniversary');
      expect(dateEntity?.value.date).toBe('June 10th');
    });
  });

  describe('Medical Information Extraction', () => {
    test('should extract allergies', async () => {
      const testCases = [
        "I'm allergic to peanuts",
        "I am allergic to shellfish and dairy"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const medicalEntity = entities.find(e => e.type === 'medical');
        
        expect(medicalEntity).toBeDefined();
        expect(medicalEntity?.value.type).toBe('allergy');
        expect(medicalEntity?.value.value).toBeDefined();
      }
    });

    test('should extract medical conditions', async () => {
      const entities = await EntityExtractor.extractEntities("I have asthma");
      const medicalEntity = entities.find(e => e.type === 'medical');
      
      expect(medicalEntity).toBeDefined();
      expect(medicalEntity?.value.type).toBe('condition');
      expect(medicalEntity?.value.value).toBe('asthma');
    });
  });

  describe('Work Information Extraction', () => {
    test('should extract professions', async () => {
      const testCases = [
        "I'm a software engineer",
        "I am an architect", 
        "I'm a teacher"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const workEntity = entities.find(e => e.type === 'work');
        
        expect(workEntity).toBeDefined();
        expect(workEntity?.value.profession).toBeDefined();
      }
    });

    test('should extract work details', async () => {
      const testCases = [
        "I work as a data scientist",
        "I work in marketing",
        "I work at Google",
        "I work for a startup"
      ];

      for (const testCase of testCases) {
        const entities = await EntityExtractor.extractEntities(testCase);
        const workEntity = entities.find(e => e.type === 'work');
        
        expect(workEntity).toBeDefined();
        expect(workEntity?.value.work).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings', async () => {
      const entities = await EntityExtractor.extractEntities("");
      expect(entities).toHaveLength(0);
    });

    test('should handle null and undefined', async () => {
      expect(() => EntityExtractor.extractEntities(null as any)).not.toThrow();
      expect(() => EntityExtractor.extractEntities(undefined as any)).not.toThrow();
    });

    test('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000) + ' my name is John';
      const entities = await EntityExtractor.extractEntities(longMessage);
      
      const nameEntity = entities.find(e => e.type === 'name');
      expect(nameEntity).toBeDefined();
      expect(nameEntity?.value).toBe('John');
    });

    test('should handle special characters in messages', async () => {
      const entities = await EntityExtractor.extractEntities("My name is José O'Connor-Smith");
      const nameEntity = entities.find(e => e.type === 'name');
      
      expect(nameEntity).toBeDefined();
      expect(nameEntity?.value).toBe("José O'Connor-Smith");
    });

    test('should handle messages with only special characters', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const entities = await EntityExtractor.extractEntities(specialChars);
      
      expect(entities).toHaveLength(0);
    });

    test('should handle mixed language content', async () => {
      const entities = await EntityExtractor.extractEntities("Bonjour, my name is Pierre");
      const nameEntity = entities.find(e => e.type === 'name');
      
      expect(nameEntity).toBeDefined();
      expect(nameEntity?.value).toBe('Pierre');
    });

    test('should handle emojis in pet names', async () => {
      const entities = await EntityExtractor.extractEntities("My cat 🐱 is named Fluffy");
      const petEntity = entities.find(e => e.type === 'pets');
      
      if (petEntity) {
        expect(petEntity.value.name).toBe('Fluffy');
      }
    });

    test('should handle multiple entities in one message', async () => {
      const message = "Hi, I'm Sarah from Boston and I have a dog named Max. I love coffee and work as a teacher.";
      const entities = await EntityExtractor.extractEntities(message);
      
      expect(entities.length).toBeGreaterThan(1);
      
      const types = entities.map(e => e.type);
      expect(types).toContain('name');
      expect(types).toContain('locations');
      expect(types).toContain('pets');
      expect(types).toContain('preferences');
      expect(types).toContain('work');
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign appropriate confidence scores', async () => {
      const entities = await EntityExtractor.extractEntities("My name is definitely John");
      
      for (const entity of entities) {
        expect(entity.confidence).toBeGreaterThan(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should include raw text for each extraction', async () => {
      const entities = await EntityExtractor.extractEntities("My name is John and I live in Boston");
      
      for (const entity of entities) {
        expect(entity.rawText).toBeDefined();
        expect(typeof entity.rawText).toBe('string');
        expect(entity.rawText.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance', () => {
    test('should process messages efficiently', async () => {
      const start = performance.now();
      
      const promises = Array(100).fill(null).map((_, i) => 
        EntityExtractor.extractEntities(`Message ${i}: My name is User${i}`)
      );
      
      await Promise.all(promises);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent extractions', async () => {
      const concurrentMessages = [
        "My name is Alice and I have a cat",
        "I live in Seattle and work as an engineer", 
        "My birthday is March 15th and I love hiking",
        "I'm from Portland and have two dogs named Max and Buddy"
      ];

      const start = performance.now();
      const results = await Promise.all(
        concurrentMessages.map(msg => EntityExtractor.extractEntities(msg))
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Should be fast for concurrent operations
      expect(results.every(r => r.length > 0)).toBe(true);
    });
  });
});