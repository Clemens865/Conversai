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

async function checkUserMessages() {
  console.log('🔍 Checking messages for clemens@focuspulleratwork.com\n');

  try {
    // First, get the user ID for this email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'clemens@focuspulleratwork.com')
      .single();
    
    if (profileError || !profiles) {
      console.error('Could not find user profile:', profileError);
      return;
    }

    const userId = profiles.id;
    console.log(`Found user ID: ${userId}\n`);

    // Check all messages for this user
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, content, role, created_at, conversation_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return;
    }

    console.log(`Total messages for user: ${messages?.length || 0}\n`);
    
    if (messages && messages.length > 0) {
      console.log('Recent messages:');
      messages.forEach((msg, idx) => {
        console.log(`\n[${idx + 1}] ${msg.role}: "${msg.content}"`);
        console.log(`    ID: ${msg.id}`);
        console.log(`    Conversation: ${msg.conversation_id}`);
        console.log(`    Created: ${new Date(msg.created_at).toLocaleString()}`);
      });

      // Check for messages with "name" content
      const nameMessages = messages.filter(m => 
        m.content.toLowerCase().includes('name') || 
        m.content.toLowerCase().includes('clemens')
      );
      
      console.log(`\n\n📝 Messages mentioning name: ${nameMessages.length}`);
      if (nameMessages.length > 0) {
        console.log('\nName-related messages:');
        nameMessages.forEach(msg => {
          console.log(`- ${msg.role}: "${msg.content}"`);
        });
      }

      // Check embeddings for these messages
      const messageIds = messages.map(m => m.id);
      const { data: embeddings, error: embError } = await supabase
        .from('message_embeddings')
        .select('message_id')
        .in('message_id', messageIds);
      
      console.log(`\n\n🧮 Embeddings: ${embeddings?.length || 0} out of ${messages.length} messages have embeddings`);
      
      if (embeddings && embeddings.length < messages.length) {
        const messagesWithoutEmbeddings = messages.filter(m => 
          !embeddings.some(e => e.message_id === m.id)
        );
        console.log('\nMessages WITHOUT embeddings:');
        messagesWithoutEmbeddings.forEach(msg => {
          console.log(`- ${msg.role}: "${msg.content.substring(0, 50)}..."`);
        });
      }
    } else {
      console.log('❌ No messages found for this user');
      console.log('\nNext steps:');
      console.log('1. Start a new conversation in the app');
      console.log('2. Say "My name is Clemens"');
      console.log('3. Wait for the AI response');
      console.log('4. Then ask "Do you know my name?" in the same or different conversation');
    }

    // Check for duplicate embedding issues
    console.log('\n\n🔍 Checking for duplicate embeddings...');
    const { data: dupCheck, error: dupError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT message_id, COUNT(*) as count 
        FROM message_embeddings 
        WHERE message_id IN (SELECT id FROM messages WHERE user_id = '${userId}')
        GROUP BY message_id 
        HAVING COUNT(*) > 1
      `
    }).single();
    
    if (!dupError && dupCheck) {
      console.log('Found duplicate embeddings:', dupCheck);
    } else {
      console.log('No duplicate embeddings found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserMessages();