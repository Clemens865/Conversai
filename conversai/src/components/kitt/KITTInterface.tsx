'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Message } from '@/types/conversation'
import { 
  SystemStatus, 
  VoiceModulatorSettings, 
  ControlPanelState, 
  PursuitModeState, 
  KITTTheme,
  AccessibilityFeatures 
} from '@/types/kitt'
import { useAnimationState } from '@/hooks/useAnimationState'
import { VoiceModulator } from './VoiceModulator'
import { ControlPanel } from './ControlPanel'
import { StatusIndicators } from './StatusIndicators'
import { PursuitMode } from './PursuitMode'

interface KITTInterfaceProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
  theme?: Partial<KITTTheme>
  className?: string
}

const DEFAULT_THEME: KITTTheme = {
  primaryColor: '#ef4444',
  secondaryColor: '#dc2626',
  accentColor: '#f97316',
  backgroundColor: '#111827',
  borderColor: '#374151',
  glowColor: 'rgba(239, 68, 68, 0.5)',
  textColor: '#f3f4f6',
  warningColor: '#f59e0b',
  errorColor: '#dc2626',
  successColor: '#10b981'
}

export function KITTInterface({
  onNewMessage,
  isRecording,
  setIsRecording,
  conversationId,
  theme = {},
  className = ''
}: KITTInterfaceProps) {
  // Merge default theme with custom theme
  const activeTheme = { ...DEFAULT_THEME, ...theme }

  // Component states
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  
  // System states
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    microphone: 'inactive',
    processor: 'idle',
    connection: conversationId ? 'connected' : 'disconnected',
    temperature: 25,
    batteryLevel: 85,
    systemLoad: 0.2
  })

  const [voiceSettings, setVoiceSettings] = useState<VoiceModulatorSettings>({
    gain: 1.0,
    pitch: 1.0,
    reverb: 0.2,
    compressor: true,
    noiseGate: true,
    visualizationMode: 'bars',
    sensitivity: 1.0
  })

  const [controlState, setControlState] = useState<ControlPanelState>({
    mode: 'normal',
    primarySystems: true,
    auxiliarySystems: true,
    emergencyMode: false,
    autoResponse: true,
    voiceCommands: true
  })

  const [pursuitState, setPursuitState] = useState<PursuitModeState>({
    isActive: false,
    targetLocked: false,
    threat_level: 'low',
    scanMode: 'passive',
    targetDistance: null,
    targetBearing: null
  })

  const [accessibilityFeatures] = useState<AccessibilityFeatures>({
    announceStatus: true,
    keyboardNavigation: true,
    highContrast: false,
    screenReaderSupport: true,
    voiceGuidance: false
  })

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const statusUpdateRef = useRef<NodeJS.Timeout | null>(null)

  // Animation state
  const {
    animationState,
    activateScanner,
    deactivateScanner,
    activatePulse,
    deactivatePulse,
    triggerSystemAlert,
    createBreathingEffect,
    stopBreathingEffect
  } = useAnimationState({
    scannerSpeed: controlState.mode === 'pursuit' ? 1000 : 2000,
    glowIntensity: pursuitState.isActive ? 1.0 : 0.8
  })

  // Update system status periodically
  useEffect(() => {
    const updateSystemStatus = () => {
      setSystemStatus(prev => ({
        ...prev,
        microphone: isRecording ? 'active' : 'inactive',
        processor: isProcessing ? 'processing' : 'idle',
        connection: conversationId ? 'connected' : 'disconnected',
        temperature: 25 + Math.random() * 15,
        systemLoad: Math.random() * 0.8
      }))
    }

    statusUpdateRef.current = setInterval(updateSystemStatus, 2000)
    return () => {
      if (statusUpdateRef.current) {
        clearInterval(statusUpdateRef.current)
      }
    }
  }, [isRecording, isProcessing, conversationId])

  // Handle animation triggers
  useEffect(() => {
    if (isRecording || isProcessing || isSpeaking) {
      activateScanner()
      activatePulse()
    } else {
      deactivateScanner()
      deactivatePulse()
    }
  }, [isRecording, isProcessing, isSpeaking, activateScanner, deactivateScanner, activatePulse, deactivatePulse])

  // Handle pursuit mode activation
  useEffect(() => {
    if (pursuitState.isActive) {
      triggerSystemAlert('warning')
      setControlState(prev => ({ ...prev, mode: 'pursuit' }))
    } else {
      setControlState(prev => ({ ...prev, mode: 'normal' }))
    }
  }, [pursuitState.isActive, triggerSystemAlert])

  // Handle emergency mode
  useEffect(() => {
    if (controlState.emergencyMode) {
      triggerSystemAlert('error')
      setPursuitState(prev => ({ ...prev, threat_level: 'critical' }))
    }
  }, [controlState.emergencyMode, triggerSystemAlert])

  // Audio processing functions
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Set up audio analyzer
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Start analyzing audio levels
      const analyzeAudio = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
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
        
        // Clean up
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        setAudioLevel(0)
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      // Announce status for accessibility
      if (accessibilityFeatures.announceStatus) {
        announceStatus('Recording started')
      }
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setError('Unable to access microphone. Please check your permissions.')
      triggerSystemAlert('error')
    }
  }, [isRecording, accessibilityFeatures.announceStatus, triggerSystemAlert])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      
      if (accessibilityFeatures.announceStatus) {
        announceStatus('Recording stopped')
      }
    }
  }, [isRecording, accessibilityFeatures.announceStatus])

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    
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

      triggerSystemAlert('success')
    } catch (error) {
      console.error('Processing error:', error)
      setError('Failed to process audio. Please try again.')
      triggerSystemAlert('error')
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
      
      // Simulate voice visualization
      const simulateVoiceLevel = () => {
        if (isSpeaking) {
          setAudioLevel(0.3 + Math.random() * 0.7)
          setTimeout(simulateVoiceLevel, 100)
        }
      }
      simulateVoiceLevel()
      
      audio.onended = () => {
        setIsSpeaking(false)
        setAudioLevel(0)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.volume = voiceSettings.gain
      audio.play().catch(err => {
        console.error('Error playing audio:', err)
        setError('Failed to play audio response')
        setIsSpeaking(false)
        setAudioLevel(0)
      })
    } catch (error) {
      console.error('Error processing audio response:', error)
      setError('Failed to process audio response')
      setIsSpeaking(false)
      setAudioLevel(0)
    }
  }

  const announceStatus = (message: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.volume = 0.5
      utterance.rate = 1.2
      speechSynthesis.speak(utterance)
    }
  }

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!accessibilityFeatures.keyboardNavigation) return

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault()
        if (isRecording) {
          stopRecording()
        } else {
          startRecording()
        }
        break
      case 'Escape':
        if (isRecording) {
          stopRecording()
        }
        if (controlState.emergencyMode) {
          setControlState(prev => ({ ...prev, emergencyMode: false }))
        }
        break
      case 'p':
      case 'P':
        setPursuitState(prev => ({ ...prev, isActive: !prev.isActive }))
        break
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (statusUpdateRef.current) {
        clearInterval(statusUpdateRef.current)
      }
      stopBreathingEffect()
    }
  }, [stopBreathingEffect])

  return (
    <div 
      className={`kitt-interface ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="KITT Voice Interface"
      style={{
        '--primary-color': activeTheme.primaryColor,
        '--secondary-color': activeTheme.secondaryColor,
        '--accent-color': activeTheme.accentColor,
        '--background-color': activeTheme.backgroundColor,
        '--border-color': activeTheme.borderColor,
        '--glow-color': activeTheme.glowColor,
        '--text-color': activeTheme.textColor
      } as React.CSSProperties}
    >
      {/* KITT Scanner */}
      <div className="kitt-scanner-bar">
        <div className={`scanner-line ${animationState.scannerActive ? 'active' : ''}`} />
      </div>

      {/* Main Header */}
      <div className="kitt-header">
        <h1 className="kitt-title">
          K.I.T.T. VOICE INTERFACE
          <span className="version">v2.0</span>
        </h1>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-column left">
          <VoiceModulator
            isActive={isRecording || isSpeaking}
            settings={voiceSettings}
            onSettingsChange={setVoiceSettings}
            className="dashboard-module"
          />
          
          <StatusIndicators
            status={systemStatus}
            className="dashboard-module"
          />
        </div>

        {/* Center Column - Main Control */}
        <div className="dashboard-column center">
          <div className="main-control-area">
            {/* Voice Level Display */}
            <div className="voice-visualization">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="voice-bar"
                  style={{
                    height: `${Math.min(100, (audioLevel * 100 * (1 + Math.sin(i / 3) * 0.3)))}%`,
                    opacity: audioLevel > 0 ? 0.8 + (audioLevel * 0.2) : 0.3,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>

            {/* Main Control Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || !conversationId}
              className={`main-control-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
              aria-pressed={isRecording}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <div className="button-glow" />
              {isRecording ? (
                <div className="stop-icon" />
              ) : (
                <svg className="mic-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
                  <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
                </svg>
              )}
            </button>

            {/* Status Text */}
            <div className="status-text">
              {isRecording ? 'RECORDING... CLICK TO STOP' : 
               isProcessing ? 'PROCESSING...' :
               isSpeaking ? 'K.I.T.T. SPEAKING...' :
               'CLICK TO ACTIVATE'}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-column right">
          <ControlPanel
            state={controlState}
            onStateChange={setControlState}
            className="dashboard-module"
          />
        </div>
      </div>

      {/* Pursuit Mode Panel */}
      {(pursuitState.isActive || controlState.mode === 'pursuit') && (
        <div className="pursuit-panel">
          <PursuitMode
            state={pursuitState}
            onStateChange={setPursuitState}
          />
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {accessibilityFeatures.keyboardNavigation && (
        <div className="keyboard-help" aria-label="Keyboard shortcuts">
          <div className="shortcut">
            <kbd>Space</kbd> / <kbd>Enter</kbd> - Toggle recording
          </div>
          <div className="shortcut">
            <kbd>Esc</kbd> - Stop recording / Exit emergency
          </div>
          <div className="shortcut">
            <kbd>P</kbd> - Toggle pursuit mode
          </div>
        </div>
      )}

      <style jsx>{`
        .kitt-interface {
          position: relative;
          width: 100%;
          min-height: 600px;
          background: linear-gradient(135deg, var(--background-color) 0%, #1f2937 50%, var(--background-color) 100%);
          border: 2px solid var(--primary-color);
          border-radius: 20px;
          padding: 20px;
          font-family: 'Courier New', monospace;
          color: var(--text-color);
          overflow: hidden;
          outline: none;
        }

        .kitt-scanner-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--background-color);
          overflow: hidden;
        }

        .scanner-line {
          position: absolute;
          top: 0;
          width: 30%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            var(--primary-color),
            var(--secondary-color),
            var(--primary-color),
            transparent
          );
          box-shadow: 0 0 20px var(--glow-color);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .scanner-line.active {
          animation: scanner 2s ease-in-out infinite;
          opacity: 1;
        }

        .kitt-header {
          text-align: center;
          margin-bottom: 30px;
          position: relative;
        }

        .kitt-title {
          font-size: 24px;
          font-weight: bold;
          color: var(--primary-color);
          letter-spacing: 3px;
          margin: 0;
          text-shadow: 0 0 10px var(--glow-color);
          position: relative;
        }

        .version {
          font-size: 12px;
          color: var(--accent-color);
          margin-left: 10px;
          opacity: 0.8;
        }

        .error-message {
          margin-top: 10px;
          padding: 10px;
          background: rgba(220, 38, 38, 0.2);
          border: 1px solid #dc2626;
          border-radius: 5px;
          color: #fca5a5;
          font-size: 14px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 400px 1fr;
          gap: 20px;
          height: 400px;
          margin-bottom: 20px;
        }

        .dashboard-column {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .dashboard-module {
          flex: 1;
        }

        .main-control-area {
          background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
          border: 2px solid var(--primary-color);
          border-radius: 20px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .voice-visualization {
          display: flex;
          align-items: end;
          justify-content: center;
          gap: 3px;
          height: 80px;
          margin-bottom: 30px;
        }

        .voice-bar {
          width: 4px;
          background: linear-gradient(to top, var(--primary-color), var(--accent-color));
          border-radius: 2px;
          transition: height 0.1s ease;
          animation: voicePulse 0.5s ease-in-out infinite alternate;
        }

        .main-control-button {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 3px solid var(--primary-color);
          background: transparent;
          color: var(--primary-color);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .main-control-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          box-shadow: 0 0 30px var(--glow-color);
        }

        .main-control-button.recording {
          background: var(--primary-color);
          box-shadow: 0 0 40px var(--glow-color);
          animation: recordingPulse 1s ease-in-out infinite;
        }

        .main-control-button.processing {
          animation: processingRotate 2s linear infinite;
        }

        .main-control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-glow {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: var(--glow-color);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .main-control-button:hover .button-glow {
          opacity: 0.3;
          animation: glowPulse 2s ease-in-out infinite;
        }

        .mic-icon {
          width: 48px;
          height: 48px;
          transition: transform 0.3s ease;
        }

        .stop-icon {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 4px;
        }

        .status-text {
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 2px;
          color: var(--accent-color);
          text-align: center;
          animation: textGlow 2s ease-in-out infinite alternate;
        }

        .pursuit-panel {
          margin-top: 20px;
          animation: slideUp 0.5s ease-out;
        }

        .keyboard-help {
          position: absolute;
          bottom: 10px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px;
          font-size: 10px;
          color: #9ca3af;
          opacity: 0.7;
        }

        .shortcut {
          margin-bottom: 4px;
        }

        .shortcut:last-child {
          margin-bottom: 0;
        }

        kbd {
          background: var(--border-color);
          color: var(--text-color);
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: bold;
        }

        @keyframes scanner {
          0% { left: -30%; }
          50% { left: 100%; }
          100% { left: -30%; }
        }

        @keyframes voicePulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        @keyframes recordingPulse {
          0%, 100% { 
            box-shadow: 0 0 40px var(--glow-color);
          }
          50% { 
            box-shadow: 0 0 60px var(--glow-color), 0 0 80px var(--glow-color);
          }
        }

        @keyframes processingRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @keyframes textGlow {
          0% { text-shadow: 0 0 5px var(--glow-color); }
          100% { text-shadow: 0 0 15px var(--glow-color), 0 0 20px var(--glow-color); }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
            height: auto;
          }

          .dashboard-column.center {
            order: -1;
          }

          .main-control-area {
            height: 300px;
          }
        }
      `}</style>
    </div>
  )
}