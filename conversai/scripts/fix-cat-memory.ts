import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAIService } from '../src/lib/services/ai/openai';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openaiService = new OpenAIService(openaiKey);

async function fixCatMemory() {
  const userId = '028d70a5-6264-42d1-a28d-8163d6e99231';
  
  console.log('Fixing cat memory for user:', userId);
  
  // First, ensure the user has a general category
  const { data: existingCategories } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'general');
    
  if (!existingCategories || existingCategories.length === 0) {
    // Create general category
    await supabase.from('memory_categories').insert({
      user_id: userId,
      name: 'General Knowledge',
      type: 'general',
      fact_count: 0,
      facts: [],
      themes: []
    });
  }
  
  // Create the correct pet facts
  const catFacts = [
    {
      type: 'pet',
      value: { name: 'Holly', species: 'cat' },
      confidence: 1.0,
      rawText: 'I have two cats. One is named Holly'
    },
    {
      type: 'pet', 
      value: { name: 'Benny', species: 'cat' },
      confidence: 1.0,
      rawText: 'and the other one is named Benny'
    }
  ];
  
  // Get or create pets category
  let { data: petCategory } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'Pets and Animals')
    .single();
    
  if (!petCategory) {
    const { data: newCategory, error } = await supabase
      .from('memory_categories')
      .insert({
        user_id: userId,
        name: 'Pets and Animals',
        type: 'sub',
        fact_count: 0,
        facts: [],
        themes: ['pets', 'animals', 'companions']
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating pet category:', error);
    }
    petCategory = newCategory;
  }
  
  if (petCategory) {
    // Update category with facts
    const updatedFacts = [...(petCategory.facts || []), ...catFacts];
    
    await supabase
      .from('memory_categories')
      .update({
        facts: updatedFacts,
        fact_count: updatedFacts.length
      })
      .eq('id', petCategory.id);
      
    // Generate embedding for the category
    const categoryText = `
      Category: ${petCategory.name}
      Type: ${petCategory.type}
      Contains ${updatedFacts.length} facts:
      ${updatedFacts.map((f: any) => `- ${f.type}: ${JSON.stringify(f.value)}`).join('\n')}
    `;
    
    const embedding = await openaiService.generateEmbedding(categoryText);
    
    // Check if embedding already exists
    const { data: existingEmbed } = await supabase
      .from('category_embeddings')
      .select('id')
      .eq('category_id', petCategory.id)
      .single();
      
    if (!existingEmbed) {
      // Store the embedding
      const { error: embedError } = await supabase
        .from('category_embeddings')
        .insert({
          id: crypto.randomUUID(),
          category_id: petCategory.id,
          embedding: embedding,
          content: categoryText,
          content_type: 'category_summary'
        });
        
      if (embedError) {
        console.error('Error storing embedding:', embedError);
      } else {
        console.log('Successfully stored category embedding');
      }
    } else {
      console.log('Category embedding already exists, updating...');
      const { error: updateError } = await supabase
        .from('category_embeddings')
        .update({
          embedding: embedding,
          content: categoryText
        })
        .eq('id', existingEmbed.id);
        
      if (updateError) {
        console.error('Error updating embedding:', updateError);
      }
    }
  }
  
  console.log('Successfully stored cat facts in memory!');
  
  // Verify the facts were stored
  const { data: categories } = await supabase
    .from('memory_categories')
    .select('*')
    .eq('user_id', userId);
    
  console.log('Current categories:', JSON.stringify(categories, null, 2));
}

fixCatMemory().catch(console.error);