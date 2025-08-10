# ConversAI RAG Service Deployment Guide

## Prerequisites

Before deploying, ensure you have:
1. Applied the SQL fix to your Supabase database (run `node apply-sql-fix.js` for instructions)
2. Your environment variables ready:
   - `CONVERSAI_SUPABASE_DB_URL` - PostgreSQL connection string
   - `OPENAI_API_KEY` - OpenAI API key for embeddings
   - `EMBEDDING_MODEL_NAME` - (optional, defaults to text-embedding-ada-002)

## Deployment Options

### Option 1: Railway (Recommended - Easiest)

Railway offers the simplest deployment with automatic builds and SSL.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize new project
cd rag-service
railway init

# Link to GitHub (optional but recommended)
railway link

# Deploy
railway up

# Set environment variables in Railway dashboard
railway variables set CONVERSAI_SUPABASE_DB_URL="your-db-url"
railway variables set OPENAI_API_KEY="your-openai-key"

# Get your deployment URL
railway open
```

**Railway Dashboard**: https://railway.app

### Option 2: Fly.io

Fly.io offers global edge deployment with automatic scaling.

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Launch app (one-time setup)
cd rag-service
fly launch

# Set secrets (environment variables)
fly secrets set CONVERSAI_SUPABASE_DB_URL="your-db-url"
fly secrets set OPENAI_API_KEY="your-openai-key"

# Deploy
fly deploy

# Get your deployment URL
fly open
```

**Fly Dashboard**: https://fly.io/dashboard

### Option 3: Google Cloud Run

Cloud Run offers serverless container deployment with auto-scaling.

```bash
# Prerequisites: Install gcloud CLI and authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and push to Container Registry
cd rag-service
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/conversai-rag

# Deploy to Cloud Run
gcloud run deploy conversai-rag \
  --image gcr.io/YOUR_PROJECT_ID/conversai-rag \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars RUST_LOG=info \
  --set-secrets="CONVERSAI_SUPABASE_DB_URL=conversai-db-url:latest" \
  --set-secrets="OPENAI_API_KEY=openai-key:latest"

# Get your service URL
gcloud run services describe conversai-rag --region europe-west1 --format 'value(status.url)'
```

### Option 4: Docker (Self-hosted)

For self-hosting on your own server or VPS.

```bash
# Build Docker image
cd rag-service
docker build -t conversai-rag .

# Run with environment variables
docker run -d \
  --name conversai-rag \
  -p 3030:3030 \
  -e CONVERSAI_SUPABASE_DB_URL="your-db-url" \
  -e OPENAI_API_KEY="your-openai-key" \
  -e RUST_LOG=info \
  conversai-rag

# Or use docker-compose
cat > docker-compose.yml << EOF
version: '3.8'
services:
  rag-service:
    build: .
    ports:
      - "3030:3030"
    environment:
      - RUST_LOG=info
      - CONVERSAI_SUPABASE_DB_URL=\${CONVERSAI_SUPABASE_DB_URL}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    restart: unless-stopped
EOF

# Run with docker-compose
docker-compose up -d
```

## Post-Deployment Steps

### 1. Test the Deployment

```bash
# Check health endpoint
curl https://your-deployment-url/health

# Test ingestion (replace URL)
curl -X POST https://your-deployment-url/ingest \
  -F "file=@test-doc.md" \
  -F "tags=test"

# Test query
curl -X POST https://your-deployment-url/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "k": 5}'
```

### 2. Update Frontend Environment

Add to your Vercel environment variables:
```
RAG_SERVICE_URL=https://your-deployment-url
```

Update your local `.env.local`:
```
RAG_SERVICE_URL=https://your-deployment-url
```

### 3. Configure CORS (if needed)

The service already includes permissive CORS settings. For production, you may want to restrict to your domain:

Edit `src/main.rs`:
```rust
.layer(
    CorsLayer::new()
        .allow_origin("https://your-frontend-domain.vercel.app".parse::<HeaderValue>().unwrap())
        .allow_methods(Any)
        .allow_headers(Any),
)
```

## Monitoring

### Railway
- Built-in metrics dashboard
- Logs: `railway logs`

### Fly.io
- Metrics: `fly dashboard`
- Logs: `fly logs`

### Cloud Run
- Google Cloud Console → Cloud Run → Your Service → Logs/Metrics

### Self-hosted
- Use Prometheus + Grafana for metrics
- Use Loki or ELK stack for logs

## Scaling Considerations

1. **Database Connections**: The service uses a connection pool (max 5 connections). Adjust in `src/main.rs` if needed.

2. **Memory Usage**: 
   - Railway: Scales automatically
   - Fly.io: Configure in `fly.toml`
   - Cloud Run: Set via `--memory` flag
   
3. **Concurrent Requests**: The service can handle multiple concurrent requests. For heavy load, consider:
   - Increasing replicas
   - Using a cache layer (Redis)
   - Implementing rate limiting

## Troubleshooting

### Connection Issues
- Verify `CONVERSAI_SUPABASE_DB_URL` format: `postgresql://user:password@host:port/database`
- Ensure database allows connections from deployment IP
- Check Supabase connection pooler settings

### Performance Issues
- Enable query caching in Supabase
- Increase connection pool size
- Use read replicas for queries

### Memory Issues
- Reduce batch sizes in embedding service
- Implement streaming for large documents
- Use smaller chunk sizes

## Security Checklist

- [ ] Environment variables are properly secured
- [ ] HTTPS is enabled
- [ ] CORS is configured for your domain only
- [ ] Rate limiting is implemented (for public APIs)
- [ ] Database connection uses SSL
- [ ] API keys are rotated regularly
- [ ] Logs don't contain sensitive data

## Support

For issues or questions:
1. Check the logs first
2. Verify environment variables
3. Test with the health endpoint
4. Check Supabase connection status

## Cost Estimates

- **Railway**: ~$5-20/month for small-medium usage
- **Fly.io**: ~$2-15/month with free tier
- **Cloud Run**: ~$0-10/month with generous free tier
- **Self-hosted**: VPS costs (~$5-20/month)