-- Fix hybrid_search function to use double precision instead of float
-- This resolves the type mismatch error "Returned type real does not match expected type double precision"

DROP FUNCTION IF EXISTS hybrid_search(vector(1536), text, int, text[]);

CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(1536),
    query_text text,
    match_count int DEFAULT 10,
    filter_tags text[] DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    content text,
    section text,
    metadata jsonb,
    semantic_score double precision,  -- Changed from float to double precision
    lexical_score double precision,   -- Changed from float to double precision
    combined_score double precision   -- Changed from float to double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            c.id,
            c.document_id,
            c.content,
            c.section,
            c.metadata,
            (1 - (c.embedding <=> query_embedding))::double precision AS score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE (filter_tags IS NULL OR d.tags && filter_tags)
        ORDER BY c.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    lexical_search AS (
        SELECT 
            c.id,
            c.document_id,
            c.content,
            c.section,
            c.metadata,
            ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', query_text))::double precision AS score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE 
            to_tsvector('simple', c.content) @@ plainto_tsquery('simple', query_text)
            AND (filter_tags IS NULL OR d.tags && filter_tags)
        ORDER BY score DESC
        LIMIT match_count * 2
    )
    SELECT 
        COALESCE(s.id, l.id) AS chunk_id,
        COALESCE(s.document_id, l.document_id) AS document_id,
        COALESCE(s.content, l.content) AS content,
        COALESCE(s.section, l.section) AS section,
        COALESCE(s.metadata, l.metadata) AS metadata,
        COALESCE(s.score, 0::double precision) AS semantic_score,
        COALESCE(l.score, 0::double precision) AS lexical_score,
        (COALESCE(s.score, 0::double precision) * 0.7 + COALESCE(l.score, 0::double precision) * 0.3) AS combined_score
    FROM semantic_search s
    FULL OUTER JOIN lexical_search l ON s.id = l.id
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;