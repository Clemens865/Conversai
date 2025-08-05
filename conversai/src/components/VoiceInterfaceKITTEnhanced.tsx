'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Message } from '@/types/conversation'
import { useAudioFrequencyAnalysis } from '@/hooks/useAudioFrequencyAnalysis'
import WebGLParticleSystem from './WebGLParticleSystem'
import {
  StateTransitionManager,
  AudioReactiveAnimator,
  ColorAnimator,
  ParticlePool,
  PerformanceMonitor,
  globalAnimationManager,
  gpuOptimizations
} from '@/lib/animationUtils'

interface VoiceInterfaceProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
}

export default function VoiceInterfaceKITTEnhanced({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId 
}: VoiceInterfaceProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pursuitMode, setPursuitMode] = useState(false)
  const [fps, setFPS] = useState(60)
  const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('high')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const pursuitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stateManagerRef = useRef<StateTransitionManager | null>(null)
  const audioAnimatorRef = useRef<AudioReactiveAnimator | null>(null)
  const particlePoolRef = useRef<ParticlePool | null>(null)
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null)

  // Audio frequency analysis
  const {
    analysisData,
    startAnalysis,
    stopAnalysis,
    getBassLevel,
    getMidLevel,
    getTrebleLevel,
    detectBeat,
    detectOnset,
    isSupported: isAudioAnalysisSupported
  } = useAudioFrequencyAnalysis({
    fftSize: 512,
    smoothingTimeConstant: 0.8,
    frequencyBins: 32
  })

  // Initialize animation systems
  useEffect(() => {
    stateManagerRef.current = new StateTransitionManager('idle', 500)
    audioAnimatorRef.current = new AudioReactiveAnimator(1.2, 0.7)
    particlePoolRef.current = new ParticlePool(150)
    performanceMonitorRef.current = new PerformanceMonitor(setFPS)

    // Enable GPU acceleration on container
    if (containerRef.current) {
      gpuOptimizations.enableGPUAcceleration(containerRef.current)
    }

    // Start performance monitoring
    globalAnimationManager.add('performance', (deltaTime) => {
      performanceMonitorRef.current?.update(performance.now())
    })

    return () => {
      globalAnimationManager.remove('performance')
      if (pursuitTimeoutRef.current) {
        clearTimeout(pursuitTimeoutRef.current)
      }
    }
  }, [])

  // Auto-adjust performance based on FPS
  useEffect(() => {
    if (fps < 30) {
      setPerformanceMode('low')
    } else if (fps < 45) {
      setPerformanceMode('medium')
    } else {
      setPerformanceMode('high')
    }
  }, [fps])

  // Update audio animator with frequency data
  useEffect(() => {
    if (audioAnimatorRef.current) {
      audioAnimatorRef.current.updateAudioData(analysisData.frequencyData)
    }
  }, [analysisData.frequencyData])

  // State management
  useEffect(() => {
    const newState = isRecording ? 'listening' : 
                    isProcessing ? 'processing' : 
                    isSpeaking ? 'speaking' : 'idle'
    
    stateManagerRef.current?.transitionTo(newState)
  }, [isRecording, isProcessing, isSpeaking])

  const triggerPursuitMode = useCallback(() => {
    setPursuitMode(true)
    if (pursuitTimeoutRef.current) {
      clearTimeout(pursuitTimeoutRef.current)
    }
    pursuitTimeoutRef.current = setTimeout(() => {
      setPursuitMode(false)
    }, 3000)

    // Spawn burst of particles
    if (particlePoolRef.current) {
      for (let i = 0; i < 20; i++) {
        particlePoolRef.current.spawn(
          400 + (Math.random() - 0.5) * 100,
          300 + (Math.random() - 0.5) * 100,
          {
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: 3 + Math.random() * 5,
            color: ColorAnimator.getAudioReactiveColor(Math.random(), 0, 100, 50)
          }
        )
      }
    }
  }, [])

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

      // Start audio analysis
      if (isAudioAnalysisSupported) {
        await startAnalysis(stream)
      }

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
        stopAnalysis()
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
      stopAnalysis()
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
      
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.volume = 1.0
      audio.play().catch(err => {
        console.error('Error playing audio:', err)
        setError('Failed to play audio response')
        setIsSpeaking(false)
      })
    } catch (error) {
      console.error('Error processing audio response:', error)
      setError('Failed to process audio response')
      setIsSpeaking(false)
    }
  }

  // Get current state for animations
  const currentState = stateManagerRef.current?.getCurrentState() || 'idle'
  const bassLevel = getBassLevel()
  const midLevel = getMidLevel()
  const trebleLevel = getTrebleLevel()
  const globalIntensity = audioAnimatorRef.current?.getGlobalIntensity() || 0

  return (
    <div 
      ref={containerRef}
      className={`
        relative hardware-accelerated
        ${performanceMode === 'low' ? 'animation-paused' : 'animation-running'}
      `}
    >
      <div className={`
        bg-black rounded-lg shadow-2xl p-8 border border-red-900/50 relative overflow-hidden
        ${pursuitMode ? 'pursuit-mode pursuit-glow' : ''}
        state-transition
      `}>
        
        {/* WebGL Particle System */}
        {performanceMode === 'high' && (
          <WebGLParticleSystem
            isActive={isRecording || isSpeaking || pursuitMode}
            intensity={globalIntensity}
            audioData={analysisData.frequencyData}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        )}

        {/* Enhanced Scanner Animation */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-black overflow-hidden" style={{ zIndex: 10 }}>
          <div className={`
            scanner-advanced
            ${(isRecording || isProcessing || isSpeaking) ? '' : 'animation-paused'}
          `} />
        </div>

        {/* Performance Indicator */}
        <div className="absolute top-2 right-2 text-xs text-gray-500 font-mono">
          FPS: {fps} | Mode: {performanceMode.toUpperCase()}
        </div>

        <h2 className={`
          text-4xl font-bold mb-8 text-red-500 text-center tracking-wider
          ${pursuitMode ? 'energy-pulse kitt-glow-enhanced' : 'kitt-glow'}
        `} style={{ zIndex: 5, position: 'relative' }}>
          K.I.T.T. NEURAL INTERFACE
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 text-red-400 rounded-md backdrop-blur-sm" style={{ zIndex: 5, position: 'relative' }}>
            {error}
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-8" style={{ zIndex: 5, position: 'relative' }}>
          
          {/* Advanced Frequency Visualization */}
          <div className="relative">
            {/* Main frequency bars */}
            <div className="flex items-end justify-center space-x-1 h-40 p-6 bg-black/60 rounded-lg backdrop-blur-sm border border-red-900/30">
              {analysisData.frequencyData.map((level, i) => {
                const animatedHeight = audioAnimatorRef.current?.getAnimationValue(i, 8) || 8
                const barColor = ColorAnimator.getAudioReactiveColor(level, i * 8, 100, 50)
                
                return (
                  <div
                    key={i}
                    className={`
                      voice-bar hardware-accelerated
                      voice-bar-${currentState}
                      ${level > 0.5 ? 'active' : ''}
                      ${performanceMode === 'low' ? 'animation-paused' : ''}
                    `}
                    style={{
                      '--bar-index': i,
                      width: '8px',
                      height: `${Math.max(4, animatedHeight * 150)}px`,
                      background: `linear-gradient(to top, ${barColor}, ${ColorAnimator.getAudioReactiveColor(level * 1.5, (i * 8 + 60) % 360, 100, 70)})`,
                      boxShadow: level > 0.3 ? `0 0 ${level * 30}px ${barColor}` : 'none',
                      filter: `brightness(${0.8 + level * 0.4}) saturate(${1 + level * 0.5})`,
                      borderRadius: '4px 4px 0 0',
                    } as React.CSSProperties}
                  />
                )
              })}
            </div>

            {/* Beat detection indicator */}
            {detectBeat() && (
              <div className="absolute inset-0 border-4 border-red-500 rounded-lg animate-ping opacity-75" />
            )}

            {/* Onset detection flash */}
            {detectOnset() && (
              <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse" />
            )}
          </div>

          {/* Frequency Band Indicators */}
          <div className="flex space-x-6 text-sm font-mono">
            <div className="flex flex-col items-center">
              <div className="text-red-400">BASS</div>
              <div 
                className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden"
                style={{
                  background: `linear-gradient(to right, transparent ${(1-bassLevel)*100}%, #ef4444 ${(1-bassLevel)*100}%)`
                }}
              />
              <div className="text-xs text-gray-500">{Math.round(bassLevel * 100)}%</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-yellow-400">MID</div>
              <div 
                className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden"
                style={{
                  background: `linear-gradient(to right, transparent ${(1-midLevel)*100}%, #eab308 ${(1-midLevel)*100}%)`
                }}
              />
              <div className="text-xs text-gray-500">{Math.round(midLevel * 100)}%</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-cyan-400">TREBLE</div>
              <div 
                className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden"
                style={{
                  background: `linear-gradient(to right, transparent ${(1-trebleLevel)*100}%, #06b6d4 ${(1-trebleLevel)*100}%)`
                }}
              />
              <div className="text-xs text-gray-500">{Math.round(trebleLevel * 100)}%</div>
            </div>
          </div>

          {/* Enhanced Energy Ring */}
          <div className="relative">
            {/* Outer energy ring */}
            <div className={`
              absolute inset-0 w-44 h-44 rounded-full 
              ${(isRecording || isSpeaking) ? 'energy-flow' : 'border-2 border-red-900/30'}
              ${pursuitMode ? 'pursuit-glow' : ''}
            `} />
            
            {/* Inner pulse ring */}
            <div className={`
              absolute inset-2 w-40 h-40 rounded-full border border-red-500/50
              ${(isRecording || isSpeaking) ? 'energy-pulse' : ''}
            `} />
            
            {/* Main Control Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || !conversationId}
              className={`
                relative w-40 h-40 rounded-full transition-all duration-500
                btn-micro hardware-accelerated
                ${isRecording 
                  ? 'bg-gradient-to-br from-red-600 via-red-500 to-orange-600 shadow-[0_0_50px_rgba(239,68,68,0.9)]' 
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-red-500'
                }
                ${isProcessing || !conversationId ? 'opacity-50 cursor-not-allowed' : ''}
                flex items-center justify-center group
              `}
            >
              {/* Recording pulse rings */}
              {isRecording && performanceMode !== 'low' && (
                <>
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping" style={{ animationDuration: '1s' }} />
                  <div className="absolute inset-0 rounded-full bg-orange-500 opacity-20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
                  <div className="absolute inset-0 rounded-full bg-yellow-500 opacity-10 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                </>
              )}
              
              {/* Button content */}
              <div className="relative z-10">
                {isRecording ? (
                  <div className="w-16 h-16 bg-white rounded-lg shadow-lg" />
                ) : (
                  <svg className="w-24 h-24 text-red-500 group-hover:text-red-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
                    <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
                  </svg>
                )}
              </div>
            </button>
          </div>
          
          {/* Enhanced Status Display */}
          <div className="text-center space-y-3">
            <p className="text-xl text-red-400 font-mono tracking-wider">
              {isRecording ? 'NEURAL LINK ACTIVE - PROCESSING AUDIO' : 
               isProcessing ? 'QUANTUM ANALYSIS IN PROGRESS' :
               isSpeaking ? 'K.I.T.T. NEURAL RESPONSE ACTIVE' :
               'NEURAL INTERFACE READY'}
            </p>
            
            {pursuitMode && (
              <p className="text-md text-orange-400 font-mono animate-pulse">
                ⚡ PURSUIT MODE ENGAGED ⚡
              </p>
            )}

            {/* Audio analysis indicators */}
            {analysisData.isActive && (
              <div className="flex justify-center space-x-4 text-xs font-mono">
                <span className="text-cyan-400">
                  FREQ: {Math.round(analysisData.dominantFrequency)}Hz
                </span>
                <span className="text-purple-400">
                  ENERGY: {Math.round(analysisData.energy * 100)}%
                </span>
                <span className="text-green-400">
                  CENTROID: {Math.round(analysisData.spectralCentroid)}Hz
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Status Grid with Audio Analysis */}
        <div className="mt-12 grid grid-cols-5 gap-4" style={{ zIndex: 5, position: 'relative' }}>
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/40 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isRecording ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${isRecording ? 'text-red-400' : 'text-gray-500'}`}>
              NEURAL MIC
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/40 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isProcessing ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${isProcessing ? 'text-yellow-400' : 'text-gray-500'}`}>
              QUANTUM CPU
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/40 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isSpeaking ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${isSpeaking ? 'text-blue-400' : 'text-gray-500'}`}>
              NEURAL OUT
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/40 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              analysisData.isActive ? 'bg-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.8)] animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-xs font-mono ${analysisData.isActive ? 'text-purple-400' : 'text-gray-500'}`}>
              FREQUENCY
            </span>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-3 bg-black/40 rounded-lg border border-red-900/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              conversationId ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'
            }`} />
            <span className={`text-xs font-mono ${conversationId ? 'text-green-400' : 'text-red-400'}`}>
              NEURAL LINK
            </span>
          </div>
        </div>

        {/* Global Audio Level Bar */}
        <div className="mt-8 flex items-center justify-center space-x-4" style={{ zIndex: 5, position: 'relative' }}>
          <span className="text-sm text-gray-400 font-mono">NEURAL ACTIVITY:</span>
          <div className="w-64 h-3 bg-gray-800 rounded-full overflow-hidden border border-red-900/30">
            <div 
              className={`
                h-full transition-all duration-100 rounded-full
                ${analysisData.audioLevel > 0.1 ? 'energy-flow' : 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500'}
              `}
              style={{ 
                width: `${analysisData.audioLevel * 100}%`,
                boxShadow: analysisData.audioLevel > 0.5 ? '0 0 15px rgba(239, 68, 68, 0.8)' : 'none'
              }}
            />
          </div>
          <span className="text-sm text-red-400 font-mono min-w-[3rem]">
            {Math.round(analysisData.audioLevel * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}