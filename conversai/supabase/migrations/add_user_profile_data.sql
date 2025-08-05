-- Add profile_data column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}';

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_data ON public.user_profiles USING gin (profile_data);

-- Update RLS policies to allow users to read/write their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Create a function to search across all user conversations
CREATE OR REPLACE FUNCTION search_user_conversations(
  p_user_id UUID,
  p_search_term TEXT
)
RETURNS TABLE(
  message_id UUID,
  conversation_id UUID,
  role TEXT,
  content TEXT,1
  created_at TIMESTAMP WITH TIME ZONE,
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    m.role,
    m.content,
    m.created_at,
    similarity(m.content, p_search_term) as relevance_score
  FROM messages m
  INNER JOIN conversations c ON m.conversation_id = c.id
  WHERE c.user_id = p_user_id
    AND m.content ILIKE '%' || p_search_term || '%'
  ORDER BY relevance_score DESC, m.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_user_conversations TO authenticated;