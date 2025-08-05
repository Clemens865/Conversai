'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PursuitModeState } from '@/types/kitt'

interface PursuitModeProps {
  state: PursuitModeState
  onStateChange: (state: PursuitModeState) => void
  className?: string
}

export function PursuitMode({ state, onStateChange, className = '' }: PursuitModeProps) {
  const [radarSweep, setRadarSweep] = useState(0)
  const [scanLines, setScanLines] = useState<Array<{ angle: number; intensity: number; id: number }>>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Radar animation
  useEffect(() => {
    if (!state.isActive) return

    const animate = () => {
      setRadarSweep(prev => (prev + 2) % 360)
      
      // Add scan lines randomly
      if (Math.random() > 0.95) {
        setScanLines(prev => [...prev, {
          angle: Math.random() * 360,
          intensity: 1,
          id: Date.now()
        }].slice(-10))
      }

      // Fade scan lines
      setScanLines(prev => prev.map(line => ({
        ...line,
        intensity: Math.max(0, line.intensity - 0.05)
      })).filter(line => line.intensity > 0))

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [state.isActive])

  // Draw radar on canvas
  useEffect(() => {
    if (!canvasRef.current || !state.isActive) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const maxRadius = Math.min(centerX, centerY) - 20

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw radar background
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)'
    ctx.lineWidth = 1

    // Concentric circles
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, (maxRadius / 4) * i, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Cross hairs
    ctx.beginPath()
    ctx.moveTo(centerX - maxRadius, centerY)
    ctx.lineTo(centerX + maxRadius, centerY)
    ctx.moveTo(centerX, centerY - maxRadius)
    ctx.lineTo(centerX, centerY + maxRadius)
    ctx.stroke()

    // Radar sweep
    const sweepAngle = (radarSweep * Math.PI) / 180
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)')
    gradient.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)')
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, maxRadius, sweepAngle - 0.3, sweepAngle + 0.3)
    ctx.fill()

    // Draw scan lines
    scanLines.forEach(line => {
      const angle = (line.angle * Math.PI) / 180
      const endX = centerX + Math.cos(angle) * maxRadius
      const endY = centerY + Math.sin(angle) * maxRadius

      ctx.strokeStyle = `rgba(239, 68, 68, ${line.intensity})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    })

    // Draw target if locked
    if (state.targetLocked && state.targetDistance && state.targetBearing !== null) {
      const targetAngle = (state.targetBearing * Math.PI) / 180
      const targetRadius = (state.targetDistance / 1000) * maxRadius
      const targetX = centerX + Math.cos(targetAngle) * targetRadius
      const targetY = centerY + Math.sin(targetAngle) * targetRadius

      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(targetX, targetY, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Target lock indicator
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(targetX - 15, targetY)
      ctx.lineTo(targetX - 8, targetY)
      ctx.moveTo(targetX + 8, targetY)
      ctx.lineTo(targetX + 15, targetY)
      ctx.moveTo(targetX, targetY - 15)
      ctx.lineTo(targetX, targetY - 8)
      ctx.moveTo(targetX, targetY + 8)
      ctx.lineTo(targetX, targetY + 15)
      ctx.stroke()
    }
  }, [radarSweep, scanLines, state.targetLocked, state.targetDistance, state.targetBearing, state.isActive])

  const updateState = (key: keyof PursuitModeState, value: any) => {
    onStateChange({ ...state, [key]: value })
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'high': return '#f97316'
      case 'critical': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const simulateTargetLock = () => {
    if (!state.targetLocked) {
      updateState('targetLocked', true)
      updateState('targetDistance', Math.floor(Math.random() * 1000) + 100)
      updateState('targetBearing', Math.floor(Math.random() * 360))
    } else {
      updateState('targetLocked', false)
      updateState('targetDistance', null)
      updateState('targetBearing', null)
    }
  }

  return (
    <div className={`pursuit-mode-container ${className}`}>
      {/* Header */}
      <div className="pursuit-header">
        <div className="mode-indicator">
          <div className={`status-light ${state.isActive ? 'active' : 'inactive'}`} />
          <h2 className="mode-title">PURSUIT MODE</h2>
        </div>
        <button
          onClick={() => updateState('isActive', !state.isActive)}
          className={`activation-button ${state.isActive ? 'active' : 'inactive'}`}
          aria-pressed={state.isActive}
          aria-label={`${state.isActive ? 'Deactivate' : 'Activate'} pursuit mode`}
        >
          {state.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
        </button>
      </div>

      {state.isActive && (
        <>
          {/* Radar Display */}
          <div className="radar-section">
            <canvas
              ref={canvasRef}
              width={300}
              height={200}
              className="radar-canvas"
              aria-label="Radar display showing scan area and targets"
            />
            
            {/* Radar Controls */}
            <div className="radar-controls">
              <div className="scan-mode-selector">
                <label className="control-label">SCAN MODE</label>
                <select
                  value={state.scanMode}
                  onChange={(e) => updateState('scanMode', e.target.value)}
                  className="scan-select"
                  aria-label="Scan mode selection"
                >
                  <option value="passive">PASSIVE</option>
                  <option value="active">ACTIVE</option>
                  <option value="pursuit">PURSUIT</option>
                </select>
              </div>

              <button
                onClick={simulateTargetLock}
                className={`target-lock-button ${state.targetLocked ? 'locked' : 'unlocked'}`}
                aria-pressed={state.targetLocked}
                aria-label={`${state.targetLocked ? 'Release' : 'Acquire'} target lock`}
              >
                {state.targetLocked ? 'RELEASE TARGET' : 'ACQUIRE TARGET'}
              </button>
            </div>
          </div>

          {/* Status Panel */}
          <div className="status-panel">
            <div className="status-grid">
              {/* Threat Level */}
              <div className="status-item threat-level">
                <label className="status-label">THREAT LEVEL</label>
                <select
                  value={state.threat_level}
                  onChange={(e) => updateState('threat_level', e.target.value)}
                  className="threat-select"
                  style={{ color: getThreatLevelColor(state.threat_level) }}
                  aria-label="Threat level"
                >
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                  <option value="critical">CRITICAL</option>
                </select>
                <div 
                  className="threat-indicator"
                  style={{ backgroundColor: getThreatLevelColor(state.threat_level) }}
                />
              </div>

              {/* Target Information */}
              <div className="status-item target-info">
                <label className="status-label">TARGET STATUS</label>
                <div className="target-data">
                  <div className="data-line">
                    <span>LOCK:</span>
                    <span className={state.targetLocked ? 'text-red-400' : 'text-gray-500'}>
                      {state.targetLocked ? 'ACQUIRED' : 'SCANNING'}
                    </span>
                  </div>
                  {state.targetDistance && (
                    <div className="data-line">
                      <span>RANGE:</span>
                      <span className="text-red-400">{state.targetDistance}m</span>
                    </div>
                  )}
                  {state.targetBearing !== null && (
                    <div className="data-line">
                      <span>BEARING:</span>
                      <span className="text-red-400">{state.targetBearing}°</span>
                    </div>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="status-item system-status">
                <label className="status-label">SYSTEMS</label>
                <div className="system-indicators">
                  <div className="indicator-item">
                    <span>RADAR:</span>
                    <div className="indicator-dot active" />
                  </div>
                  <div className="indicator-item">
                    <span>TRACK:</span>
                    <div className={`indicator-dot ${state.targetLocked ? 'active' : 'inactive'}`} />
                  </div>
                  <div className="indicator-item">
                    <span>COMMS:</span>
                    <div className="indicator-dot active" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Panel */}
          {(state.threat_level === 'high' || state.threat_level === 'critical') && (
            <div className={`alert-panel ${state.threat_level}`}>
              <div className="alert-content">
                <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="alert-text">
                  {state.threat_level === 'critical' ? 'CRITICAL THREAT DETECTED' : 'HIGH THREAT LEVEL'}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .pursuit-mode-container {
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
          border: 2px solid rgba(239, 68, 68, 0.5);
          border-radius: 15px;
          padding: 20px;
          font-family: monospace;
          color: #f3f4f6;
          position: relative;
          overflow: hidden;
        }

        .pursuit-mode-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(239, 68, 68, 0.8), 
            transparent
          );
          animation: scannerPulse 3s ease-in-out infinite;
        }

        .pursuit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .mode-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-light.active {
          background: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
          animation: pulse 2s infinite;
        }

        .status-light.inactive {
          background: #374151;
        }

        .mode-title {
          font-size: 18px;
          font-weight: bold;
          color: #ef4444;
          letter-spacing: 2px;
          margin: 0;
        }

        .activation-button {
          padding: 8px 16px;
          border: 2px solid #ef4444;
          border-radius: 8px;
          background: transparent;
          color: #ef4444;
          font-family: monospace;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .activation-button.active {
          background: rgba(239, 68, 68, 0.2);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
        }

        .activation-button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .radar-section {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .radar-canvas {
          background: radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(17, 24, 39, 0.9) 100%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          flex: 1;
        }

        .radar-controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
          min-width: 150px;
        }

        .scan-mode-selector {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .control-label {
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 1px;
        }

        .scan-select {
          background: rgba(31, 41, 55, 0.8);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 5px;
          color: #ef4444;
          padding: 8px;
          font-family: monospace;
          font-size: 12px;
        }

        .target-lock-button {
          padding: 12px;
          border: 2px solid #ef4444;
          border-radius: 8px;
          background: transparent;
          color: #ef4444;
          font-family: monospace;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .target-lock-button.locked {
          background: rgba(239, 68, 68, 0.3);
          animation: targetLocked 1s ease-in-out infinite;
        }

        .target-lock-button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .status-panel {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-label {
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 1px;
          font-weight: bold;
        }

        .threat-select {
          background: rgba(31, 41, 55, 0.8);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 5px;
          padding: 8px;
          font-family: monospace;
          font-size: 12px;
          font-weight: bold;
        }

        .threat-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .target-data {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .data-line {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }

        .data-line span:first-child {
          color: #9ca3af;
        }

        .system-indicators {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .indicator-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #9ca3af;
        }

        .indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .indicator-dot.active {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        .indicator-dot.inactive {
          background: #374151;
        }

        .alert-panel {
          background: rgba(220, 38, 38, 0.1);
          border: 2px solid rgba(220, 38, 38, 0.5);
          border-radius: 10px;
          padding: 15px;
          animation: alertPulse 1s ease-in-out infinite;
        }

        .alert-panel.critical {
          animation: criticalAlert 0.5s ease-in-out infinite;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
        }

        .alert-icon {
          width: 20px;
          height: 20px;
          color: #dc2626;
        }

        .alert-text {
          font-size: 14px;
          font-weight: bold;
          color: #dc2626;
          letter-spacing: 1px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes scannerPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes targetLocked {
          0%, 100% { 
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
          }
          50% { 
            box-shadow: 0 0 25px rgba(239, 68, 68, 0.8);
          }
        }

        @keyframes alertPulse {
          0%, 100% { 
            background: rgba(220, 38, 38, 0.1);
          }
          50% { 
            background: rgba(220, 38, 38, 0.2);
          }
        }

        @keyframes criticalAlert {
          0%, 100% { 
            border-color: rgba(220, 38, 38, 0.5);
          }
          50% { 
            border-color: rgba(220, 38, 38, 1);
          }
        }
      `}</style>
    </div>
  )
}