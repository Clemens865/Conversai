'use client'

import { useState, useEffect } from 'react'
import { MarkdownLibraryService } from '@/lib/services/memory/markdownLibraryClient'

interface MarkdownFile {
  id: string
  category: string
  title: string
  content: string
  tags: string[]
  lastModified: Date
}

export default function MarkdownLibraryEditor() {
  const [files, setFiles] = useState<MarkdownFile[]>([])
  const [selectedFile, setSelectedFile] = useState<MarkdownFile | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const markdownService = new MarkdownLibraryService()

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    await markdownService.initialize()
    const stored = localStorage.getItem('markdown-library')
    if (stored) {
      const parsedFiles = JSON.parse(stored) as MarkdownFile[]
      setFiles(parsedFiles)
      console.log('Loaded markdown files:', parsedFiles)
    }
  }

  const handleSelectFile = (file: MarkdownFile) => {
    setSelectedFile(file)
    setEditContent(file.content)
    setIsEditing(false)
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return
    
    await markdownService.updateFile(selectedFile.id, editContent)
    await loadFiles()
    setIsEditing(false)
    
    // Update the selected file with new content
    setSelectedFile({
      ...selectedFile,
      content: editContent,
      lastModified: new Date()
    })
    
    alert('File saved successfully!')
  }

  const handleImportBiography = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const text = await file.text()
      await markdownService.importFromBiography(text)
      await loadFiles()
      alert('Biography imported successfully!')
    }
    input.click()
  }

  const handleExportLibrary = () => {
    const json = markdownService.exportLibrary()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'markdown-library.json'
    a.click()
  }

  const handleImportLibrary = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const text = await file.text()
      markdownService.importLibrary(text)
      await loadFiles()
      alert('Library imported successfully!')
    }
    input.click()
  }

  const handleQuickSetup = () => {
    const name = prompt('What is your name?')
    const age = prompt('What is your age?')
    const location = prompt('Where are you located?')
    const occupation = prompt('What is your occupation?')
    const hobbies = prompt('What are your hobbies? (comma-separated)')
    
    if (name && age && location && occupation) {
      const identityContent = `# Personal Identity

- **Name**: ${name}
- **Age**: ${age}
- **Location**: ${location}
- **Occupation**: ${occupation}

## About Me

I'm ${name}, a ${age}-year-old ${occupation} living in ${location}.
`
      
      const preferencesContent = `# Preferences & Interests

## Hobbies

${hobbies ? hobbies.split(',').map(h => `- ${h.trim()}`).join('\n') : '- No hobbies specified'}

## Daily Routines

- Morning routine
- Work schedule
- Evening activities
`
      
      // Update the identity file
      const identityFile = files.find(f => f.id === 'personal/identity')
      if (identityFile) {
        markdownService.updateFile('personal/identity', identityContent)
      }
      
      // Update the preferences file
      const preferencesFile = files.find(f => f.id === 'personal/preferences')
      if (preferencesFile) {
        markdownService.updateFile('personal/preferences', preferencesContent)
      }
      
      loadFiles()
      alert('Personal information saved successfully!')
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setShowEditor(!showEditor)}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all"
        title="Edit Markdown Library"
      >
        📚
      </button>

      {/* Editor Panel */}
      {showEditor && (
        <div className="absolute bottom-16 right-0 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Markdown Library</h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleQuickSetup}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                Quick Setup
              </button>
              <button
                onClick={handleImportBiography}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
              >
                Import Bio
              </button>
              <button
                onClick={handleExportLibrary}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Export
              </button>
              <button
                onClick={handleImportLibrary}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
              >
                Import
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* File List */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-2">
                <h4 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Files</h4>
                {Object.entries(
                  files.reduce((acc, file) => {
                    if (!acc[file.category]) acc[file.category] = []
                    acc[file.category].push(file)
                    return acc
                  }, {} as Record<string, MarkdownFile[]>)
                ).map(([category, categoryFiles]) => (
                  <div key={category} className="mb-3">
                    <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-500 mb-1">
                      {category}
                    </h5>
                    {categoryFiles.map(file => (
                      <button
                        key={file.id}
                        onClick={() => handleSelectFile(file)}
                        className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedFile?.id === file.id ? 'bg-blue-100 dark:bg-blue-900' : ''
                        }`}
                      >
                        {file.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col">
              {selectedFile ? (
                <>
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">{selectedFile.title}</h4>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleSaveFile}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false)
                                setEditContent(selectedFile.content)
                              }}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-3 overflow-y-auto">
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-full p-2 border border-gray-300 dark:border-gray-600 rounded 
                                 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 
                                 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="prose dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">{selectedFile.content}</pre>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>Select a file to view or edit</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}