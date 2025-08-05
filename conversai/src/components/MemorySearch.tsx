'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2, MessageSquare, Clock, Hash } from 'lucide-react'

interface SearchResult {
  message_id: string
  conversation_id: string
  conversation_title?: string
  role: string
  content: string
  created_at: string
  similarity_score?: number
  relevance_score?: number
}

interface MemorySearchProps {
  onSelectResult?: (result: SearchResult) => void
}

export default function MemorySearch({ onSelectResult }: MemorySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState<'semantic' | 'text'>('semantic')
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          searchType,
          limit: 20,
          threshold: 0.6
        })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      
      // Check if it's a migration error
      if (data.error === 'Database migration required') {
        console.error('Migration required:', data.details)
        alert(`Database Setup Required:\n\n${data.details}\n\nPlease apply the migration file:\n${data.migrationPath}`)
        
        // If semantic search failed, try text search as fallback
        if (data.fallbackToText && searchType === 'semantic') {
          setSearchType('text')
          // Retry with text search
          setTimeout(() => handleSearch(), 100)
          return
        }
      }
      
      setResults(data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, searchType])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return `${diffMinutes}m ago`
      }
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getScoreDisplay = (result: SearchResult) => {
    const score = result.similarity_score || result.relevance_score || 0
    const percentage = Math.round(score * 100)
    
    let color = 'text-gray-500'
    if (percentage >= 80) color = 'text-green-500'
    else if (percentage >= 60) color = 'text-yellow-500'
    else color = 'text-red-500'

    return (
      <span className={`text-xs font-medium ${color}`}>
        {percentage}% match
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your conversations..."
              className="w-full px-4 py-2 pr-10 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 text-white placeholder-gray-500"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-500" />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {/* Search Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSearchType('semantic')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              searchType === 'semantic'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Hash className="w-3 h-3 inline mr-1" />
            Semantic Search
          </button>
          <button
            onClick={() => setSearchType('text')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              searchType === 'text'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Text Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {hasSearched && results.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No results found for "{query}"</p>
            <p className="text-sm mt-2">Try a different search term or switch search modes</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y divide-gray-800">
            {results.map((result) => (
              <div
                key={result.message_id}
                onClick={() => onSelectResult?.(result)}
                className="p-4 hover:bg-gray-900 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-300">
                      {result.conversation_title || 'Untitled Conversation'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getScoreDisplay(result)}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(result.created_at)}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${
                    result.role === 'user' ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-300'
                  }`}>
                    {result.role}
                  </span>
                  <span className="line-clamp-2">{result.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Search Your Memory</h3>
            <p className="text-sm">
              Use semantic search to find relevant conversations based on meaning,
              <br />
              or text search for exact matches.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}