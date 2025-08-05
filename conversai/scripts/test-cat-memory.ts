import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { CategoryBatchingService } from '../src/lib/services/memory/categoryBatchingService';
import { UserProfileService } from '../src/lib/services/memory/userProfileService';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCatMemory() {
  const userId = '028d70a5-6264-42d1-a28d-8163d6e99231';
  
  console.log('Testing cat memory retrieval for user:', userId);
  console.log('=====================================\n');
  
  // Test 1: Check if categories exist
  console.log('1. Checking memory categories:');
  const { data: categories } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId);
    
  if (categories) {
    categories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.type}): ${cat.fact_count} facts`);
      if (cat.facts && cat.facts.length > 0) {
        cat.facts.forEach((fact: any) => {
          console.log(`  * ${fact.type}: ${JSON.stringify(fact.value)}`);
        });
      }
    });
  }
  
  console.log('\n2. Testing pet-related queries:');
  const petQueries = [
    "What are my cats' names?",
    "Do you know my pets?",
    "Tell me about my cats",
    "pet names"
  ];
  
  for (const query of petQueries) {
    console.log(`\nQuery: "${query}"`);
    
    // Test category batching retrieval
    const batches = await CategoryBatchingService.retrieveCategoryBatches(userId, query, 2);
    
    if (batches.length > 0) {
      batches.forEach(batch => {
        console.log(`  Found in category: ${batch.categoryName}`);
        console.log(`  Summary: ${batch.summary}`);
        if (batch.facts.length > 0) {
          console.log('  Facts:');
          batch.facts.forEach((fact: any) => {
            console.log(`    - ${fact.type}: ${JSON.stringify(fact.value)}`);
          });
        }
      });
    } else {
      console.log('  No relevant categories found');
    }
  }
  
  console.log('\n3. Testing direct fact retrieval:');
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (userProfile) {
    console.log(`User name: ${userProfile.name}`);
    console.log(`Facts stored: ${userProfile.facts ? userProfile.facts.length : 0}`);
    if (userProfile.facts && userProfile.facts.length > 0) {
      userProfile.facts.forEach((fact: any) => {
        console.log(`  - ${fact.type}: ${JSON.stringify(fact.value)}`);
      });
    }
  }
  
  console.log('\n4. Testing semantic search:');
  const { data: searchResults } = await supabase.rpc('search_memory_categories', {
    p_user_id: userId,
    p_query_embedding: new Array(1536).fill(0), // Dummy embedding for test
    p_match_threshold: 0.4,
    p_match_count: 5
  });
  
  if (searchResults) {
    console.log(`Found ${searchResults.length} matching categories`);
  }
}

testCatMemory().catch(console.error);