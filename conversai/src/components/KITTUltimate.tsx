'use client'

import { useState, useRef, useEffect } from 'react'
import { Message } from '@/types/conversation'

interface KITTUltimateProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
  messages: Message[]
}

type DisplayMode = 'normal' | 'pursuit' | 'diagnostic' | 'stealth'

export default function KITTUltimate({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId,
  messages 
}: KITTUltimateProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [mode, setMode] = useState<DisplayMode>('normal')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Initialize canvas animation
    if (canvasRef.current) {
      drawVoiceModulator()
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioLevel, mode])

  const drawVoiceModulator = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(0, 0, width, height)
    
    // Draw frequency bars
    const barCount = 32
    const barWidth = width / barCount
    const barSpacing = 2
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.random() * audioLevel * height + 10
      const x = i * barWidth + barSpacing
      const y = (height - barHeight) / 2
      
      // Create gradient based on mode
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
      
      if (mode === 'pursuit') {
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)')
        gradient.addColorStop(0.5, 'rgba(255, 165, 0, 1)')
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.8)')
      } else if (mode === 'diagnostic') {
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)')
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0.8)')
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)')
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 1)')
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0.8)')
      }
      
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth - barSpacing * 2, barHeight)
      
      // Add glow effect
      ctx.shadowBlur = 10
      ctx.shadowColor = mode === 'pursuit' ? 'orange' : 'red'
      ctx.fillRect(x, y, barWidth - barSpacing * 2, barHeight)
      ctx.shadowBlur = 0
    }
    
    animationRef.current = requestAnimationFrame(drawVoiceModulator)
  }

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Set up audio analyzer
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      source.connect(analyserRef.current)

      // Analyze audio
      const analyzeAudio = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
          requestAnimationFrame(analyzeAudio)
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
      
      audio.volume = 1.0
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
    <div className="kitt-ultimate-container">
      {/* Main Scanner Bar */}
      <div className="scanner-container">
        <div className={`scanner-bar ${(isRecording || isProcessing || isSpeaking) ? 'active' : ''}`}>
          <div className="scanner-line"></div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="dashboard">
        {/* Left Panel - Status Indicators */}
        <div className="panel left-panel">
          <button className="indicator-button yellow">ALT</button>
          <button className="indicator-button yellow">OIL<br/>PRESS</button>
          <button className="indicator-button red" onClick={() => setMode('normal')}>TEMP</button>
          <button className="indicator-button red">ENG</button>
          <button className="indicator-button red">FUEL</button>
        </div>

        {/* Center - Voice Modulator */}
        <div className="panel center-panel">
          <canvas 
            ref={canvasRef}
            width={400}
            height={200}
            className="voice-canvas"
          />
          
          {/* Mode Display */}
          <div className={`mode-display ${mode}`}>
            {mode === 'normal' && 'NORMAL CRUISE'}
            {mode === 'pursuit' && 'PURSUIT MODE'}
            {mode === 'diagnostic' && 'DIAGNOSTIC'}
            {mode === 'stealth' && 'STEALTH MODE'}
          </div>

          {/* Main Control */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !conversationId}
            className={`main-control ${isRecording ? 'recording' : ''} ${mode}`}
          >
            {isRecording ? (
              <div className="stop-icon" />
            ) : (
              <svg className="mic-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
                <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
              </svg>
            )}
          </button>

          {/* Pursuit Button */}
          <button 
            className={`pursuit-button ${mode === 'pursuit' ? 'active' : ''}`}
            onClick={() => setMode(mode === 'pursuit' ? 'normal' : 'pursuit')}
          >
            PURSUIT
          </button>
        </div>

        {/* Right Panel - Function Buttons */}
        <div className="panel right-panel">
          <button className="indicator-button yellow">AUX</button>
          <button className="indicator-button yellow">SAT<br/>COMM</button>
          <button className="indicator-button red" onClick={() => setShowAdvanced(!showAdvanced)}>AUTO</button>
          <button className="indicator-button red">EJECT</button>
          <button className="indicator-button red">MPH</button>
        </div>
      </div>

      {/* Advanced Controls (Progressive Disclosure) */}
      {showAdvanced && (
        <div className="advanced-controls">
          <button onClick={() => setMode('diagnostic')} className="mode-button">
            DIAGNOSTIC MODE
          </button>
          <button onClick={() => setMode('stealth')} className="mode-button">
            STEALTH MODE
          </button>
          <button className="mode-button">VOICE COMMANDS</button>
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <div className={`status-indicator ${isRecording ? 'active' : ''}`}>
          <span className="status-dot" /> MIC
        </div>
        <div className={`status-indicator ${isProcessing ? 'active' : ''}`}>
          <span className="status-dot" /> CPU
        </div>
        <div className={`status-indicator ${isSpeaking ? 'active' : ''}`}>
          <span className="status-dot" /> VOICE
        </div>
        <div className={`status-indicator ${conversationId ? 'connected' : 'disconnected'}`}>
          <span className="status-dot" /> LINK
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-display">
          <span className="error-icon">⚠</span> {error}
        </div>
      )}

      <style jsx>{`
        .kitt-ultimate-container {
          background: #000;
          border: 2px solid #333;
          border-radius: 20px;
          padding: 30px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.3);
        }

        .scanner-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 10px;
          background: #111;
          overflow: hidden;
        }

        .scanner-bar {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .scanner-bar.active .scanner-line {
          animation: scanner-sweep 2s ease-in-out infinite;
        }

        .scanner-line {
          position: absolute;
          top: 0;
          width: 15%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(239, 68, 68, 0.8),
            rgba(239, 68, 68, 1),
            rgba(239, 68, 68, 0.8),
            transparent
          );
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
        }

        @keyframes scanner-sweep {
          0% { left: -15%; }
          50% { left: 100%; }
          100% { left: -15%; }
        }

        .dashboard {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 20px;
          margin-top: 30px;
          perspective: 1000px;
        }

        .panel {
          background: #0a0a0a;
          border: 1px solid #333;
          border-radius: 15px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          transform: rotateY(0deg);
          transform-style: preserve-3d;
        }

        .left-panel {
          transform: rotateY(5deg);
        }

        .right-panel {
          transform: rotateY(-5deg);
        }

        .center-panel {
          align-items: center;
          background: radial-gradient(ellipse at center, #111 0%, #000 100%);
        }

        .indicator-button {
          width: 80px;
          height: 50px;
          border: none;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          text-shadow: 0 0 5px currentColor;
          position: relative;
          overflow: hidden;
        }

        .indicator-button.yellow {
          background: #665500;
          color: #ffcc00;
          box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
        }

        .indicator-button.yellow:hover {
          background: #998800;
          box-shadow: 0 0 20px rgba(255, 204, 0, 0.8);
        }

        .indicator-button.red {
          background: #660000;
          color: #ff3333;
          box-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
        }

        .indicator-button.red:hover {
          background: #990000;
          box-shadow: 0 0 20px rgba(255, 51, 51, 0.8);
        }

        .voice-canvas {
          width: 100%;
          max-width: 400px;
          height: 200px;
          background: #000;
          border: 1px solid #333;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .mode-display {
          background: #003300;
          color: #00ff00;
          padding: 10px 20px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
          letter-spacing: 2px;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
          transition: all 0.3s;
        }

        .mode-display.pursuit {
          background: #330000;
          color: #ff3333;
          box-shadow: 0 0 20px rgba(255, 51, 51, 0.8);
          animation: pulse 0.5s ease-in-out infinite;
        }

        .mode-display.diagnostic {
          background: #003366;
          color: #00ccff;
          box-shadow: 0 0 10px rgba(0, 204, 255, 0.5);
        }

        .mode-display.stealth {
          background: #1a1a1a;
          color: #666;
          box-shadow: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .main-control {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #1a0000;
          border: 3px solid #660000;
          color: #ff3333;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .main-control:hover {
          background: #330000;
          border-color: #990000;
          box-shadow: 0 0 30px rgba(255, 51, 51, 0.8);
        }

        .main-control.recording {
          background: #660000;
          border-color: #ff3333;
          box-shadow: 0 0 40px rgba(255, 51, 51, 1);
          animation: recording-pulse 1s ease-in-out infinite;
        }

        .main-control:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes recording-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .stop-icon {
          width: 30px;
          height: 30px;
          background: #fff;
          border-radius: 4px;
        }

        .mic-icon {
          width: 40px;
          height: 40px;
        }

        .pursuit-button {
          background: #1a0000;
          color: #ff3333;
          border: 2px solid #660000;
          padding: 15px 40px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.3s;
          text-shadow: 0 0 5px currentColor;
        }

        .pursuit-button:hover {
          background: #330000;
          border-color: #990000;
          box-shadow: 0 0 20px rgba(255, 51, 51, 0.8);
        }

        .pursuit-button.active {
          background: #990000;
          border-color: #ff3333;
          box-shadow: 0 0 30px rgba(255, 51, 51, 1);
          animation: pursuit-flash 0.5s ease-in-out infinite;
        }

        @keyframes pursuit-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .advanced-controls {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 30px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          animation: slide-down 0.3s ease-out;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mode-button {
          background: #1a1a1a;
          color: #999;
          border: 1px solid #333;
          padding: 10px 20px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .mode-button:hover {
          background: #333;
          color: #fff;
          border-color: #666;
        }

        .status-bar {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 30px;
          padding: 15px;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 10px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 12px;
          color: #666;
          transition: all 0.3s;
        }

        .status-indicator.active {
          color: #ff3333;
        }

        .status-indicator.connected {
          color: #00ff00;
        }

        .status-indicator.disconnected {
          color: #ff0000;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          display: inline-block;
        }

        .status-indicator.active .status-dot {
          animation: blink 0.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .error-display {
          margin-top: 20px;
          padding: 15px;
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid #ff3333;
          border-radius: 8px;
          color: #ff6666;
          font-family: monospace;
          font-size: 14px;
          text-align: center;
          animation: error-shake 0.5s ease-out;
        }

        @keyframes error-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .error-icon {
          color: #ff3333;
          font-size: 18px;
          margin-right: 10px;
        }

        @media (max-width: 768px) {
          .dashboard {
            grid-template-columns: 1fr;
            perspective: none;
          }

          .panel {
            transform: none !important;
          }

          .left-panel, .right-panel {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }

          .indicator-button {
            width: 70px;
            height: 45px;
            font-size: 11px;
          }

          .main-control {
            width: 80px;
            height: 80px;
          }

          .pursuit-button {
            padding: 12px 30px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}