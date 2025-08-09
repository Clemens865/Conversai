# ConversAI RAG Ingestion and Retrieval Service (Rust + Supabase)

## Overview

**Goal**: Build a fast, accurate RAG pipeline using a Rust service that ingests heterogeneous files (starting with Markdown), chunks and embeds content, stores it in Supabase (Postgres + pgvector), and serves high-precision retrieval with hybrid search and reranking.

### Targets
- **High precision** via structured memory, hybrid semantic+lexical retrieval, and reranking
- **Low latency** via pgvector IVF/HNSW, metadata filtering, and caching
- **Extensible ingest** to support MD now and PDF/HTML/DOCX/CSV/OCR later

## Architecture

### Components

#### Rust API Service (Axum)
Endpoints:
- `POST /ingest`: handles file/URL ingestion, normalization, chunking, embeddings, and storage
- `POST /query`: handles semantic+lexical retrieval, reranking, and returns grounded context + citations
- `POST /feedback` (optional): collects relevance feedback for evaluation

#### Supabase
- Postgres with pgvector for embeddings
- Storage bucket for raw files (store URIs in DB)

#### Embedding Provider
- Cloud API initially (e.g., OpenAI/Cohere/Nomic), with model name/dimension stored for migration
- Optional local ONNX later

#### Caching
- In-memory (moka) and/or Redis for hot queries and embeddings

## Data Model (SQL)

### Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Table: documents
```sql
CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL, -- md, pdf, html, docx, csv, ocr, transcript, web
    source_uri text NOT NULL, -- supabase storage or external URL
    content_sha256 text NOT NULL,
    document_version int DEFAULT 1,
    tags text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### Table: chunks
```sql
CREATE TABLE chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    content text NOT NULL,
    content_tokens int,
    section text, -- e.g., "H1 > H2 > H3"
    span jsonb, -- {start_char:int, end_char:int, page:int|null}
    metadata jsonb, -- e.g., heading_path, page, url_fragment, code_block:bool
    embedding vector(1536), -- match the embedding model dimension
    created_at timestamptz DEFAULT now()
);
```

#### Indexes
```sql
-- Vector ANN (choose one):
-- IVF:
CREATE INDEX chunks_embedding_ivf ON chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- OR HNSW (better for smaller datasets):
CREATE INDEX chunks_embedding_hnsw ON chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 200);

-- Full-text search:
CREATE INDEX chunks_content_fts ON chunks 
USING gin (to_tsvector('simple', content));

