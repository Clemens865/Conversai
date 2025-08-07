require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCategories() {
  const userId = '028d70a5-6264-42d1-a28d-8163d6e99231';
  
  console.log('🔍 Checking memory categories for user:', userId);
  console.log('=====================================\n');
  
  // Check memory_categories table
  const { data: categories, error: catError } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId);
    
  if (catError) {
    console.log('❌ Error fetching categories:', catError);
    // Check if table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%categor%');
    console.log('Tables with "categor":', tables);
  } else if (categories && categories.length > 0) {
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`\n📁 Category: ${cat.name} (${cat.type})`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Facts: ${cat.fact_count}`);
      if (cat.facts && Array.isArray(cat.facts)) {
        console.log('   Stored facts:');
        cat.facts.forEach(fact => {
          console.log(`     - ${fact.type}: ${JSON.stringify(fact.value)}`);
        });
      }
    });
  } else {
    console.log('❌ No categories found');
  }
  
  // Check user_facts table
  console.log('\n\n🔍 Checking user_facts table...');
  const { data: facts, error: factsError } = await supabase
    .from('user_facts')
    .select('*')
    .eq('user_id', userId);
    
  if (factsError) {
    console.log('❌ Error fetching user_facts:', factsError.message);
  } else if (facts && facts.length > 0) {
    console.log(`✅ Found ${facts.length} facts:`);
    facts.forEach(fact => {
      console.log(`   - ${fact.category}/${fact.fact_key}: ${JSON.stringify(fact.fact_value)}`);
    });
  } else {
    console.log('❌ No facts in user_facts table');
  }
  
  // Check messages for the pet information
  console.log('\n\n🔍 Checking messages for pet information...');
  const { data: messages } = await supabase
    .from('messages')
    .select('content, created_at')
    .or('content.ilike.%holly%,content.ilike.%benny%,content.ilike.%cat%')
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (messages && messages.length > 0) {
    console.log(`✅ Found ${messages.length} messages mentioning pets:`);
    messages.forEach(msg => {
      console.log(`   - ${new Date(msg.created_at).toLocaleString()}: "${msg.content}"`);
    });
  }
}

checkCategories().catch(console.error);