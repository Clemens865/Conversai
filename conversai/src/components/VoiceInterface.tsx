'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/conversation'
import { VoicePipeline } from '@/lib/services/voice/voicePipeline'
import { useAuth } from '@/contexts/AuthContext'

interface VoiceInterfaceProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
}

export default function VoiceInterface({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId 
}: VoiceInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const voicePipelineRef = useRef<VoicePipeline | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    // Initialize voice pipeline when component mounts and we have necessary data
    if (user && conversationId && !voicePipelineRef.current) {
      const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
      const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      const openAIApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY

      if (deepgramApiKey && elevenLabsApiKey && openAIApiKey) {
        voicePipelineRef.current = new VoicePipeline({
          deepgramApiKey,
          elevenLabsApiKey,
          openAIApiKey,
          userId: user.id,
          conversationId,
          preferredVoice: 'rachel', // TODO: Get from user preferences
        })
      } else {
        setError('Missing API keys. Please check your environment variables.')
      }
    }
  }, [user, conversationId])

  const startRecording = async () => {
    try {
      setError(null)
      
      if (!voicePipelineRef.current) {
        setError('Voice pipeline not initialized')
        return
      }

      // Get microphone permission and stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      streamRef.current = stream

      // Start live transcription
      await voicePipelineRef.current.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            setCurrentTranscript('')
          } else {
            setCurrentTranscript(transcript)
          }
        },
        (response) => {
          // AI response is being generated
          setIsProcessing(true)
          
          // Create assistant message
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date()
          }
          onNewMessage(assistantMessage)
        },
        (error) => {
          console.error('Voice pipeline error:', error)
          setError(error.message)
          setIsProcessing(false)
        }
      )

      // Set up MediaRecorder to capture audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && voicePipelineRef.current) {
          // Convert blob to ArrayBuffer and send to Deepgram
          const arrayBuffer = await event.data.arrayBuffer()
          voicePipelineRef.current.sendAudioChunk(arrayBuffer)
        }
      }

      // Start recording with 100ms chunks for low latency
      mediaRecorder.start(100)
      setIsRecording(true)

    } catch (error: any) {
      console.error('Error accessing microphone:', error)
      setError('Unable to access microphone. Please check your permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (voicePipelineRef.current) {
      voicePipelineRef.current.stop()
    }

    setIsRecording(false)
    setCurrentTranscript('')
    setIsProcessing(false)
  }

  // Show user's speech in real-time
  useEffect(() => {
    if (currentTranscript) {
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: currentTranscript,
        timestamp: new Date()
      }
      onNewMessage(userMessage)
    }
  }, [currentTranscript])

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
            <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
          </div>
        )}

        {currentTranscript && (
          <div className="w-full mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              Hearing: "{currentTranscript}"
            </p>
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
          <span className="text-sm">AI {isProcessing ? 'Processing' : 'Idle'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${conversationId ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">Database {conversationId ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  )
}