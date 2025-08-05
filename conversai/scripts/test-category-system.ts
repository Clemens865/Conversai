#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { UserProfileService } from '../src/lib/services/memory/userProfileService';
import { CategoryBatchingService } from '../src/lib/services/memory/categoryBatchingService';
import { CategoryEvolutionService } from '../src/lib/services/memory/categoryEvolution';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test user ID (you'll need to replace with a real user ID)
const TEST_USER_ID = process.env.TEST_USER_ID || '';

async function testCategorySystem() {
  console.log('🧪 Testing Category System\n');

  if (!TEST_USER_ID) {
    // Get the first user from the database
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users?.users || users.users.length === 0) {
      console.error('❌ No users found in database');
      console.log('Please create a user account first');
      return;
    }
    const userId = users.users[0].id;
    console.log(`Using test user: ${userId}\n`);
    
    await runTests(userId);
  } else {
    await runTests(TEST_USER_ID);
  }
}

async function runTests(userId: string) {
  try {
    // 1. Initialize user categories
    console.log('1️⃣  Initializing user categories...');
    await UserProfileService.ensureUserCategoriesInitialized(userId);
    console.log('✅ Categories initialized\n');

    // 2. Test messages with various entity types
    const testMessages = [
      "My name is Clemens",
      "I have two cats named Holly and Benny",
      "Holly is very playful and energetic",
      "Benny is more calm and likes to cuddle",
      "I live in Berlin and work as a software developer",
      "I love coding at night with coffee",
      "My birthday is March 15",
      "I'm allergic to peanuts",
      "I enjoy hiking on weekends"
    ];

    console.log('2️⃣  Processing test messages...');
    for (const message of testMessages) {
      console.log(`\n📝 Processing: "${message}"`);
      await UserProfileService.processMessageForMemory(userId, message);
    }
    console.log('\n✅ Messages processed\n');

    // 3. Check category state
    console.log('3️⃣  Checking category state...');
    const { data: categories } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('user_id', userId)
      .order('fact_count', { ascending: false });

    if (categories) {
      console.log(`\n📊 User has ${categories.length} categories:`);
      for (const category of categories) {
        console.log(`\n📁 ${category.name} (${category.type})`);
        console.log(`   Facts: ${category.fact_count}`);
        console.log(`   Themes: ${category.themes.join(', ') || 'none'}`);
        
        if (category.facts && category.facts.length > 0) {
          console.log('   Sample facts:');
          category.facts.slice(0, 3).forEach((fact: any) => {
            console.log(`   - ${fact.type}: ${JSON.stringify(fact.value)}`);
          });
        }
      }
    }

    // 4. Test category retrieval
    console.log('\n\n4️⃣  Testing category retrieval...');
    const testQueries = [
      "Tell me about my pets",
      "What's my name?",
      "Where do I live?",
      "What do I like?"
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      const batches = await CategoryBatchingService.retrieveCategoryBatches(userId, query, 2);
      
      if (batches.length > 0) {
        console.log('   Retrieved categories:');
        batches.forEach(batch => {
          console.log(`   📦 ${batch.categoryName}: ${batch.summary}`);
          console.log(`      Facts: ${batch.facts.length}`);
        });
      } else {
        console.log('   ❌ No matching categories found');
      }
    }

    // 5. Test category evolution
    console.log('\n\n5️⃣  Testing category evolution...');
    
    // Add more facts to trigger potential splitting
    const moreMessages = [
      "I work at a tech startup",
      "I'm building an AI assistant called ConversAI",
      "I use TypeScript and React",
      "I prefer VS Code for development",
      "I've been coding for 10 years",
      "My favorite programming language is TypeScript",
      "I also know Python and Go",
      "I contribute to open source projects",
      "I attend tech meetups in Berlin"
    ];

    console.log('Adding more facts to test splitting...');
    for (const message of moreMessages) {
      await UserProfileService.processMessageForMemory(userId, message);
    }

    // Check if any categories are ready for splitting
    const { data: updatedCategories } = await supabase
      .from('memory_categories')
      .select('*')
      .eq('user_id', userId)
      .gt('fact_count', 10);

    if (updatedCategories && updatedCategories.length > 0) {
      console.log('\n📈 Categories that might split soon:');
      updatedCategories.forEach(cat => {
        console.log(`   - ${cat.name}: ${cat.fact_count} facts`);
      });
    }

    console.log('\n\n✅ Category system test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCategorySystem().catch(console.error);