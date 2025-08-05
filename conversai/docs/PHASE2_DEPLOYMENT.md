# Phase 2: Enhanced Memory - Deployment Guide

## Overview

Phase 2 adds powerful memory and search capabilities to ConversAI:
- **Vector-based Semantic Search**: Find conversations by meaning, not just keywords
- **Automatic Summarization**: AI-generated summaries every 10 messages
- **Topic Extraction**: Automatic tagging and categorization
- **Enhanced Context Management**: Smarter conversation context with relevant history

## Prerequisites

1. **Supabase Database** with pgvector extension enabled
2. **OpenAI API Key** with access to embedding models
3. **Node.js 18+** and pnpm/npm
4. **Environment Variables** properly configured

## Deployment Steps

### 1. Database Migration

The Phase 2 features require new database functions and tables. You have two options:

#### Option A: Using Supabase Dashboard (Recommended)

1. Navigate to your [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Copy the contents of `supabase/migrations/20240103_vector_search_functions.sql`
4. Paste and execute in the SQL editor

#### Option B: Using Migration Script

```bash
cd conversai
node scripts/apply-phase2-migrations.js
```

This will display the migration content and provide instructions.

### 2. Environment Variables

Ensure your `.env.local` has all required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key  # Optional, for admin operations

# OpenAI (Required for embeddings)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key

# Voice Services
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 3. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 4. Build and Deploy

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start
```

## Feature Configuration

### Embedding Generation

Embeddings are generated automatically when messages are added. The system uses:
- Model: `text-embedding-3-small`
- Dimensions: 1536
- Processing: Background/async to avoid blocking

### Search Configuration

Two search modes are available:

1. **Semantic Search** (Default)
   - Uses vector similarity
   - Threshold: 0.7 (adjustable)
   - Finds conceptually related content

2. **Text Search**
   - Traditional keyword matching
   - Case-insensitive
   - Faster but less intelligent

### Summarization Settings

- Triggers: Every 10 messages
- Model: `gpt-4o-mini`
- Extracts: Summary, topics, key points, sentiment

## Usage Guide

### Memory Search UI

Access the memory search demo at `/memory-demo`:

```typescript
// Example search request
const response = await fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'machine learning concepts',
    searchType: 'semantic',
    limit: 20,
    threshold: 0.7
  })
});
```

### Conversation Summarization

Trigger manual summarization:

```typescript
// Summarize a single conversation
const response = await fetch('/api/conversations/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'uuid-here'
  })
});

// Batch summarize multiple conversations
const response = await fetch('/api/conversations/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batch: true,
    conversationIds: ['uuid1', 'uuid2', 'uuid3']
  })
});
```

### Enhanced Context in Voice Processing

The voice processing now automatically:
1. Retrieves recent conversation messages
2. Searches for semantically similar past conversations
3. Includes relevant context in AI responses
4. Generates embeddings for new messages

## Performance Optimization

### Indexing

The migration creates an IVFFlat index for vector searches:
```sql
CREATE INDEX idx_message_embeddings_embedding 
ON message_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Batch Processing

For existing conversations without embeddings:

```javascript
// Backfill embeddings for a user
const service = new ConversationServiceServer();
await service.backfillEmbeddings(userId);
```

### Caching Strategies

1. **Embedding Cache**: Store frequently accessed embeddings
2. **Summary Cache**: Cache conversation summaries
3. **Topic Cache**: Pre-compute common topics

## Monitoring & Debugging

### Check Embedding Generation

```sql
-- Count messages with/without embeddings
SELECT 
  COUNT(m.id) as total_messages,
  COUNT(me.id) as messages_with_embeddings
FROM messages m
LEFT JOIN message_embeddings me ON m.id = me.message_id
WHERE m.conversation_id = 'your-conversation-id';
```

### Search Performance

Monitor search latency in the API logs:
```
Retrieved context messages: 10
Relevant history: 5
Topics: ["AI", "machine learning", "neural networks"]
```

### Common Issues

1. **"pgvector extension not found"**
   - Enable pgvector in Supabase dashboard under Extensions

2. **"Embedding generation failed"**
   - Check OpenAI API key and quota
   - Verify model access (text-embedding-3-small)

3. **"Search returns no results"**
   - Ensure embeddings are generated (check message_embeddings table)
   - Lower similarity threshold (default 0.7)

## Security Considerations

1. **API Keys**: Never expose service keys in client code
2. **RLS Policies**: All new tables have Row Level Security enabled
3. **Rate Limiting**: Implement rate limits for embedding generation
4. **Data Privacy**: Embeddings contain semantic information about conversations

## Next Steps

### Phase 3 Preview: Predictive Intelligence
- Conversation prediction models
- Proactive context loading
- Response time optimization

### Recommended Enhancements
1. Add embedding generation status UI
2. Implement conversation export with summaries
3. Create topic-based conversation browsing
4. Add multi-language support

## Support

For issues or questions:
1. Check error logs in Supabase Dashboard
2. Review browser console for client-side errors
3. Verify all environment variables are set
4. Test individual components (search, summarization) separately

---

**Remember**: Phase 2 features work best with sufficient conversation data. The more you use ConversAI, the smarter it becomes!