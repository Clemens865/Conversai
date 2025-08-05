'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Message } from '@/types/conversation'

interface VoiceInterfaceProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
}

interface ParticleSystem {
  particles: Array<{
    id: number
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: string
  }>
}

export default function VoiceInterfaceAdvanced({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId 
}: VoiceInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(32).fill(0))
  const [pursuitMode, setPursuitMode] = useState(false)
  const [particleSystem, setParticleSystem] = useState<ParticleSystem>({ particles: [] })
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const particleAnimationRef = useRef<number | null>(null)
  const pursuitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // State for smooth transitions
  const [currentState, setCurrentState] = useState<'idle' | 'listening' | 'speaking' | 'processing'>('idle')

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current)
      }
      if (pursuitTimeoutRef.current) {
        clearTimeout(pursuitTimeoutRef.current)
      }
    }
  }, [])

  // Particle system animation
  useEffect(() => {
    const canvas = particleCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      setParticleSystem(prev => {
        const updatedParticles = prev.particles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 1,
            vy: particle.vy - 0.1 // gravity
          }))
          .filter(particle => particle.life > 0)

        // Draw particles
        updatedParticles.forEach(particle => {
          const alpha = particle.life / particle.maxLife
          ctx.save()
          ctx.globalAlpha = alpha
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })

        return { particles: updatedParticles }
      })

      particleAnimationRef.current = requestAnimationFrame(animateParticles)
    }

    animateParticles()

    return () => {
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current)
      }
    }
  }, [])

  const addParticles = useCallback((count: number, x: number, y: number) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#06b6d4']
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * -3 - 1,
      life: 120,
      maxLife: 120,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))

    setParticleSystem(prev => ({
      particles: [...prev.particles, ...newParticles]
    }))
  }, [])

  const triggerPursuitMode = useCallback(() => {
    setPursuitMode(true)
    if (pursuitTimeoutRef.current) {
      clearTimeout(pursuitTimeoutRef.current)
    }
    pursuitTimeoutRef.current = setTimeout(() => {
      setPursuitMode(false)
    }, 3000)
  }, [])

  useEffect(() => {
    // Update current state based on props
    if (isRecording) {
      setCurrentState('listening')
    } else if (isProcessing) {
      setCurrentState('processing')
    } else if (isSpeaking) {
      setCurrentState('speaking')
    } else {
      setCurrentState('idle')
    }
  }, [isRecording, isProcessing, isSpeaking])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Set up advanced audio analyzer
      audioContextRef.current = new AudioContext({ sampleRate: 48000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 512
      analyserRef.current.smoothingTimeConstant = 0.8
      source.connect(analyserRef.current)

      // Advanced audio analysis
      const analyzeAudio = () => {
        if (analyserRef.current && isRecording) {
          const bufferLength = analyserRef.current.frequencyBinCount
          const dataArray = new Uint8Array(bufferLength)
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Calculate overall audio level
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
          
          // Extract frequency bands for visualization
          const bands = 32
          const bandSize = Math.floor(bufferLength / bands)
          const frequencies: number[] = []
          
          for (let i = 0; i < bands; i++) {
            let sum = 0
            for (let j = 0; j < bandSize; j++) {
              sum += dataArray[i * bandSize + j]
            }
            frequencies.push((sum / bandSize) / 255)
          }
          
          setFrequencyData(frequencies)
          
          // Trigger particles on high audio activity
          if (average > 100) {
            addParticles(3, 400, 300)
          }
          
          animationRef.current = requestAnimationFrame(analyzeAudio)
        }
      }
      analyzeAudio()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        setAudioLevel(0)
        setFrequencyData(new Array(32).fill(0))
      }

      mediaRecorder.start()
      setIsRecording(true)
      triggerPursuitMode()
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }

  const playAudioResponse = (base64Audio: string, mimeType: string) => {
    try {
      setIsSpeaking(true)
      
      const byteCharacters = atob(base64Audio)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const audioBlob = new Blob([byteArray], { type: mimeType })
      
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      // Simulate advanced voice visualization
      const simulateAdvancedVoice = () => {
        if (isSpeaking) {
          const newFrequencies = frequencyData.map((_, i) => 
            0.3 + Math.random() * 0.7 * Math.sin(Date.now() * 0.01 + i * 0.5)
          )
          setFrequencyData(newFrequencies)
          setAudioLevel(0.4 + Math.random() * 0.6)
          addParticles(2, 400 + Math.random() * 200, 300)
          setTimeout(simulateAdvancedVoice, 80)
        }
      }
      simulateAdvancedVoice()
      
      audio.onended = () => {
        setIsSpeaking(false)
        setAudioLevel(0)
        setFrequencyData(new Array(32).fill(0))
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.volume = 1.0
      audio.play().catch(err => {
        console.error('Error playing audio:', err)
        setError('Failed to play audio response')
        setIsSpeaking(false)
        setAudioLevel(0)
        setFrequencyData(new Array(32).fill(0))
      })
    } catch (error) {
      console.error('Error processing audio response:', error)
      setError('Failed to process audio response')
      setIsSpeaking(false)
      setAudioLevel(0)
      setFrequencyData(new Array(32).fill(0))
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    triggerPursuitMode()
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('conversationId', conversationId || '')

      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const data = await response.json()
      
      if (data.transcript) {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: data.transcript,
          timestamp: new Date()
        }
        onNewMessage(userMessage)
      }

      if (data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        onNewMessage(assistantMessage)
      }

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
    <div className="relative">
      {/* Import animations CSS */}
      <style jsx>{`
        @import url('/animations.css');
      `}</style>

      <div className={`
        bg-black rounded-lg shadow-2xl p-8 border border-red-900/50 relative overflow-hidden
        ${pursuitMode ? 'pursuit-mode pursuit-glow' : ''}
        state-transition gpu-accelerated
      `}>
        {/* Particle Canvas */}
        <canvas
          ref={particleCanvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          width={800}
          height={600}
          style={{ zIndex: 1 }}
        />

        {/* Enhanced Scanner Animation */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-black overflow-hidden" style={{ zIndex: 2 }}>
          <div className={`scanner-advanced ${(isRecording || isProcessing || isSpeaking) ? '' : ''}`} />
        </div>

        <h2 className={`
          text-3xl font-bold mb-8 text-red-500 text-center tracking-wider
          ${pursuitMode ? 'energy-pulse' : ''}
        `} style={{ zIndex: 3, position: 'relative' }}>
          ADVANCED VOICE INTERFACE
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 text-red-400 rounded-md backdrop-blur-sm" style={{ zIndex: 3, position: 'relative' }}>
            {error}
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-8" style={{ zIndex: 3, position: 'relative' }}>
          {/* Advanced Voice Visualization */}
          <div className="flex items-end justify-center space-x-1 h-32 p-4 bg-black/50 rounded-lg backdrop-blur-sm border border-red-900/30">
            {frequencyData.map((level, i) => (
              <div
                key={i}
                className={`
                  voice-bar gpu-accelerated
                  voice-bar-${currentState}
                  ${level > 0.5 ? 'active' : ''}
                `}
                style={{
                  '--bar-index': i,
                  width: '6px',
                  height: `${Math.max(4, level * 120)}px`,
                  background: `linear-gradient(to top, 
                    hsl(${i * 8}, 100%, 50%), 
                    hsl(${(i * 8 + 60) % 360}, 100%, 60%)
                  )`,
                  boxShadow: level > 0.3 ? `0 0 ${level * 20}px hsl(${i * 8}, 100%, 50%)` : 'none',
                  filter: `brightness(${0.8 + level * 0.4})`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Energy Flow Ring */}
          <div className="relative">
            <div className={`
              absolute inset-0 w-40 h-40 rounded-full 
              ${(isRecording || isSpeaking) ? 'energy-flow' : 'border-2 border-red-900/30'}
              ${pursuitMode ? 'pursuit-glow' : ''}
            `} style={{ zIndex: 1 }} />
            
            {/* Main Control Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              onMouseEnter={() => !isProcessing && addParticles(5, 400, 300)}
              disabled={isProcessing || !conversationId}
              className={`
                relative w-36 h-36 rounded-full transition-all duration-500
                btn-micro gpu-accelerated
                ${isRecording 
                  ? 'bg-gradient-to-br from-red-600 to-orange-600 shadow-[0_0_40px_rgba(239,68,68,0.8)]' 
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-red-500'
                }
                ${isProcessing || !conversationId ? 'opacity-50 cursor-not-allowed' : ''}
                flex items-center justify-center group
              `}
              style={{ zIndex: 2 }}
            >
              {/* Pulsing rings for recording */}
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping" style={{ animationDuration: '1s' }} />
                  <div className="absolute inset-0 rounded-full bg-orange-500 opacity-20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
                </>
              )}
              
              {isRecording ? (
                <div className="w-14 h-14 bg-white rounded-lg shadow-lg" />
              ) : (
                <svg className="w-20 h-20 text-red-500 group-hover:text-red-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
                  <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg text-red-400 font-mono tracking-wider">
              {isRecording ? 'RECORDING - ANALYZING AUDIO' : 
               isProcessing ? 'PROCESSING - AI THINKING' :
               isSpeaking ? 'ASSISTANT SPEAKING' :
               'READY - CLICK TO ACTIVATE'}
            </p>
            
            {pursuitMode && (
              <p className="text-sm text-orange-400 font-mono animate-pulse">
                PURSUIT MODE ACTIVE
              </p>
            )}
          </div>
        </div>
        
        {/* Enhanced Status Grid */}
        <div className="mt-10 grid grid-cols-4 gap-6" style={{ zIndex: 3, position: 'relative' }}>
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/30 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isRecording ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${isRecording ? 'text-red-400' : 'text-gray-500'}`}>
              MICROPHONE
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/30 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isProcessing ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${isProcessing ? 'text-yellow-400' : 'text-gray-500'}`}>
              PROCESSOR
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/30 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isSpeaking ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${isSpeaking ? 'text-blue-400' : 'text-gray-500'}`}>
              SPEAKER
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/30 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              conversationId ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'
            }`} />
            <span className={`text-xs font-mono ${conversationId ? 'text-green-400' : 'text-red-400'}`}>
              DATABASE
            </span>
          </div>
        </div>

        {/* Audio Level Indicator */}
        <div className="mt-6 flex items-center justify-center space-x-4" style={{ zIndex: 3, position: 'relative' }}>
          <span className="text-sm text-gray-400 font-mono">AUDIO LEVEL:</span>
          <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden border border-red-900/30">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 transition-all duration-100"
              style={{ 
                width: `${audioLevel * 100}%`,
                boxShadow: audioLevel > 0.5 ? '0 0 10px rgba(239, 68, 68, 0.8)' : 'none'
              }}
            />
          </div>
          <span className="text-sm text-red-400 font-mono min-w-[3rem]">
            {Math.round(audioLevel * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}