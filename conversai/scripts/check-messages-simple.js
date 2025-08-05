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

async function checkMessages() {
  console.log('🔍 Checking all messages in the database\n');

  try {
    // Get all recent messages
    const { data: messages, error: msgError, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return;
    }

    console.log(`Total messages in database: ${count || 0}`);
    console.log(`Recent messages retrieved: ${messages?.length || 0}\n`);
    
    if (messages && messages.length > 0) {
      // Group by user_id
      const userMessages = {};
      messages.forEach(msg => {
        if (!userMessages[msg.user_id]) {
          userMessages[msg.user_id] = [];
        }
        userMessages[msg.user_id].push(msg);
      });

      console.log(`Messages from ${Object.keys(userMessages).length} different users\n`);

      // Show messages for each user
      Object.entries(userMessages).forEach(([userId, userMsgs]) => {
        console.log(`\nUser ID: ${userId}`);
        console.log(`Messages: ${userMsgs.length}`);
        
        // Show first few messages
        userMsgs.slice(0, 5).forEach((msg, idx) => {
          console.log(`  [${idx + 1}] ${msg.role}: "${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}"`);
        });

        // Check for name mentions
        const nameMessages = userMsgs.filter(m => 
          m.content.toLowerCase().includes('name') || 
          m.content.toLowerCase().includes('clemens')
        );
        
        if (nameMessages.length > 0) {
          console.log(`\n  📝 Name-related messages for this user:`);
          nameMessages.forEach(msg => {
            console.log(`     ${msg.role}: "${msg.content}"`);
          });
        }
      });

      // Check embeddings
      console.log('\n\n🧮 Checking embeddings...');
      const messageIds = messages.map(m => m.id);
      const { data: embeddings, error: embError } = await supabase
        .from('message_embeddings')
        .select('message_id, id')
        .in('message_id', messageIds);
      
      if (!embError) {
        console.log(`Embeddings found: ${embeddings?.length || 0} out of ${messages.length} messages`);
        
        // Check for duplicates
        const embeddingCounts = {};
        embeddings?.forEach(emb => {
          embeddingCounts[emb.message_id] = (embeddingCounts[emb.message_id] || 0) + 1;
        });
        
        const duplicates = Object.entries(embeddingCounts).filter(([_, count]) => count > 1);
        if (duplicates.length > 0) {
          console.log('\n⚠️  Found duplicate embeddings:');
          duplicates.forEach(([msgId, count]) => {
            console.log(`  Message ${msgId}: ${count} embeddings`);
          });
        }
      } else {
        console.error('Error checking embeddings:', embError);
      }

      // Show recent conversations
      console.log('\n\n📂 Recent conversations:');
      const conversations = [...new Set(messages.map(m => m.conversation_id))];
      for (const convId of conversations.slice(0, 3)) {
        const convMessages = messages.filter(m => m.conversation_id === convId);
        console.log(`\nConversation: ${convId}`);
        console.log(`Messages: ${convMessages.length}`);
        console.log('Sample:');
        convMessages.slice(0, 3).forEach(msg => {
          console.log(`  ${msg.role}: "${msg.content.substring(0, 50)}..."`);
        });
      }
    } else {
      console.log('❌ No messages found in the database');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkMessages();