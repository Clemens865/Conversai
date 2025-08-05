'use client'

import React, { useState } from 'react'
import { ControlPanelState } from '@/types/kitt'

interface ControlPanelProps {
  state: ControlPanelState
  onStateChange: (state: ControlPanelState) => void
  className?: string
}

export function ControlPanel({ state, onStateChange, className = '' }: ControlPanelProps) {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null)

  const updateState = (key: keyof ControlPanelState, value: any) => {
    onStateChange({ ...state, [key]: value })
  }

  const modeOptions = [
    { value: 'normal', label: 'NORMAL', color: 'text-green-400', bgColor: 'bg-green-500' },
    { value: 'pursuit', label: 'PURSUIT', color: 'text-red-400', bgColor: 'bg-red-500' },
    { value: 'stealth', label: 'STEALTH', color: 'text-blue-400', bgColor: 'bg-blue-500' },
    { value: 'maintenance', label: 'MAINTENANCE', color: 'text-yellow-400', bgColor: 'bg-yellow-500' }
  ]

  const getCurrentModeInfo = () => {
    return modeOptions.find(mode => mode.value === state.mode) || modeOptions[0]
  }

  return (
    <div className={`control-panel-container ${className}`}>
      {/* Curved Dashboard Background */}
      <div className="curved-dashboard">
        <div className="dashboard-grid">
          {/* Mode Selection */}
          <div className="control-section mode-selection">
            <h3 className="section-title">OPERATION MODE</h3>
            <div className="mode-buttons">
              {modeOptions.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateState('mode', mode.value)}
                  className={`mode-button ${state.mode === mode.value ? 'active' : ''}`}
                  style={{
                    '--mode-color': mode.value === state.mode ? mode.bgColor.replace('bg-', '') : 'gray-600'
                  } as React.CSSProperties}
                  aria-pressed={state.mode === mode.value}
                  aria-label={`Set mode to ${mode.label}`}
                >
                  <span className={mode.color}>{mode.label}</span>
                  {state.mode === mode.value && (
                    <div className="mode-indicator" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="control-section system-status">
            <h3 className="section-title">SYSTEM STATUS</h3>
            <div className="status-grid">
              <div 
                className={`status-card ${selectedSystem === 'primary' ? 'selected' : ''}`}
                onClick={() => setSelectedSystem(selectedSystem === 'primary' ? null : 'primary')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSystem(selectedSystem === 'primary' ? null : 'primary')}
                aria-label="Primary systems status"
              >
                <div className="status-header">
                  <span className="status-label">PRIMARY</span>
                  <div className={`status-indicator ${state.primarySystems ? 'online' : 'offline'}`} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateState('primarySystems', !state.primarySystems)
                  }}
                  className="power-button"
                  aria-label={`${state.primarySystems ? 'Disable' : 'Enable'} primary systems`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              </div>

              <div 
                className={`status-card ${selectedSystem === 'auxiliary' ? 'selected' : ''}`}
                onClick={() => setSelectedSystem(selectedSystem === 'auxiliary' ? null : 'auxiliary')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedSystem(selectedSystem === 'auxiliary' ? null : 'auxiliary')}
                aria-label="Auxiliary systems status"
              >
                <div className="status-header">
                  <span className="status-label">AUXILIARY</span>
                  <div className={`status-indicator ${state.auxiliarySystems ? 'online' : 'offline'}`} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateState('auxiliarySystems', !state.auxiliarySystems)
                  }}
                  className="power-button"
                  aria-label={`${state.auxiliarySystems ? 'Disable' : 'Enable'} auxiliary systems`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Controls */}
          <div className="control-section emergency-controls">
            <h3 className="section-title">EMERGENCY</h3>
            <button
              onClick={() => updateState('emergencyMode', !state.emergencyMode)}
              className={`emergency-button ${state.emergencyMode ? 'active' : ''}`}
              aria-pressed={state.emergencyMode}
              aria-label="Emergency mode toggle"
            >
              <div className="emergency-icon">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span>EMERGENCY</span>
            </button>
          </div>

          {/* Voice Controls */}
          <div className="control-section voice-controls">
            <h3 className="section-title">VOICE CONTROL</h3>
            <div className="voice-options">
              <label className="switch-control">
                <input
                  type="checkbox"
                  checked={state.voiceCommands}
                  onChange={(e) => updateState('voiceCommands', e.target.checked)}
                  className="sr-only"
                />
                <div className={`switch ${state.voiceCommands ? 'on' : 'off'}`}>
                  <div className="switch-handle" />
                </div>
                <span className="switch-label">VOICE COMMANDS</span>
              </label>

              <label className="switch-control">
                <input
                  type="checkbox"
                  checked={state.autoResponse}
                  onChange={(e) => updateState('autoResponse', e.target.checked)}
                  className="sr-only"
                />
                <div className={`switch ${state.autoResponse ? 'on' : 'off'}`}>
                  <div className="switch-handle" />
                </div>
                <span className="switch-label">AUTO RESPONSE</span>
              </label>
            </div>
          </div>
        </div>

        {/* Center Display */}
        <div className="center-display">
          <div className="display-content">
            <div className="current-mode">
              <span className="mode-text">{getCurrentModeInfo().label}</span>
              <div className={`mode-status-light ${getCurrentModeInfo().bgColor}`} />
            </div>
            <div className="system-readout">
              <div className="readout-line">
                <span>PRIMARY:</span>
                <span className={state.primarySystems ? 'text-green-400' : 'text-red-400'}>
                  {state.primarySystems ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="readout-line">
                <span>AUX:</span>
                <span className={state.auxiliarySystems ? 'text-green-400' : 'text-red-400'}>
                  {state.auxiliarySystems ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="readout-line">
                <span>VOICE:</span>
                <span className={state.voiceCommands ? 'text-green-400' : 'text-gray-400'}>
                  {state.voiceCommands ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .control-panel-container {
          position: relative;
          width: 100%;
          height: 400px;
          overflow: hidden;
        }

        .curved-dashboard {
          position: relative;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%);
          border-radius: 20px;
          border: 2px solid rgba(239, 68, 68, 0.3);
          clip-path: polygon(
            0% 20%, 
            20% 0%, 
            80% 0%, 
            100% 20%, 
            100% 80%, 
            80% 100%, 
            20% 100%, 
            0% 80%
          );
          overflow: hidden;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 20px;
          padding: 30px;
          height: 100%;
        }

        .control-section {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 15px;
          backdrop-filter: blur(5px);
        }

        .section-title {
          font-family: monospace;
          font-size: 12px;
          color: #ef4444;
          margin-bottom: 10px;
          letter-spacing: 2px;
          text-align: center;
        }

        .mode-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mode-button {
          position: relative;
          padding: 8px 12px;
          background: rgba(31, 41, 55, 0.8);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          font-family: monospace;
          font-size: 10px;
          transition: all 0.3s ease;
          cursor: pointer;
          overflow: hidden;
        }

        .mode-button.active {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
        }

        .mode-button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .mode-indicator {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .status-card {
          background: rgba(31, 41, 55, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .status-card.selected {
          border-color: #ef4444;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-label {
          font-family: monospace;
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 1px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-indicator.online {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          animation: pulse 2s infinite;
        }

        .status-indicator.offline {
          background: #ef4444;
        }

        .power-button {
          width: 24px;
          height: 24px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          border-radius: 50%;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .power-button:hover {
          background: rgba(239, 68, 68, 0.4);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }

        .emergency-button {
          width: 100%;
          padding: 15px;
          background: rgba(220, 38, 38, 0.1);
          border: 2px solid rgba(220, 38, 38, 0.3);
          border-radius: 10px;
          color: #dc2626;
          font-family: monospace;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .emergency-button.active {
          background: rgba(220, 38, 38, 0.3);
          border-color: #dc2626;
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.6);
          animation: emergency-pulse 1s infinite;
        }

        .emergency-button:hover {
          background: rgba(220, 38, 38, 0.2);
        }

        .emergency-icon {
          color: inherit;
        }

        .voice-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .switch-control {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .switch {
          position: relative;
          width: 36px;
          height: 18px;
          background: #374151;
          border-radius: 18px;
          transition: all 0.3s ease;
        }

        .switch.on {
          background: #ef4444;
        }

        .switch-handle {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .switch.on .switch-handle {
          transform: translateX(18px);
        }

        .switch-label {
          font-family: monospace;
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 1px;
        }

        .center-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0.8) 70%);
          border: 2px solid #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .display-content {
          text-align: center;
          font-family: monospace;
        }

        .current-mode {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .mode-text {
          color: #ef4444;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .mode-status-light {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .system-readout {
          font-size: 8px;
          color: #6b7280;
        }

        .readout-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes emergency-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.6);
          }
          50% { 
            box-shadow: 0 0 30px rgba(220, 38, 38, 0.9);
          }
        }
      `}</style>
    </div>
  )
}