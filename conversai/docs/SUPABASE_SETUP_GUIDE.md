# Supabase Setup Guide for ConversAI RAG System

## Quick Setup Instructions

### 1. Create Your Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Choose a strong database password and save it
3. Select your region (preferably close to your users)

### 2. Get Your Credentials

Once your project is created, go to **Settings > API** and copy:

- **Project URL**: `https://YOUR-PROJECT-ID.supabase.co`
- **Anon Key**: `eyJ...` (public key)
- **Service Role Key**: `eyJ...` (secret key - keep secure!)

Go to **Settings > Database** and copy:
- **Connection String**: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres`

### 3. Update Your .env.local File

Replace the placeholder values in `/conversai/.env.local`:

```env
# ConversAI Supabase Configuration (New Project)
NEXT_PUBLIC_CONVERSAI_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY=your-anon-key-here
CONVERSAI_SUPABASE_SERVICE_KEY=your-service-role-key-here
CONVERSAI_SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
CONVERSAI_SUPABASE_STORAGE_BUCKET=conversai-documents
```

### 4. Run Database Migrations

In your Supabase dashboard:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `/conversai/supabase/migrations/001_setup_rag_tables.sql`
4. Click **Run** to execute the migration

### 5. Create Storage Bucket

In Supabase dashboard:

1. Go to **Storage**
2. Click **New Bucket**
3. Name it: `conversai-documents`
4. Set it as **Private** (we'll use signed URLs)
5. Click **Create**

### 6. Update Vercel Environment Variables

Go to your Vercel project dashboard:

1. Navigate to **Settings > Environment Variables**
2. Add these variables for Production, Preview, and Development:

```
NEXT_PUBLIC_CONVERSAI_SUPABASE_URL
NEXT_PUBLIC_CONVERSAI_SUPABASE_ANON_KEY
CONVERSAI_SUPABASE_SERVICE_KEY
CONVERSAI_SUPABASE_DB_URL
CONVERSAI_SUPABASE_STORAGE_BUCKET

# Keep existing ElevenLabs for voice
NEXT_PUBLIC_ELEVENLABS_API_KEY
```

3. Redeploy your application for changes to take effect

### 7. Start the Rust RAG Service

#### Local Development:

```bash
cd conversai/rag-service

# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the service
cargo build

# Run the service
cargo run
```

The service will start on `http://localhost:3030`

#### Production Deployment:

For production, you can deploy the Rust service to:

1. **Railway.app** (Recommended for Rust):
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Deploy
   cd rag-service
   railway login
   railway init
   railway up
   ```

2. **Fly.io**:
   ```bash
   # Install Fly CLI
   curl -L https://fly.io/install.sh | sh
   
   # Deploy
   fly launch
   fly deploy
   ```

3. **Docker + Cloud Run**:
   ```bash
   # Build Docker image
   docker build -t conversai-rag .
   
   # Deploy to Cloud Run
   gcloud run deploy conversai-rag --image conversai-rag
   ```

### 8. Test the Integration

1. **Check RAG Service Health**:
   ```bash
   curl http://localhost:3030/health
   ```

2. **Ingest Your Biographical Data**:
   ```bash
   curl -X POST http://localhost:3030/ingest \
     -F "file=@/path/to/lebensgeschichte_clemens_hoenig.md" \
     -F "tags=biography,personal"
   ```

3. **Test a Query**:
   ```bash
   curl -X POST http://localhost:3030/query \
     -H "Content-Type: application/json" \
     -d '{"query": "Tell me about Clemens background"}'
   ```

### 9. Enable in ConversAI

Once everything is set up, the Markdown Library mode will automatically use the RAG service when available. The system will:

1. Check if RAG service is healthy
2. Ingest markdown files on first use
3. Use hybrid search for context retrieval
4. Fall back to local search if RAG is unavailable

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  ConversAI  │────▶│  Rust RAG    │────▶│  Supabase   │
│  Next.js    │     │  Service     │     │  PostgreSQL │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                     │
      │                    │                     ├── pgvector
      │                    │                     ├── Storage
      └── ElevenLabs ──────┴── OpenAI API ──────┘
         (Voice)              (Embeddings)
```

## Troubleshooting

### "Connection refused" to RAG service
- Ensure the Rust service is running: `cargo run`
- Check firewall settings
- Verify `RAG_SERVICE_URL` in .env

### "pgvector extension not found"
- Run in SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`
- Ensure you're using Postgres 13+

### Slow embedding generation
- Batch your requests (up to 100 texts)
- Consider caching frequently used embeddings
- Use a smaller model if quality permits

### High latency queries
- Check your indexes are created properly
- Tune HNSW parameters (m, ef_construction)
- Add more specific filters to narrow search

## Performance Tips

1. **Optimize Chunk Size**: Start with 500 tokens, adjust based on your content
2. **Use Filters**: Always filter by tags/dates when possible
3. **Cache Embeddings**: Store frequently queried embeddings
4. **Monitor Metrics**: Check diagnostics in query responses

## Next Steps

1. Ingest all your personal documents
2. Test queries in different modes
3. Fine-tune search parameters
4. Set up monitoring and alerts
5. Consider adding PDF/HTML support

## Support

For issues or questions:
- Check the [RAG Specification](./RUST_RAG_SPECIFICATION.md)
- Review [Rust service logs](../rag-service/README.md)
- Open an issue on GitHub