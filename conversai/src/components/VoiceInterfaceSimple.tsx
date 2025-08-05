'use client'

import { useState, useRef } from 'react'
import { Message } from '@/types/conversation'

interface VoiceInterfaceProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
}

export default function VoiceInterfaceSimple({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId 
}: VoiceInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setError('Unable to access microphone. Please check your permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const playAudioResponse = (base64Audio: string, mimeType: string) => {
    try {
      console.log('Playing audio response, type:', mimeType, 'length:', base64Audio.length)
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const audioBlob = new Blob([byteArray], { type: mimeType })
      
      console.log('Audio blob created, size:', audioBlob.size)
      
      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      // Add more event listeners for debugging
      audio.onloadeddata = () => {
        console.log('Audio loaded, duration:', audio.duration)
      }
      
      audio.onplay = () => {
        console.log('Audio started playing')
      }
      
      audio.onerror = (e) => {
        console.error('Audio error:', e)
        setError('Audio playback error')
      }
      
      audio.onended = () => {
        console.log('Audio playback ended')
        URL.revokeObjectURL(audioUrl)
      }
      
      // Set volume to ensure it's audible
      audio.volume = 1.0
      
      // Play the audio
      audio.play().then(() => {
        console.log('Audio play() promise resolved')
      }).catch(err => {
        console.error('Error playing audio:', err)
        setError('Failed to play audio response')
      })
    } catch (error) {
      console.error('Error processing audio response:', error)
      setError('Failed to process audio response')
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
    try {
      // Create form data
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('conversationId', conversationId || '')

      // Send to API endpoint
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const data = await response.json()
      console.log('API Response:', {
        hasTranscript: !!data.transcript,
        hasResponse: !!data.response,
        hasAudio: !!data.audio,
        audioType: data.audioType,
        audioLength: data.audio?.length || 0
      })
      
      // Add user message
      if (data.transcript) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: data.transcript,
          timestamp: new Date()
        }
        onNewMessage(userMessage)
      }

      // Add assistant message
      if (data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        onNewMessage(assistantMessage)
      }

      // Play audio response if available
      if (data.audio && data.audioType) {
        playAudioResponse(data.audio, data.audioType)
      }

    } catch (error) {
      console.error('Processing error:', error)
      setError('Failed to process audio. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Voice Controls</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {error}
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || !conversationId}
          className={`
            relative w-24 h-24 rounded-full transition-all duration-300
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${isProcessing || !conversationId ? 'opacity-50 cursor-not-allowed' : ''}
            text-white flex items-center justify-center
          `}
        >
          {isRecording ? (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" />
            </svg>
          ) : (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
              <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
            </svg>
          )}
        </button>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
        </p>
        
        {isProcessing && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
          </div>
        )}
      </div>
      
      <div className="mt-6 space-y-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm">Microphone {isRecording ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm">Processing {isProcessing ? 'Active' : 'Idle'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${conversationId ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">Database {conversationId ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  )
}