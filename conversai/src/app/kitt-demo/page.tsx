'use client'

import React, { useState } from 'react'
import { Message } from '@/types/conversation'
import { 
  KITTInterface,
  VoiceModulator,
  ControlPanel,
  StatusIndicators,
  PursuitMode
} from '@/components/kitt'
import {
  SystemStatus,
  VoiceModulatorSettings,
  ControlPanelState,
  PursuitModeState,
  KITTTheme
} from '@/types/kitt'

export default function KITTDemoPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeDemo, setActiveDemo] = useState<'full' | 'modular'>('full')
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'blue' | 'green'>('default')

  // Demo states
  const [systemStatus] = useState<SystemStatus>({
    microphone: 'active',
    processor: 'processing',
    connection: 'connected',
    temperature: 42,
    batteryLevel: 78,
    systemLoad: 0.65
  })

  const [voiceSettings, setVoiceSettings] = useState<VoiceModulatorSettings>({
    gain: 1.2,
    pitch: 1.0,
    reverb: 0.3,
    compressor: true,
    noiseGate: false,
    visualizationMode: 'bars',
    sensitivity: 1.5
  })

  const [controlState, setControlState] = useState<ControlPanelState>({
    mode: 'pursuit',
    primarySystems: true,
    auxiliarySystems: true,
    emergencyMode: false,
    autoResponse: true,
    voiceCommands: true
  })

  const [pursuitState, setPursuitState] = useState<PursuitModeState>({
    isActive: true,
    targetLocked: true,
    threat_level: 'high',
    scanMode: 'pursuit',
    targetDistance: 350,
    targetBearing: 127
  })

  // Themes
  const themes: Record<string, Partial<KITTTheme>> = {
    default: {},
    blue: {
      primaryColor: '#3b82f6',
      secondaryColor: '#2563eb',
      accentColor: '#60a5fa',
      glowColor: 'rgba(59, 130, 246, 0.5)'
    },
    green: {
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      accentColor: '#34d399',
      glowColor: 'rgba(16, 185, 129, 0.5)'
    }
  }

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const simulateRecording = () => {
    setIsRecording(true)
    setTimeout(() => {
      setIsRecording(false)
      
      // Add demo messages
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Hello KITT, run a system diagnostic.',
        timestamp: new Date()
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Good evening. Running full system diagnostic now. All primary systems operational. Pursuit mode is active and we have acquired target lock.',
        timestamp: new Date()
      }
      
      setTimeout(() => handleNewMessage(userMessage), 500)
      setTimeout(() => handleNewMessage(assistantMessage), 1500)
    }, 3000)
  }

  return (
    <div className="demo-container">
      {/* Header */}
      <div className="demo-header">
        <h1 className="demo-title">KITT Interface Demo</h1>
        <p className="demo-subtitle">
          Showcase of modular KITT voice interface components with advanced features
        </p>
        
        {/* Demo Controls */}
        <div className="demo-controls">
          <div className="control-group">
            <label htmlFor="demo-mode">Demo Mode:</label>
            <select
              id="demo-mode"
              value={activeDemo}
              onChange={(e) => setActiveDemo(e.target.value as 'full' | 'modular')}
              className="demo-select"
            >
              <option value="full">Full Interface</option>
              <option value="modular">Individual Components</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="theme-select">Theme:</label>
            <select
              id="theme-select"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value as 'default' | 'blue' | 'green')}
              className="demo-select"
            >
              <option value="default">Classic Red</option>
              <option value="blue">Ocean Blue</option>
              <option value="green">Matrix Green</option>
            </select>
          </div>

          <button
            onClick={simulateRecording}
            disabled={isRecording}
            className="demo-button"
          >
            {isRecording ? 'Recording...' : 'Simulate Recording'}
          </button>
        </div>
      </div>

      {/* Demo Content */}
      <div className="demo-content">
        {activeDemo === 'full' ? (
          /* Full Interface Demo */
          <div className="full-interface-demo">
            <h2 className="section-title">Complete KITT Interface</h2>
            <p className="section-description">
              The full integrated interface with all components working together.
              Features curved dashboard layout, real-time audio visualization, 
              pursuit mode, and comprehensive system monitoring.
            </p>
            
            <div className="interface-container">
              <KITTInterface
                onNewMessage={handleNewMessage}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                conversationId="demo-conversation"
                theme={themes[selectedTheme]}
                className="demo-interface"
              />
            </div>

            {/* Message History */}
            {messages.length > 0 && (
              <div className="message-history">
                <h3>Conversation History</h3>
                <div className="messages">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.role}`}
                    >
                      <strong>{message.role === 'user' ? 'User' : 'KITT'}:</strong>
                      <span>{message.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Modular Components Demo */
          <div className="modular-demo">
            <h2 className="section-title">Individual Components</h2>
            <p className="section-description">
              Explore each component individually to see their specific features and capabilities.
            </p>

            <div className="components-grid">
              {/* Voice Modulator */}
              <div className="component-showcase">
                <h3>Voice Modulator</h3>
                <p>Real-time audio visualization with multiple modes and audio processing controls.</p>
                <div className="component-container">
                  <VoiceModulator
                    isActive={true}
                    settings={voiceSettings}
                    onSettingsChange={setVoiceSettings}
                  />
                </div>
                <div className="features-list">
                  <h4>Features:</h4>
                  <ul>
                    <li>4 visualization modes (bars, wave, spectrum, circular)</li>
                    <li>Real-time WebAudio API integration</li>
                    <li>Adjustable gain, pitch, and reverb</li>
                    <li>Noise gate and compressor</li>
                    <li>Sensitivity controls</li>
                  </ul>
                </div>
              </div>

              {/* Control Panel */}
              <div className="component-showcase">
                <h3>Control Panel</h3>
                <p>Curved dashboard with operation modes and system controls using CSS Grid and clip-path.</p>
                <div className="component-container">
                  <ControlPanel
                    state={controlState}
                    onStateChange={setControlState}
                  />
                </div>
                <div className="features-list">
                  <h4>Features:</h4>
                  <ul>
                    <li>Curved dashboard layout with clip-path</li>
                    <li>Multiple operation modes</li>
                    <li>System power controls</li>
                    <li>Emergency mode activation</li>
                    <li>Voice command toggles</li>
                  </ul>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="component-showcase">
                <h3>Status Indicators</h3>
                <p>Comprehensive system monitoring with animated indicators and real-time updates.</p>
                <div className="component-container">
                  <StatusIndicators status={systemStatus} />
                </div>
                <div className="features-list">
                  <h4>Features:</h4>
                  <ul>
                    <li>Real-time system monitoring</li>
                    <li>Animated CPU and memory usage</li>
                    <li>Network activity indicators</li>
                    <li>Temperature and battery status</li>
                    <li>Audio level visualization</li>
                  </ul>
                </div>
              </div>

              {/* Pursuit Mode */}
              <div className="component-showcase">
                <h3>Pursuit Mode</h3>
                <p>Advanced tactical interface with radar display and target tracking capabilities.</p>
                <div className="component-container">
                  <PursuitMode
                    state={pursuitState}
                    onStateChange={setPursuitState}
                  />
                </div>
                <div className="features-list">
                  <h4>Features:</h4>
                  <ul>
                    <li>Real-time radar visualization</li>
                    <li>Target lock and tracking</li>
                    <li>Threat level assessment</li>
                    <li>Multiple scan modes</li>
                    <li>Distance and bearing display</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technical Information */}
      <div className="technical-info">
        <h2>Technical Implementation</h2>
        <div className="tech-grid">
          <div className="tech-section">
            <h3>Architecture</h3>
            <ul>
              <li>Modular React components with TypeScript</li>
              <li>Custom hooks for audio processing and animations</li>
              <li>Real-time WebAudio API integration</li>
              <li>CSS Grid and clip-path for curved layouts</li>
              <li>Comprehensive accessibility features</li>
            </ul>
          </div>
          
          <div className="tech-section">
            <h3>Features</h3>
            <ul>
              <li>Real-time voice visualization</li>
              <li>Multiple visualization modes</li>
              <li>Advanced audio processing controls</li>
              <li>Pursuit mode with radar display</li>
              <li>System monitoring and status indicators</li>
            </ul>
          </div>
          
          <div className="tech-section">
            <h3>Accessibility</h3>
            <ul>
              <li>ARIA labels and roles</li>
              <li>Keyboard navigation support</li>
              <li>Screen reader compatibility</li>
              <li>High contrast mode support</li>
              <li>Voice status announcements</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .demo-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          color: #f1f5f9;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .demo-title {
          font-size: 36px;
          font-weight: bold;
          color: #ef4444;
          margin: 0 0 10px 0;
          text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
        }

        .demo-subtitle {
          font-size: 18px;
          color: #94a3b8;
          margin: 0 0 30px 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .demo-controls {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: center;
        }

        .control-group label {
          font-size: 14px;
          color: #cbd5e1;
          font-weight: 500;
        }

        .demo-select {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          padding: 8px 12px;
          font-size: 14px;
          min-width: 150px;
        }

        .demo-select:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }

        .demo-button {
          background: transparent;
          border: 2px solid #ef4444;
          border-radius: 8px;
          color: #ef4444;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .demo-button:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
        }

        .demo-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .demo-content {
          margin-bottom: 40px;
        }

        .section-title {
          font-size: 28px;
          font-weight: bold;
          color: #ef4444;
          margin: 0 0 15px 0;
          text-align: center;
        }

        .section-description {
          font-size: 16px;
          color: #94a3b8;
          text-align: center;
          max-width: 800px;
          margin: 0 auto 30px auto;
          line-height: 1.6;
        }

        .interface-container {
          margin: 30px 0;
        }

        .demo-interface {
          max-width: 1200px;
          margin: 0 auto;
        }

        .message-history {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 20px;
          margin-top: 30px;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .message-history h3 {
          color: #ef4444;
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .message {
          padding: 10px;
          border-radius: 8px;
          border-left: 3px solid;
        }

        .message.user {
          background: rgba(59, 130, 246, 0.1);
          border-left-color: #3b82f6;
        }

        .message.assistant {
          background: rgba(239, 68, 68, 0.1);
          border-left-color: #ef4444;
        }

        .message strong {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .components-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 30px;
          margin-top: 30px;
        }

        .component-showcase {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 15px;
          padding: 25px;
          transition: transform 0.3s ease;
        }

        .component-showcase:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .component-showcase h3 {
          color: #ef4444;
          font-size: 20px;
          margin: 0 0 10px 0;
        }

        .component-showcase > p {
          color: #94a3b8;
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .component-container {
          margin: 20px 0;
          border: 1px solid rgba(75, 85, 99, 0.3);
          border-radius: 10px;
          overflow: hidden;
        }

        .features-list {
          margin-top: 20px;
        }

        .features-list h4 {
          color: #f59e0b;
          font-size: 16px;
          margin: 0 0 10px 0;
        }

        .features-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features-list li {
          padding: 5px 0;
          border-left: 2px solid #ef4444;
          padding-left: 10px;
          margin-bottom: 5px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .technical-info {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 15px;
          padding: 30px;
          margin-top: 40px;
        }

        .technical-info h2 {
          color: #ef4444;
          text-align: center;
          margin: 0 0 30px 0;
          font-size: 24px;
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .tech-section h3 {
          color: #f59e0b;
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .tech-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .tech-section li {
          padding: 8px 0;
          border-left: 2px solid #10b981;
          padding-left: 15px;
          margin-bottom: 8px;
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .demo-controls {
            flex-direction: column;
            align-items: center;
          }

          .components-grid {
            grid-template-columns: 1fr;
          }

          .tech-grid {
            grid-template-columns: 1fr;
          }

          .demo-title {
            font-size: 28px;
          }

          .demo-subtitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
}