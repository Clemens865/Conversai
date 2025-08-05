-- Fixed migration: Create user_profiles table for storing structured user information
-- This version handles the case where auth.users might not be accessible

-- First, create the table without the foreign key constraint
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  name TEXT,
  preferences JSONB DEFAULT '{}',
  facts JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Try to add the foreign key constraint, but don't fail if auth.users doesn't exist
DO $$ 
BEGIN
    -- Check if we can access auth.users
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
    ) THEN
        -- Add foreign key if auth.users exists
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to auth.users';
    ELSE
        RAISE NOTICE 'auth.users not accessible, skipping foreign key constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    RAISE NOTICE 'user_profiles table created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create user_profiles table';
  END IF;
END $$;