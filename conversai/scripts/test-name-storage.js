#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNameStorage() {
  console.log('🧪 Testing Name Storage with Existing Table Structure\n');

  try {
    // Get a test user ID (or use a real one from your auth.users)
    const testUserId = '028d70a5-6264-42d1-a28d-8163d6e99231'; // From the existing data
    
    console.log('1️⃣ Current profile data:');
    const { data: currentProfile, error: getError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (getError) {
      console.log('No existing profile:', getError.message);
    } else {
      console.log('Current profile:', JSON.stringify(currentProfile, null, 2));
    }

    console.log('\n2️⃣ Testing name update...');
    
    // Update the profile with a name
    const profileData = currentProfile?.profile_data || {
      userId: testUserId,
      preferences: {},
      personalFacts: [],
      conversationPatterns: {}
    };
    
    profileData.name = 'Clemens';
    profileData.lastUpdated = new Date().toISOString();
    
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: testUserId,
        name: 'Clemens',
        profile_data: profileData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select();
    
    if (updateError) {
      console.log('❌ Update error:', updateError);
    } else {
      console.log('✅ Profile updated successfully');
      console.log('Updated data:', updateData);
    }

    console.log('\n3️⃣ Verifying name storage...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('id, name, profile_data')
      .eq('id', testUserId)
      .single();
    
    if (verifyError) {
      console.log('❌ Verification error:', verifyError);
    } else {
      console.log('✅ Stored profile:');
      console.log('   ID:', verifyData.id);
      console.log('   Name (column):', verifyData.name);
      console.log('   Name (in profile_data):', verifyData.profile_data?.name);
    }

    console.log('\n📋 Summary:');
    console.log('- The user_profiles table uses "id" not "user_id"');
    console.log('- It has a "name" column and "profile_data" JSONB column');
    console.log('- Names can be stored in both places');
    console.log('- The UserProfileService has been updated to handle this');
    
    console.log('\n✅ Now test in the app:');
    console.log('1. Refresh your browser');
    console.log('2. Say "My name is Clemens"');
    console.log('3. Ask "What\'s my name?"');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testNameStorage();