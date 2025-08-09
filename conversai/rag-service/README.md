# ConversAI RAG Service (Rust)

A high-performance Retrieval-Augmented Generation (RAG) service built with Rust, using Supabase (Postgres + pgvector) for vector storage and hybrid search.

## Features

- 🚀 **High Performance**: Built with Rust for maximum speed and efficiency
- 🔍 **Hybrid Search**: Combines semantic (vector) and lexical (full-text) search
- 📊 **Smart Chunking**: Preserves document structure with heading hierarchies
- 🎯 **Reranking**: Improves result relevance with cosine similarity reranking
- 📝 **Multiple Formats**: Supports Markdown now, PDF/HTML/DOCX coming soon
- 💾 **Supabase Integration**: Uses pgvector for efficient vector similarity search
- ⚡ **Caching**: In-memory caching for frequently accessed data

## Prerequisites

- Rust 1.70+
- PostgreSQL with pgvector extension
- Supabase account (or local Postgres with pgvector)
- OpenAI API key for embeddings

## Setup

1. **Install dependencies**:
   ```bash
   cd rag-service
   cargo build
   ```

2. **Set environment variables**:
   ```bash
   # Copy from .env.local
   export CONVERSAI_SUPABASE_DB_URL="postgresql://..."
   export OPENAI_API_KEY="sk-..."
   export EMBEDDING_MODEL_NAME="text-embedding-ada-002"
   ```

3. **Run database migrations**:
   ```bash
   # Use Supabase CLI or run directly in SQL editor
   psql $CONVERSAI_SUPABASE_DB_URL < ../supabase/migrations/001_setup_rag_tables.sql
   ```

4. **Start the service**:
   ```bash
   cargo run
   # Service will run on http://localhost:3030
   ```

## API Endpoints

### POST /ingest
Ingest documents for indexing.

**Request** (multipart/form-data):
- `file`: The document file
- `tags`: Comma-separated tags

**Response**:
```json
{
  "document_id": "uuid",
  "chunks_count": 42,
  "tokens_estimate": 8400,
  "warnings": []
}
```

### POST /query
Query the knowledge base.

**Request**:
```json
{
  "query": "What is Clemens' background?",
  "filters": {
    "tags": ["biography"],
    "document_ids": ["uuid"]
  },
  "k": 10
}
```

**Response**:
```json
{
  "context": [{
    "chunk": { ... },
    "score": 0.95,
    "source_uri": "storage://document.md"
  }],
  "citations": [{
    "document_id": "uuid",
    "source_uri": "storage://document.md",
    "section": "Background > Education",
    "page": null,
    "span": [100, 500]
  }],
  "diagnostics": {
    "ann_k": 20,
    "lexical_k": 20,
    "reranker": "cosine",
    "query_time_ms": 45,
    "embedding_time_ms": 30,
    "rerank_time_ms": 5
  }
}
```

### POST /feedback
Submit relevance feedback for improvement.

**Request**:
```json
{
  "query": "original query",
  "selected_chunk_ids": ["uuid1", "uuid2"],
  "useful": true
}
```

## Development

### Run tests:
```bash
cargo test
```

### Build for production:
```bash
cargo build --release
```

### Docker deployment:
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/conversai-rag /usr/local/bin/
CMD ["conversai-rag"]
```

## Performance Tuning

### Database Indexes
- **HNSW**: Best for datasets < 1M vectors
- **IVF**: Better for larger datasets
- Adjust `m` and `ef_construction` parameters for HNSW
- Tune `lists` parameter for IVF

### Chunking Strategy
- Default: 500 tokens with 50 token overlap
- Adjust based on your content type
- Preserve heading boundaries for better context

### Embedding Optimization
- Batch embeddings (up to 100 texts per call)
- Cache frequently queried embeddings
- Consider smaller models (1024D vs 1536D) if quality permits

## Integration with ConversAI

The RAG service integrates with ConversAI's modes:

1. **Markdown Library Mode**: Uses /query endpoint for retrieving personal context
2. **Memory Mode**: Stores facts in the facts table
3. **Local-First Mode**: Can be compiled with sqlite backend

## Monitoring

The service logs include:
- Query latencies
- Embedding generation times
- Reranking performance
- Cache hit rates

Use these metrics to optimize performance.

## Roadmap

- [ ] PDF support with pdfium
- [ ] HTML extraction with readability
- [ ] DOCX conversion
- [ ] Cross-encoder reranking with ONNX
- [ ] Local embedding models
- [ ] SQLite backend option
- [ ] Evaluation harness with golden queries