-- B-tree indexes:
CREATE INDEX chunks_section_idx ON chunks (section);
CREATE INDEX chunks_document_idx ON chunks (document_id);
```

### Table: facts (optional, for "fact-based memory")
```sql
CREATE TABLE facts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject text NOT NULL,
    predicate text NOT NULL,
    object jsonb NOT NULL,
    certainty real DEFAULT 1.0,
    source_uri text,
    tags text[],
    embedding vector(1536),
    created_at timestamptz DEFAULT now(),
    UNIQUE(subject, predicate, object)
);
```

## Ingestion Pipeline

### Inputs
- Multipart upload (file) and/or URL
- Optional tags: `text[]`

### Steps
1. **Type detection** by MIME/extension
2. **Parse to normalized text** preserving structure:
   - **Markdown**: pulldown-cmark or comrak; keep heading hierarchy
   - **PDF**: pdfium-render or external helper; store page numbers
   - **HTML**: readability-like extraction; store canonical URL and element ids
   - **DOCX**: converter (unoconv/docx2txt/service) to text; keep headings
   - **CSV/Spreadsheets**: either free-text summaries or extract facts
   - **Images**: OCR first (Tesseract, PaddleOCR); store bounding boxes if needed
3. **Chunking**:
   - 400–800 tokens with 10–20% overlap
   - Bounded by headings/sections where available
   - Track section path and char spans; for PDFs, include page: int
4. **Embedding**:
   - Batch embedding (32–128 per call) to minimize latency
   - Store model name and dimension in service config and/or metadata
5. **Storage**:
   - Upload raw file to Supabase Storage; store public/private URL in documents.source_uri
   - Upsert by content_sha256; increment document_version if source changed
   - Insert document row; bulk insert chunks with embeddings and metadata
6. **Return**:
   ```json
   {
     "document_id": "uuid",
     "chunks_count": 42,
     "tokens_estimate": 8400,
     "warnings": []
   }
   ```

## Retrieval Pipeline

### Inputs
```json
{
  "query": "string",
  "filters": {
    "tags": ["string"],
    "document_ids": ["uuid"],
    "date_range": ["start", "end"]
  },
  "k": 10
}
```

### Steps
1. **Embed query** once
2. **Apply filters** in SQL WHERE to narrow candidate set (user/project/time)
3. **ANN semantic search**:
   ```sql
   SELECT id, content, section, metadata, source_uri, 
          (embedding <=> $query) AS score
   FROM chunks
   WHERE [filters]
   ORDER BY embedding <=> $query
   LIMIT 50;
   ```
4. **Hybrid lexical union**:
   ```sql
   SELECT ... FROM chunks 
   WHERE [filters] 
   ORDER BY ts_rank_cd(to_tsvector('simple', content), 
                       plainto_tsquery($q)) DESC 
   LIMIT 50;
   ```
   Union, de-dup by id
5. **Client-side reranking**:
   - Quick cosine/dot-product re-score with the same embedding
   - Optional cross-encoder reranker (e.g., bge-reranker or MiniLM via ONNX) to top 8–12
   - Enforce diversity: max 2 chunks per document to avoid redundancy
6. **Assemble context**:
   - Truncate by token budget
   - Include citations: document_id/source_uri + section + page/span
7. **Return**:
   ```json
   {
     "context": ["chunks"],
     "citations": ["..."],
     "diagnostics": {
       "ann_k": 50,
       "lexical_k": 50,
       "reranker": "bge-reranker",
       "times": {}
     }
   }
   ```

## LLM Answering Contract
- The LLM must answer only using provided context; if insufficient, request another search or say it lacks enough info
- Cite exact lines/spans where possible (quote back with source tags)
- For numeric/date facts, run a consistency check across top chunks; if conflicts, surface uncertainty

## Rust Implementation Notes

### Crates
- **axum** (HTTP), **tokio** (async)
- **sqlx** (db, compile-time SQL checks) or tokio-postgres + deadpool-postgres
- **reqwest** (HTTP to embeddings and Supabase APIs)
- **serde/serde_json** (serialization), **anyhow/thiserror** (errors)
- **moka** or **redis** (cache)
- **nalgebra/ndarray** (vector math) for quick rerank
- Optional: **ort/onnxruntime** or **candle** for cross-encoder reranker

### Config
- `EMBEDDING_MODEL_NAME`, `EMBEDDING_DIM`
- `SUPABASE_DB_URL`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY`
- IVF/HNSW index choice and params (lists, m, ef)

### Endpoints

#### POST /ingest
```rust
// multipart: file, tags[], source_uri?
// or json: {url, tags[]}
// returns: {document_id, chunks_count, tokens, warnings[]}
```

#### POST /query
```rust
// json: {query, filters?, k?}
// returns: {context: [...], citations: [...], diagnostics: {...}}
```

#### POST /feedback (optional)
```rust
// json: {query, selected_chunk_ids[], useful:boolean}
```

## Chunking Heuristics
- Use headings to define hard boundaries for Markdown/DOCX/HTML
- Keep code blocks as distinct chunk type; optionally tag metadata: `{code_block:true, language:"ts"}`
- For PDFs, keep per-page boundaries to support page-based citation

## Quality and Evaluation

