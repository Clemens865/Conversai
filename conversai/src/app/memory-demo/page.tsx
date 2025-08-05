'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import MemorySearch from '@/components/MemorySearch'
import { ArrowLeft, Brain, Search, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function MemoryDemoPage() {
  const { user } = useAuth()
  const [selectedResult, setSelectedResult] = useState<any>(null)
  const [phase2Status, setPhase2Status] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    // Check Phase 2 status
    fetch('/api/phase2-status')
      .then(res => res.json())
      .then(data => {
        setPhase2Status(data)
        setStatusLoading(false)
      })
      .catch(err => {
        console.error('Failed to check Phase 2 status:', err)
        setStatusLoading(false)
      })
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 mb-4">Authentication Required</h1>
          <Link href="/" className="text-gray-400 hover:text-white">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-red-500" />
                <h1 className="text-xl font-semibold">Phase 2: Enhanced Memory</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Semantic Search Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2 Status Banner */}
      {!statusLoading && phase2Status && !phase2Status.phase2Ready && (
        <div className="bg-yellow-900/20 border-y border-yellow-800">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-yellow-500 font-semibold mb-2">
                  Database Setup Required
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Phase 2 features require database migrations to be applied.
                </p>
                <div className="bg-black/30 rounded-lg p-4 mb-3">
                  <p className="text-xs text-gray-400 mb-2">Missing components:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {!phase2Status.checks.pgvector && (
                      <li>• pgvector extension not enabled</li>
                    )}
                    {!phase2Status.checks.searchFunction && (
                      <li>• Vector search functions not created</li>
                    )}
                    {!phase2Status.checks.conversationTopicsTable && (
                      <li>• Conversation topics table missing</li>
                    )}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    <strong>To enable Phase 2:</strong>
                  </p>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 underline">Supabase Dashboard</a></li>
                    <li>Navigate to SQL Editor</li>
                    <li>Run the migration from: <code className="bg-black/50 px-2 py-0.5 rounded text-xs">supabase/migrations/20240103_vector_search_functions.sql</code></li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Status */}
      {!statusLoading && phase2Status && phase2Status.phase2Ready && (
        <div className="bg-green-900/20 border-y border-green-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-400">
                Phase 2 is fully configured! All enhanced memory features are available.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Search Interface */}
          <div className="bg-gray-950 rounded-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-5 h-5 text-red-500" />
                Memory Search
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Search your conversations using AI-powered semantic search
              </p>
            </div>
            <div className="h-[600px]">
              <MemorySearch
                onSelectResult={(result) => setSelectedResult(result)}
              />
            </div>
          </div>

          {/* Right: Selected Result Detail */}
          <div className="bg-gray-950 rounded-lg border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Result Details</h2>
            </div>
            <div className="p-6">
              {selectedResult ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Conversation
                    </h3>
                    <p className="text-white">
                      {selectedResult.conversation_title || 'Untitled Conversation'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Match Score
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${Math.round(
                              (selectedResult.similarity_score || 0) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">
                        {Math.round((selectedResult.similarity_score || 0) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Message Content
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs mb-2 ${
                          selectedResult.role === 'user'
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {selectedResult.role}
                      </span>
                      <p className="text-gray-100">{selectedResult.content}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">
                      Timestamp
                    </h3>
                    <p className="text-white">
                      {new Date(selectedResult.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <button
                      onClick={() => {
                        // Navigate to conversation
                        window.location.href = `/?conversationId=${selectedResult.conversation_id}`
                      }}
                      className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Open Conversation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Select a search result to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-950 rounded-lg border border-gray-800 p-6">
            <div className="text-red-500 mb-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Vector Embeddings</h3>
            <p className="text-sm text-gray-400">
              Every message is converted to a 1536-dimensional vector for semantic understanding
            </p>
          </div>

          <div className="bg-gray-950 rounded-lg border border-gray-800 p-6">
            <div className="text-red-500 mb-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Auto Summarization</h3>
            <p className="text-sm text-gray-400">
              Conversations are automatically summarized every 10 messages for quick context
            </p>
          </div>

          <div className="bg-gray-950 rounded-lg border border-gray-800 p-6">
            <div className="text-red-500 mb-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Topic Extraction</h3>
            <p className="text-sm text-gray-400">
              AI automatically extracts and tags conversation topics for better organization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}