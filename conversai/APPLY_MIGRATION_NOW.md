# Apply User Profiles Migration NOW

The Supabase MCP doesn't have permission to apply migrations. You need to do it manually:

## Steps:

1. **Open Supabase Dashboard**
   https://supabase.com/dashboard/project/xlvltsseqcnjlaxrtiaj/sql/new

2. **Copy this SQL** (from `/supabase/migrations/create_user_profiles_table.sql`):

```sql
-- Create user_profiles table for storing structured user information
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  preferences JSONB DEFAULT '{}',
  facts JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

3. **Click "Run" or press Cmd+Enter**

4. **You should see**: "Success. No rows returned"

## After Applying:

1. **Refresh your browser** at http://localhost:3000
2. **Say**: "My name is Clemens"
3. **Ask**: "What's my name?"

The AI should now remember your name!

## What This Enables:

✅ Structured storage for names and facts
✅ 100% accurate retrieval
✅ Foundation for the advanced batching system
✅ Ready for categorical memory architecture