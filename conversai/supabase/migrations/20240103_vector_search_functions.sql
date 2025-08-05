-- Vector similarity search functions for semantic memory

-- Function to search messages by vector similarity
CREATE OR REPLACE FUNCTION search_messages_by_embedding(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 20,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
  message_id UUID,
  conversation_id UUID,
  conversation_title TEXT,
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    c.title as conversation_title,
    m.role,
    m.content,
    m.created_at,
    1 - (me.embedding <=> p_query_embedding) as similarity_score
  FROM message_embeddings me
  INNER JOIN messages m ON me.message_id = m.id
  INNER JOIN conversations c ON m.conversation_id = c.id
  WHERE c.user_id = p_user_id
    AND 1 - (me.embedding <=> p_query_embedding) > p_similarity_threshold
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar conversations
CREATE OR REPLACE FUNCTION find_similar_conversations(
  p_user_id UUID,
  p_conversation_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  conversation_id UUID,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  avg_similarity FLOAT
) AS $$
DECLARE
  v_avg_embedding vector(1536);
BEGIN
  -- Calculate average embedding for the source conversation
  SELECT AVG(me.embedding)::vector(1536)
  INTO v_avg_embedding
  FROM message_embeddings me
  INNER JOIN messages m ON me.message_id = m.id
  WHERE m.conversation_id = p_conversation_id;

  -- Find similar conversations
  RETURN QUERY
  WITH conversation_embeddings AS (
    SELECT 
      c.id,
      c.title,
      c.summary,
      c.created_at,
      AVG(me.embedding)::vector(1536) as avg_embedding
    FROM conversations c
    INNER JOIN messages m ON m.conversation_id = c.id
    INNER JOIN message_embeddings me ON me.message_id = m.id
    WHERE c.user_id = p_user_id
      AND c.id != p_conversation_id
    GROUP BY c.id, c.title, c.summary, c.created_at
  )
  SELECT 
    ce.id,
    ce.title,
    ce.summary,
    ce.created_at,
    1 - (ce.avg_embedding <=> v_avg_embedding) as avg_similarity
  FROM conversation_embeddings ce
  ORDER BY avg_similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation topics based on embeddings
CREATE OR REPLACE FUNCTION extract_conversation_topics(
  p_conversation_id UUID,
  p_num_topics INT DEFAULT 5
)
RETURNS TABLE(
  topic TEXT,
  relevance_score FLOAT
) AS $$
BEGIN
  -- This is a placeholder that returns message keywords
  -- In production, you'd use more sophisticated topic modeling
  RETURN QUERY
  WITH word_counts AS (
    SELECT 
      unnest(string_to_array(lower(regexp_replace(content, '[^a-zA-Z0-9\s]', '', 'g')), ' ')) as word,
      COUNT(*) as count
    FROM messages
    WHERE conversation_id = p_conversation_id
      AND role = 'user'
    GROUP BY word
    HAVING LENGTH(word) > 4  -- Filter out short words
  )
  SELECT 
    word as topic,
    (count::FLOAT / (SELECT MAX(count) FROM word_counts))::FLOAT as relevance_score
  FROM word_counts
  WHERE word NOT IN ('the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'will', 'your', 'what', 'when', 'where', 'which', 'their', 'would', 'could', 'should', 'about', 'after', 'before')
  ORDER BY count DESC
  LIMIT p_num_topics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding ON public.message_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_messages_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION extract_conversation_topics TO authenticated;

-- Add conversation_topics table for better topic management
CREATE TABLE IF NOT EXISTS public.conversation_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  relevance_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(conversation_id, topic)
);

-- Enable RLS on conversation_topics
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_topics
CREATE POLICY "Users can view topics for their conversations" ON public.conversation_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_topics.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create topics for their conversations" ON public.conversation_topics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_topics.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Function to summarize conversation
CREATE OR REPLACE FUNCTION get_conversation_summary(
  p_conversation_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_summary TEXT;
  v_message_count INT;
BEGIN
  -- Get message count
  SELECT COUNT(*) INTO v_message_count
  FROM messages
  WHERE conversation_id = p_conversation_id;

  -- Create a basic summary (in production, use AI for better summaries)
  SELECT 
    'Conversation with ' || v_message_count || ' messages. Topics discussed: ' || 
    STRING_AGG(DISTINCT topic, ', ' ORDER BY topic) || '.'
  INTO v_summary
  FROM conversation_topics
  WHERE conversation_id = p_conversation_id
  AND relevance_score > 0.5;

  RETURN COALESCE(v_summary, 'Conversation with ' || v_message_count || ' messages.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_conversation_summary TO authenticated;