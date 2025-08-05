-- Create function to search category embeddings
CREATE OR REPLACE FUNCTION search_category_embeddings(
  query_embedding vector(1536),
  user_id uuid,
  similarity_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  category_id uuid,
  similarity float,
  content text,
  category_name text,
  fact_count int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.category_id,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.content,
    mc.name AS category_name,
    mc.fact_count
  FROM category_embeddings ce
  JOIN memory_categories mc ON mc.id = ce.category_id
  WHERE 
    mc.user_id = user_id
    AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;