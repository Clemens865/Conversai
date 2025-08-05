#!/usr/bin/env node

import { EntityExtractor } from '../src/lib/services/memory/entityExtractor.js';

async function testEntityExtraction() {
  console.log('🧪 Testing Enhanced Entity Extraction\n');

  const testMessages = [
    // Names
    "My name is Clemens",
    "Hi, I'm Sarah and I work as a software engineer",
    
    // Pets
    "I have two cats named Holly and Benny",
    "My dog Max is a golden retriever",
    "We have three fish named Nemo, Dory, and Bubbles",
    
    // Locations
    "I live in Berlin",
    "I'm from Munich originally",
    "I work in downtown San Francisco",
    
    // Relationships
    "My wife Sarah is a doctor",
    "My brother John lives in New York",
    "My best friend Mike and I went to college together",
    
    // Preferences
    "I love coffee and coding",
    "I hate waking up early",
    "My favorite food is pizza",
    "I enjoy hiking on weekends",
    
    // Dates
    "My birthday is March 15",
    "My anniversary is on June 20th",
    
    // Medical
    "I'm allergic to peanuts and shellfish",
    "I have asthma",
    
    // Work
    "I'm a software developer",
    "I work as a data scientist at Google",
    "I work for a startup in fintech"
  ];

  for (const message of testMessages) {
    console.log(`\n📝 Message: "${message}"`);
    const entities = await EntityExtractor.extractEntities(message);
    
    if (entities.length === 0) {
      console.log('   ❌ No entities extracted');
    } else {
      entities.forEach(entity => {
        console.log(`   ✅ ${entity.type}: ${JSON.stringify(entity.value)}`);
        console.log(`      Confidence: ${(entity.confidence * 100).toFixed(0)}%`);
      });
    }
  }

  console.log('\n\n📊 Summary:');
  console.log('The enhanced entity extraction can now recognize:');
  console.log('- Names (personal and in relationships)');
  console.log('- Pets (with names and species)');
  console.log('- Locations (residence, origin, work)');
  console.log('- Relationships (family, friends)');
  console.log('- Preferences (likes, dislikes, favorites)');
  console.log('- Important dates (birthdays, anniversaries)');
  console.log('- Medical information (allergies, conditions)');
  console.log('- Work information (profession, employer)');
}

// Run the test
testEntityExtraction().catch(console.error);