### Golden Set
- 50–100 curated queries with expected documents/chunks
- Metrics: MRR@10, nDCG@10, Recall@50

### Ablations
- Semantic only vs hybrid vs hybrid+cross-encoder
- Different chunk sizes and overlaps
- Index choices: ivfflat vs hnsw with different params

### Logging
- Store difficult queries and add hard negatives for reranker training/fine-tuning later

## Performance Guidelines
- Use HNSW for fastest queries on moderate corpora; IVF with tuned lists for larger sets
- Narrow with filters (tags, user, project, recent timeframe) to reduce candidate set
- Batch embeddings; reuse cached embeddings for repeated queries
- Keep embedding dimension as small as possible if quality permits (e.g., 1024D)

## Extensibility Roadmap

### Format Adapters
- **md**: comrak/pulldown-cmark (now)
- **pdf**: pdfium + text extraction (next)
- **html**: readability extraction
- **docx**: external converter service
- **csv/xlsx**: fact extraction + free-text summaries
- **images**: OCR to text (Tesseract/PaddleOCR)

### Local-first Option
- Build with feature flag to swap Postgres+pgvector for sqlite + sqlite-vss or tantivy

### Memory Store
- Write user-approved facts into facts table with certainty and time-decay; retrieve via same pipeline

## Example Rust Sketches

### Query Outline (sqlx + cosine distance)
```rust
#[derive(sqlx::FromRow)]
struct ChunkRow {
    id: uuid::Uuid,
    content: String,
    section: Option<String>,
    metadata: serde_json::Value,
    source_uri: Option<String>,
    score: f32,
}

async fn ann_search(
    pool: &sqlx::PgPool,
    query_vec: Vec<f32>,
    k: i64,
    tags: Option<Vec<String>>,
) -> anyhow::Result<Vec<ChunkRow>> {
    let rows = sqlx::query_as::<_, ChunkRow>(
        r#"
        SELECT id, content, section, metadata, 
               NULLIF((metadata->>'source_uri'),'') as source_uri,
               (embedding <=> $1) AS score
        FROM chunks
        WHERE ($2::text[] IS NULL OR tags && $2)
        ORDER BY embedding <=> $1
        LIMIT $3
        "#,
    )
    .bind(query_vec)
    .bind(tags)
    .bind(k)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
```

### Ingest Outline (Markdown)
```rust
async fn ingest_markdown(
    file_bytes: bytes::Bytes, 
    filename: &str, 
    tags: Vec<String>
) -> Result<Uuid> {
    let sha = sha256(&file_bytes);
    // upload to Supabase Storage -> get URL
    let (doc_id, version) = upsert_document(sha, filename, "md", url, tags).await?;
    let sections = parse_md_to_sections(&file_bytes)?;
    let chunks = chunk_sections(sections, 500, 0.15)?;
    let embeddings = embed_batch(chunks.iter().map(|c| &c.text).collect()).await?;
    bulk_insert_chunks(doc_id, chunks, embeddings).await?;
    Ok(doc_id)
}
```

## Operational Notes
- Don't store binary files in Postgres; store in Storage and reference URL
- Use prepared statements and connection pooling
- Implement idempotent ingest: upsert by content hash; if updated, mark old chunks superseded
- Security: service role key only server-side; signed URLs for private Storage
- Observability: structured logs with timings (parse, embed, ann, rerank), and counters

## How this integrates with ConversAI
- **Memory Mode**: back the fact-based memory with the facts table and the same retrieval service
- **Markdown Library Mode**: replace ad hoc localStorage search with the RAG query endpoint over the same Markdown content
- **Local-First Mode**: compile the Rust service with a local DB backend for fully offline retrieval

## Deliverables
1. SQL migrations for documents, chunks, facts + indexes
2. Axum project scaffold with /ingest and /query
3. Markdown parser + chunker preserving heading paths and spans
4. Basic evaluation harness (golden queries, metrics, and ablations)