import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { userProfileManager } from '@/lib/services/memory/userProfileManager';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize profile manager and get user profile
    await userProfileManager.initialize();
    const profile = await userProfileManager.getOrCreateProfile(user.id);
    
    // Return simplified profile for frontend
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: profile.name,
      preferences: profile.preferences,
      factsCount: profile.personalFacts.length,
      lastUpdated: profile.lastUpdated
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Initialize profile manager
    await userProfileManager.initialize();
    const profile = await userProfileManager.getOrCreateProfile(user.id);
    
    // Update profile with new information
    if (body.name) {
      profile.name = body.name;
      profile.preferences.preferredName = body.name;
    }
    
    if (body.preferences) {
      Object.assign(profile.preferences, body.preferences);
    }
    
    profile.lastUpdated = new Date();
    
    // Save updated profile
    await userProfileManager.saveProfile(user.id, profile);
    
    return NextResponse.json({
      success: true,
      profile: {
        userId: user.id,
        email: user.email,
        name: profile.name,
        preferences: profile.preferences,
        factsCount: profile.personalFacts.length,
        lastUpdated: profile.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}