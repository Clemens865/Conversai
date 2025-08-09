-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table: stores metadata about ingested documents
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL CHECK (source_type IN ('md', 'pdf', 'html', 'docx', 'csv', 'ocr', 'transcript', 'web')),
    source_uri text NOT NULL,
    content_sha256 text NOT NULL,
    document_version int DEFAULT 1,
    tags text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Chunks table: stores document chunks with embeddings
CREATE TABLE IF NOT EXISTS chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    content text NOT NULL,
    content_tokens int,
    section text, -- heading hierarchy e.g., "H1 > H2 > H3"
    span jsonb, -- {start_char:int, end_char:int, page:int|null}
    metadata jsonb, -- additional metadata like heading_path, page, url_fragment, code_block
    embedding vector(1536), -- OpenAI ada-002 dimension (can be adjusted)
    created_at timestamptz DEFAULT now()
);

-- Facts table: for structured fact-based memory
CREATE TABLE IF NOT EXISTS facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject text NOT NULL,
    predicate text NOT NULL,
    object jsonb NOT NULL,
    certainty real DEFAULT 1.0 CHECK (certainty >= 0 AND certainty <= 1),
    source_uri text,
    tags text[],
    embedding vector(1536),
    created_at timestamptz DEFAULT now(),
    UNIQUE(subject, predicate, object)
);

-- Indexes for performance

-- Vector index for similarity search (using HNSW for better performance on smaller datasets)
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw 
ON chunks USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 200);

-- Full-text search index
CREATE INDEX IF NOT EXISTS chunks_content_fts 
ON chunks USING gin (to_tsvector('simple', content));

-- B-tree indexes for common queries
CREATE INDEX IF NOT EXISTS chunks_section_idx ON chunks (section);
CREATE INDEX IF NOT EXISTS chunks_document_idx ON chunks (document_id);
CREATE INDEX IF NOT EXISTS documents_sha256_idx ON documents (content_sha256);
CREATE INDEX IF NOT EXISTS documents_tags_idx ON documents USING gin (tags);

-- Facts table indexes
CREATE INDEX IF NOT EXISTS facts_embedding_hnsw 
ON facts USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 200);

CREATE INDEX IF NOT EXISTS facts_subject_idx ON facts (subject);
CREATE INDEX IF NOT EXISTS facts_tags_idx ON facts USING gin (tags);

-- Update trigger for documents updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Function for hybrid search (semantic + lexical)
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
    semantic_score float,
    lexical_score float,
    combined_score float
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
            1 - (c.embedding <=> query_embedding) AS score
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
            ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', query_text)) AS score
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
        COALESCE(s.score, 0) AS semantic_score,
        COALESCE(l.score, 0) AS lexical_score,
        COALESCE(s.score, 0) * 0.7 + COALESCE(l.score, 0) * 0.3 AS combined_score
    FROM semantic_search s
    FULL OUTER JOIN lexical_search l ON s.id = l.id
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;