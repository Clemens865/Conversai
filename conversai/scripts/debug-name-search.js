#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugNameSearch() {
  console.log('🔍 Debugging Name Search Issue\n');

  try {
    // 1. Check all messages
    console.log('1️⃣ Checking all messages in the database...');
    const { data: allMessages, error: msgError } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (msgError) {
      console.error('Error fetching messages:', msgError);
    } else {
      console.log(`Total recent messages: ${allMessages?.length || 0}`);
      if (allMessages && allMessages.length > 0) {
        console.log('\nRecent messages:');
        allMessages.forEach((msg, idx) => {
          console.log(`[${idx + 1}] ${msg.role}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
        });
      }
    }

    // 2. Search specifically for messages with "Clemens"
    console.log('\n2️⃣ Searching for messages containing "Clemens"...');
    const { data: clemensMessages, error: clemensError } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .ilike('content', '%clemens%')
      .order('created_at', { ascending: false });
    
    if (clemensError) {
      console.error('Error searching for Clemens:', clemensError);
    } else {
      console.log(`Messages mentioning "Clemens": ${clemensMessages?.length || 0}`);
      if (clemensMessages && clemensMessages.length > 0) {
        console.log('\nMessages with "Clemens":');
        clemensMessages.forEach((msg, idx) => {
          console.log(`[${idx + 1}] ${msg.role}: "${msg.content}"`);
          console.log(`   ID: ${msg.id}, Created: ${new Date(msg.created_at).toLocaleString()}`);
        });
      }
    }

    // 3. Check embeddings for these messages
    console.log('\n3️⃣ Checking embeddings for messages...');
    const { data: embeddings, error: embError } = await supabase
      .from('message_embeddings')
      .select('message_id, id')
      .limit(10);
    
    if (embError) {
      console.error('Error fetching embeddings:', embError);
    } else {
      console.log(`Total embeddings: ${embeddings?.length || 0}`);
      
      if (clemensMessages && clemensMessages.length > 0 && embeddings && embeddings.length > 0) {
        const embeddingMessageIds = embeddings.map(e => e.message_id);
        const clemensWithEmbeddings = clemensMessages.filter(m => embeddingMessageIds.includes(m.id));
        console.log(`\nMessages with "Clemens" that have embeddings: ${clemensWithEmbeddings.length}`);
      }
    }

    // 4. Check user authentication
    console.log('\n4️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ No authenticated user - this might be why messages aren\'t being saved');
    } else {
      console.log(`✅ Authenticated as: ${user.email} (ID: ${user.id})`);
      
      // Check messages for this user
      const { data: userMessages, count } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);
      
      console.log(`Messages for this user: ${count || 0}`);
    }

    // 5. Test the search function directly
    console.log('\n5️⃣ Testing search function with a dummy embedding...');
    const { data: searchTest, error: searchError } = await supabase.rpc('search_messages_by_embedding', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_query_embedding: new Array(1536).fill(0),
      p_limit: 5,
      p_similarity_threshold: 0.5
    });
    
    if (searchError) {
      console.log('Search function error:', searchError.message);
    } else {
      console.log(`Search function returned ${searchTest?.length || 0} results`);
    }

    console.log('\n📋 Summary:');
    console.log('- Database connection: ✅');
    console.log(`- Messages exist: ${allMessages && allMessages.length > 0 ? '✅' : '❌'}`);
    console.log(`- Messages with "Clemens": ${clemensMessages && clemensMessages.length > 0 ? '✅' : '❌'}`);
    console.log(`- Embeddings exist: ${embeddings && embeddings.length > 0 ? '✅' : '❌'}`);
    console.log(`- User authenticated: ${user ? '✅' : '❌'}`);
    
    console.log('\n💡 Next steps:');
    if (!user) {
      console.log('1. Make sure you\'re logged in when using the app');
    }
    if (!allMessages || allMessages.length === 0) {
      console.log('2. Start a new conversation and introduce yourself with "My name is Clemens"');
    }
    if (allMessages && allMessages.length > 0 && (!embeddings || embeddings.length === 0)) {
      console.log('3. Embeddings might still be processing - wait a moment and try again');
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugNameSearch();