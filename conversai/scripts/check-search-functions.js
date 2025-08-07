require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSearchFunctions() {
  console.log('🔍 Checking database functions...\n');
  
  // Check for search functions
  const { data: functions, error } = await supabase
    .from('pg_proc')
    .select('proname')
    .like('proname', '%search%');
    
  if (error) {
    console.log('Could not query pg_proc, trying information_schema...');
    
    // Alternative approach
    const { data: routines } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .like('routine_name', '%search%');
      
    console.log('Search functions found:', routines);
  } else {
    console.log('Functions containing "search":', functions);
  }
  
  // Test the category search directly
  console.log('\n🧪 Testing category search...\n');
  
  const userId = '028d70a5-6264-42d1-a28d-8163d6e99231';
  
  // Try the RPC call
  try {
    const { data, error } = await supabase.rpc('search_category_embeddings', {
      query_embedding: new Array(1536).fill(0.1), // Dummy embedding
      user_id: userId,
      similarity_threshold: 0.1,
      match_count: 5
    });
    
    if (error) {
      console.log('❌ RPC Error:', error.message);
      console.log('Details:', error);
    } else {
      console.log('✅ RPC Success! Results:', data);
    }
  } catch (e) {
    console.log('❌ Exception:', e.message);
  }
  
  // Check category_embeddings table
  console.log('\n🔍 Checking category_embeddings table...');
  const { data: embeddings, error: embError } = await supabase
    .from('category_embeddings')
    .select('category_id, created_at')
    .limit(5);
    
  if (embError) {
    console.log('❌ category_embeddings table error:', embError.message);
  } else {
    console.log('✅ category_embeddings entries:', embeddings?.length || 0);
  }
  
  // Direct search without embeddings
  console.log('\n🔍 Direct category search for pets...');
  const { data: petCategories } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId)
    .or('name.ilike.%pet%,name.ilike.%animal%');
    
  if (petCategories && petCategories.length > 0) {
    console.log('✅ Found pet categories:');
    petCategories.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.fact_count} facts`);
    });
  }
}

checkSearchFunctions().catch(console.error);