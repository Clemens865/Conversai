/**
 * TypeScript client for the Rust RAG service
 */

export interface IngestResponse {
  document_id: string
  chunks_count: number
  tokens_estimate: number
  warnings: string[]
}

export interface QueryRequest {
  query: string
  filters?: {
    tags?: string[]
    document_ids?: string[]
    date_range?: [string, string]
  }
  k?: number
}

export interface QueryResponse {
  context: ChunkWithScore[]
  citations: Citation[]
  diagnostics: QueryDiagnostics
}

export interface ChunkWithScore {
  chunk: {
    id: string
    document_id: string
    content: string
    section?: string
    metadata?: any
  }
  score: number
  source_uri: string
}

export interface Citation {
  document_id: string
  source_uri: string
  section?: string
  page?: number
  span?: [number, number]
}

export interface QueryDiagnostics {
  ann_k: number
  lexical_k: number
  reranker?: string
  query_time_ms: number
  embedding_time_ms: number
  rerank_time_ms: number
}

export class RAGClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:3030'
  }

  /**
   * Ingest a document into the RAG system
   */
  async ingest(file: File, tags?: string[]): Promise<IngestResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (tags && tags.length > 0) {
      formData.append('tags', tags.join(','))
    }

    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Ingest failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Query the RAG system
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Submit feedback on query results
   */
  async submitFeedback(
    query: string,
    selectedChunkIds: string[],
    useful: boolean
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        selected_chunk_ids: selectedChunkIds,
        useful,
      }),
    })

    if (!response.ok) {
      throw new Error(`Feedback submission failed: ${response.statusText}`)
    }
  }

  /**
   * Health check
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }
}

// Singleton instance
export const ragClient = new RAGClient()

/**
 * Helper function to format RAG context for LLM
 */
export function formatContextForLLM(response: QueryResponse): string {
  const contextParts = response.context.map((item, index) => {
    const citation = response.citations[index]
    return `[Source ${index + 1}: ${citation?.section || 'Document'}]
${item.chunk.content}
---`
  })

  return contextParts.join('\n\n')
}

/**
 * Helper to ingest markdown content from the library
 */
export async function ingestMarkdownLibrary(
  content: Map<string, string>,
  tags: string[] = ['personal', 'biography']
): Promise<void> {
  const client = new RAGClient()
  
  for (const [filename, fileContent] of content.entries()) {
    const file = new File([fileContent], filename, { type: 'text/markdown' })
    try {
      const result = await client.ingest(file, tags)
      console.log(`Ingested ${filename}: ${result.chunks_count} chunks`)
    } catch (error) {
      console.error(`Failed to ingest ${filename}:`, error)
    }
  }
}