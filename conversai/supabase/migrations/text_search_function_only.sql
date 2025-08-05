-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a function to search across all user conversations (text-based)
CREATE OR REPLACE FUNCTION search_user_conversations(
  p_user_id UUID,
  p_search_term TEXT
)
RETURNS TABLE(
  message_id UUID,
  conversation_id UUID,
  role TEXT,
  content TEXT,
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
    -- Use simple relevance scoring based on text match
    CASE 
      WHEN m.content ILIKE '%' || p_search_term || '%' THEN 1.0
      ELSE 0.0
    END as relevance_score
  FROM messages m
  INNER JOIN conversations c ON m.conversation_id = c.id
  WHERE c.user_id = p_user_id
    AND m.content ILIKE '%' || p_search_term || '%'
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_user_conversations TO authenticated;