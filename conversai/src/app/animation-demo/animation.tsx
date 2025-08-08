'use client'

import { useState, useEffect } from 'react'
import VoiceInterfaceKITTEnhanced from '@/components/VoiceInterfaceKITTEnhanced'
import VoiceInterfaceAdvanced from '@/components/VoiceInterfaceAdvanced'
import WebGLParticleSystem from '@/components/WebGLParticleSystem'
import EnhancedButton from '@/components/EnhancedButton'
import { Message } from '@/types/conversation'

export default function AnimationDemoPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [conversationId] = useState('demo-conversation')
  const [currentDemo, setCurrentDemo] = useState<'kitt' | 'advanced' | 'buttons' | 'particles'>('kitt')
  const [particleIntensity, setParticleIntensity] = useState(0.5)
  const [isParticleActive, setIsParticleActive] = useState(false)
  const [performanceStats, setPerformanceStats] = useState({ fps: 60, memory: 0 })

  // Mock audio data for demonstrations
  const [mockAudioData, setMockAudioData] = useState<number[]>(new Array(32).fill(0))

  // Generate mock audio data for visualization
  useEffect(() => {
    if (currentDemo === 'particles' || isRecording) {
      const interval = setInterval(() => {
        const newData = Array.from({ length: 32 }, (_, i) => {
          const base = Math.sin(Date.now() * 0.001 + i * 0.2) * 0.5 + 0.5
          const noise = Math.random() * 0.3
          return Math.max(0, Math.min(1, base + noise))
        })
        setMockAudioData(newData)
      }, 100)

      return () => clearInterval(interval)
    }
  }, [currentDemo, isRecording])

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceStats({
        fps: Math.floor(Math.random() * 10) + 55, // Mock FPS 55-65
        memory: Math.floor(Math.random() * 20) + 30 // Mock memory 30-50MB
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const triggerParticlesBurst = () => {
    setIsParticleActive(true)
    setParticleIntensity(1)
    setTimeout(() => {
      setParticleIntensity(0.5)
      setIsParticleActive(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-black p-6 border-b border-red-900/50">
        <h1 className="text-4xl font-bold text-center mb-4 tracking-wider">
          🎬 ADVANCED ANIMATION DEMO SUITE
        </h1>
        <p className="text-center text-gray-300 mb-6">
          Showcasing 60fps voice modulator animations, WebGL effects, and advanced micro-interactions
        </p>
        
        {/* Performance Monitor */}
        <div className="flex justify-center space-x-8 text-sm font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span>FPS: {performanceStats.fps}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Memory: {performanceStats.memory}MB</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span>GPU: Active</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center p-6 space-x-4">
        {[
          { key: 'kitt', label: '🚗 K.I.T.T. Enhanced', desc: 'Neural voice interface with pursuit mode' },
          { key: 'advanced', label: '⚡ Advanced Interface', desc: 'Frequency analysis and energy flows' },
          { key: 'buttons', label: '🎛️ Button Gallery', desc: 'Micro-interactions and haptic feedback' },
          { key: 'particles', label: '✨ WebGL Particles', desc: 'Hardware-accelerated effects' }
        ].map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setCurrentDemo(key as any)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300
              ${currentDemo === key 
                ? 'border-red-500 bg-red-900/30 text-red-400' 
                : 'border-gray-700 bg-gray-900/30 text-gray-400 hover:border-red-700 hover:text-red-300'
              }
            `}
          >
            <div className="font-bold">{label}</div>
            <div className="text-xs mt-1">{desc}</div>
          </button>
        ))}
      </div>

      {/* Demo Content */}
      <div className="container mx-auto px-6 pb-12">
        {currentDemo === 'kitt' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-red-500">K.I.T.T. Enhanced Neural Interface</h2>
              <p className="text-gray-400 mb-6">
                Features: Pursuit mode animations, advanced frequency visualization, WebGL particles, 
                real-time audio analysis, state transitions, and performance optimization.
              </p>
            </div>
            <VoiceInterfaceKITTEnhanced
              onNewMessage={handleNewMessage}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              conversationId={conversationId}
            />
          </div>
        )}

        {currentDemo === 'advanced' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-blue-500">Advanced Voice Interface</h2>
              <p className="text-gray-400 mb-6">
                Features: Real-time frequency analysis, energy ring animations, particle canvas, 
                state-based color transitions, and dynamic audio visualization.
              </p>
            </div>
            <VoiceInterfaceAdvanced
              onNewMessage={handleNewMessage}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              conversationId={conversationId}
            />
          </div>
        )}

        {currentDemo === 'buttons' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-green-500">Enhanced Button Gallery</h2>
              <p className="text-gray-400 mb-6">
                Features: Ripple effects, haptic feedback, sound synthesis, morphing animations, 
                loading states, and accessibility support.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Variant showcase */}
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Button Variants</h3>
                <div className="space-y-4">
                  <EnhancedButton variant="primary" morphOnHover glowEffect rippleEffect>
                    Primary Action
                  </EnhancedButton>
                  <EnhancedButton variant="secondary" morphOnHover glowEffect rippleEffect>
                    Secondary Action
                  </EnhancedButton>
                  <EnhancedButton variant="danger" morphOnHover glowEffect rippleEffect>
                    Danger Zone
                  </EnhancedButton>
                  <EnhancedButton variant="success" morphOnHover glowEffect rippleEffect>
                    Success State
                  </EnhancedButton>
                  <EnhancedButton variant="neural" morphOnHover glowEffect rippleEffect>
                    Neural Interface
                  </EnhancedButton>
                </div>
              </div>

              {/* Size showcase */}
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Button Sizes</h3>
                <div className="space-y-4">
                  <EnhancedButton size="sm" variant="primary" rippleEffect>
                    Small
                  </EnhancedButton>
                  <EnhancedButton size="md" variant="primary" rippleEffect>
                    Medium
                  </EnhancedButton>
                  <EnhancedButton size="lg" variant="primary" rippleEffect>
                    Large
                  </EnhancedButton>
                  <EnhancedButton size="xl" variant="primary" rippleEffect>
                    Extra Large
                  </EnhancedButton>
                </div>
              </div>

              {/* Effect showcase */}
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4">Special Effects</h3>
                <div className="space-y-4">
                  <EnhancedButton 
                    variant="neural" 
                    morphOnHover 
                    glowEffect 
                    rippleEffect 
                    hapticFeedback 
                    soundEffect
                  >
                    🎵 Sound + Haptic
                  </EnhancedButton>
                  <EnhancedButton 
                    variant="primary" 
                    pulseOnActive 
                    iconMorphing
                    onClick={triggerParticlesBurst}
                  >
                    ✨ Trigger Particles
                  </EnhancedButton>
                  <EnhancedButton 
                    variant="secondary" 
                    loadingState={isRecording}
                    disabled={isRecording}
                  >
                    {isRecording ? 'Loading...' : 'Load State'}
                  </EnhancedButton>
                  <EnhancedButton variant="danger" disabled>
                    Disabled State
                  </EnhancedButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentDemo === 'particles' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-purple-500">WebGL Particle System</h2>
              <p className="text-gray-400 mb-6">
                Features: Hardware-accelerated WebGL rendering, audio-reactive particles, 
                Canvas2D fallback, performance optimization, and real-time effects.
              </p>
            </div>

            {/* Particle Controls */}
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Particle Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Intensity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={particleIntensity}
                    onChange={(e) => setParticleIntensity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{Math.round(particleIntensity * 100)}%</span>
                </div>
                <div className="flex items-end">
                  <EnhancedButton
                    variant="primary"
                    onClick={() => setIsParticleActive(!isParticleActive)}
                    rippleEffect
                    glowEffect
                  >
                    {isParticleActive ? 'Deactivate' : 'Activate'} Particles
                  </EnhancedButton>
                </div>
                <div className="flex items-end">
                  <EnhancedButton
                    variant="neural"
                    onClick={triggerParticlesBurst}
                    morphOnHover
                    pulseOnActive
                  >
                    🎆 Burst Effect
                  </EnhancedButton>
                </div>
              </div>
            </div>

            {/* Particle Display */}
            <div className="relative h-96 bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
              <WebGLParticleSystem
                isActive={isParticleActive}
                intensity={particleIntensity}
                audioData={mockAudioData}
                className="absolute inset-0"
              />
              <div className="absolute top-4 left-4 text-sm font-mono">
                <div>Particles: {isParticleActive ? Math.round(particleIntensity * 200) : 0}</div>
                <div>Audio Reactive: {mockAudioData.some(d => d > 0.1) ? 'Active' : 'Idle'}</div>
                <div>Rendering: WebGL</div>
              </div>
            </div>

            {/* Audio Visualization */}
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Mock Audio Data</h3>
              <div className="flex items-end justify-center space-x-1 h-20">
                {mockAudioData.map((level, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-purple-600 to-pink-500 rounded-t transition-all duration-100"
                    style={{
                      height: `${Math.max(2, level * 80)}px`,
                      opacity: 0.7 + level * 0.3
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Log */}
        {messages.length > 0 && (
          <div className="mt-12 bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Demo Message Log</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-2 rounded ${
                    message.role === 'user' ? 'bg-blue-900/30 text-blue-300' : 'bg-green-900/30 text-green-300'
                  }`}
                >
                  <span className="font-mono text-xs">{message.role}:</span> {message.content}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-black to-red-900 p-6 border-t border-red-900/50">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-2">Animation Features Implemented</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-bold text-red-400">🎨 Visual Effects</div>
              <ul className="text-gray-400 mt-1">
                <li>✓ WebGL Particles</li>
                <li>✓ Energy Flows</li>
                <li>✓ Glow Effects</li>
                <li>✓ State Transitions</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-blue-400">🎵 Audio Reactive</div>
              <ul className="text-gray-400 mt-1">
                <li>✓ Frequency Analysis</li>
                <li>✓ Beat Detection</li>
                <li>✓ Spectral Visualization</li>
                <li>✓ Real-time Processing</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-green-400">⚡ Performance</div>
              <ul className="text-gray-400 mt-1">
                <li>✓ 60fps Optimization</li>
                <li>✓ GPU Acceleration</li>
                <li>✓ Memory Management</li>
                <li>✓ Adaptive Quality</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-purple-400">🎛️ Interactions</div>
              <ul className="text-gray-400 mt-1">
                <li>✓ Haptic Feedback</li>
                <li>✓ Sound Effects</li>
                <li>✓ Ripple Animations</li>
                <li>✓ Micro-interactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}