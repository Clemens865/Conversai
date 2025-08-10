# Frontend Integration Guide for ConversAI RAG Service

## Quick Integration Steps

### 1. Update Environment Variables

Add to your Vercel project settings (Environment Variables):
```
RAG_SERVICE_URL=https://your-deployed-rag-service-url
```

Add to your local `.env.local`:
```
RAG_SERVICE_URL=https://your-deployed-rag-service-url
```

### 2. Update the RAG Client Usage

The TypeScript client at `lib/rag-client.ts` is already configured. Here's how to use it:

```typescript
import { RAGClient } from '@/lib/rag-client';

// Initialize the client
const ragClient = new RAGClient(process.env.RAG_SERVICE_URL || 'http://localhost:3030');

// Example: Query the RAG system
async function askQuestion(question: string) {
  try {
    const response = await ragClient.query({
      query: question,
      k: 5, // Top 5 results
      filters: {
        tags: ['biography', 'personal']
      }
    });
    
    // Use the response
    console.log('Found', response.context.length, 'relevant chunks');
    
    // Build context for LLM
    const context = response.context
      .map(item => item.chunk.content)
      .join('\n\n');
    
    return context;
  } catch (error) {
    console.error('RAG query failed:', error);
    return null;
  }
}

// Example: Ingest a document
async function ingestMarkdown(content: string, filename: string) {
  try {
    const file = new File([content], filename, { type: 'text/markdown' });
    
    const response = await ragClient.ingest(file, ['user-upload']);
    
    console.log('Document ingested:', response.document_id);
    console.log('Chunks created:', response.chunks_count);
    
    return response;
  } catch (error) {
    console.error('Ingestion failed:', error);
    return null;
  }
}
```

### 3. Integrate with Your Chat Component

Update your chat or conversation component to use RAG:

```typescript
// In your chat component (e.g., app/page.tsx or components/Chat.tsx)

import { RAGClient } from '@/lib/rag-client';
import { useState } from 'react';

export function ChatWithRAG() {
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const ragClient = new RAGClient(process.env.NEXT_PUBLIC_RAG_SERVICE_URL!);
  
  async function handleUserMessage(message: string) {
    setIsLoadingContext(true);
    
    try {
      // 1. Query RAG for relevant context
      const ragResponse = await ragClient.query({
        query: message,
        k: 3
      });
      
      // 2. Build context from RAG results
      const context = ragResponse.context
        .map(item => item.chunk.content)
        .join('\n\n');
      
      // 3. Send to your LLM with context
      const llmPrompt = `
        Context from knowledge base:
        ${context}
        
        User question: ${message}
        
        Please answer based on the context provided.
      `;
      
      // Your existing LLM call here
      // const llmResponse = await callYourLLM(llmPrompt);
      
    } catch (error) {
      console.error('RAG error:', error);
      // Fallback to regular LLM without context
    } finally {
      setIsLoadingContext(false);
    }
  }
  
  // Rest of your component...
}
```

### 4. Add Document Upload Feature

Create a simple document upload component:

```typescript
// components/DocumentUpload.tsx

import { RAGClient } from '@/lib/rag-client';
import { useState } from 'react';

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const ragClient = new RAGClient(process.env.NEXT_PUBLIC_RAG_SERVICE_URL!);
  
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setStatus('Uploading and processing...');
    
    try {
      const response = await ragClient.ingest(file, ['user-upload']);
      setStatus(`Success! Created ${response.chunks_count} searchable chunks.`);
    } catch (error) {
      setStatus('Upload failed. Please try again.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  }
  
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Upload Knowledge Document</h3>
      <input
        type="file"
        accept=".md,.txt"
        onChange={handleFileUpload}
        disabled={uploading}
        className="mb-2"
      />
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
```

### 5. Test the Integration

Create a test file to verify everything works:

```typescript
// test-rag-integration.ts

import { RAGClient } from './lib/rag-client';

async function testRAGIntegration() {
  const ragUrl = process.env.RAG_SERVICE_URL || 'http://localhost:3030';
  const client = new RAGClient(ragUrl);
  
  console.log('Testing RAG service at:', ragUrl);
  
  // Test health check
  try {
    const response = await fetch(`${ragUrl}/health`);
    if (response.ok) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to RAG service');
    return;
  }
  
  // Test query
  try {
    const queryResult = await client.query({
      query: 'Clemens Hönig biography',
      k: 3
    });
    console.log('✅ Query successful, found', queryResult.context.length, 'results');
  } catch (error) {
    console.log('❌ Query failed:', error);
  }
  
  console.log('Integration test complete!');
}

// Run with: npx tsx test-rag-integration.ts
testRAGIntegration();
```

## Environment Variables Summary

For your Vercel deployment, add these environment variables:

```bash
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=https://mjwztzhdefgfgedyynzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-key
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-key

# New RAG service URL (add this)
RAG_SERVICE_URL=https://your-rag-service-deployment-url

# Optional: If you want to use the RAG client in the browser
NEXT_PUBLIC_RAG_SERVICE_URL=https://your-rag-service-deployment-url
```

## Verification Checklist

- [ ] SQL fix applied to Supabase database
- [ ] RAG service deployed and accessible
- [ ] Environment variable added to Vercel
- [ ] Health endpoint returns 200 OK
- [ ] Test document can be ingested
- [ ] Queries return relevant results
- [ ] Frontend can connect to RAG service

## Troubleshooting

### CORS Issues
If you get CORS errors, ensure the RAG service has proper CORS headers. The service already includes permissive CORS, but you may need to adjust for production.

### Connection Timeouts
- Check if the service URL is correct
- Verify the service is running (`/health` endpoint)
- Check network/firewall settings

### Empty Query Results
- Ensure documents have been ingested
- Check if embeddings are being generated
- Verify OpenAI API key is valid

## Next Steps

1. **Ingest Your Data**: Upload your biographical markdown and other documents
2. **Customize Queries**: Adjust the query parameters for better results
3. **Add Feedback**: Implement the feedback endpoint to improve results over time
4. **Monitor Usage**: Track API calls and optimize for cost