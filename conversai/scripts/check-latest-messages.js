require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLatestMessages() {
  console.log('🔍 Checking latest messages in database...\n');
  
  // Get the last 10 messages
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }
  
  console.log(`Found ${messages.length} recent messages:\n`);
  
  // Group by conversation and show in chronological order
  const conversations = {};
  messages.forEach(msg => {
    if (!conversations[msg.conversation_id]) {
      conversations[msg.conversation_id] = [];
    }
    conversations[msg.conversation_id].push(msg);
  });
  
  Object.entries(conversations).forEach(([convId, msgs]) => {
    console.log(`\n📱 Conversation: ${convId}`);
    console.log('─'.repeat(50));
    
    // Sort chronologically
    msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    msgs.forEach(msg => {
      const time = new Date(msg.created_at).toLocaleTimeString();
      const role = msg.role === 'user' ? '👤 User' : '🤖 AI';
      console.log(`${time} ${role}: ${msg.content}`);
    });
  });
  
  // Check for specific patterns
  console.log('\n\n📊 Analysis:');
  const nameQuestions = messages.filter(m => 
    m.role === 'user' && m.content.toLowerCase().includes('name')
  );
  const catQuestions = messages.filter(m => 
    m.role === 'user' && (
      m.content.toLowerCase().includes('cat') || 
      m.content.toLowerCase().includes('pet')
    )
  );
  
  console.log(`- Name-related questions: ${nameQuestions.length}`);
  console.log(`- Cat/pet-related questions: ${catQuestions.length}`);
  
  // Show AI responses to these questions
  console.log('\n🤖 AI Responses to key questions:');
  
  for (const q of [...nameQuestions, ...catQuestions]) {
    // Find the next AI response in the same conversation
    const aiResponse = messages.find(m => 
      m.conversation_id === q.conversation_id &&
      m.role === 'assistant' &&
      new Date(m.created_at) > new Date(q.created_at)
    );
    
    if (aiResponse) {
      console.log(`\nQ: "${q.content}"`);
      console.log(`A: "${aiResponse.content}"`);
    }
  }
}

checkLatestMessages().catch(console.error);