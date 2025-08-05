'use client'

import React, { useState, useEffect } from 'react'
import { SystemStatus } from '@/types/kitt'

interface StatusIndicatorsProps {
  status: SystemStatus
  className?: string
}

export function StatusIndicators({ status, className = '' }: StatusIndicatorsProps) {
  const [animationState, setAnimationState] = useState({
    cpuBars: new Array(8).fill(0),
    memoryUsage: 0,
    networkActivity: false
  })

  // Simulate CPU activity
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationState(prev => ({
        ...prev,
        cpuBars: prev.cpuBars.map(() => Math.random() * status.systemLoad),
        memoryUsage: 0.3 + Math.random() * 0.4,
        networkActivity: Math.random() > 0.7
      }))
    }, 500)

    return () => clearInterval(interval)
  }, [status.systemLoad])

  const getStatusColor = (statusType: string) => {
    switch (statusType) {
      case 'active':
      case 'connected':
        return '#10b981' // green
      case 'processing':
        return '#f59e0b' // yellow
      case 'inactive':
      case 'disconnected':
        return '#6b7280' // gray
      case 'error':
        return '#ef4444' // red
      default:
        return '#6b7280'
    }
  }

  const getTemperatureColor = (temp: number) => {
    if (temp < 30) return '#10b981'
    if (temp < 50) return '#f59e0b'
    if (temp < 70) return '#f97316'
    return '#ef4444'
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return '#10b981'
    if (level > 20) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className={`status-container ${className}`}>
      {/* Main Status Grid */}
      <div className="status-grid">
        {/* Microphone Status */}
        <div className="status-module microphone">
          <div className="module-header">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
              <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
            </svg>
            <span className="module-title">MIC</span>
          </div>
          <div className="status-indicator-container">
            <div 
              className="status-dot"
              style={{ backgroundColor: getStatusColor(status.microphone) }}
            />
            <span className="status-text">
              {status.microphone.toUpperCase()}
            </span>
          </div>
          {status.microphone === 'active' && (
            <div className="audio-levels">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="audio-bar"
                  style={{
                    height: `${Math.random() * 100}%`,
                    backgroundColor: '#10b981',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Processor Status */}
        <div className="status-module processor">
          <div className="module-header">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <span className="module-title">CPU</span>
          </div>
          <div className="status-indicator-container">
            <div 
              className="status-dot"
              style={{ backgroundColor: getStatusColor(status.processor) }}
            />
            <span className="status-text">
              {status.processor.toUpperCase()}
            </span>
          </div>
          <div className="cpu-usage">
            <div className="cpu-bars">
              {animationState.cpuBars.map((height, i) => (
                <div
                  key={i}
                  className="cpu-bar"
                  style={{
                    height: `${height * 100}%`,
                    backgroundColor: height > 0.7 ? '#ef4444' : height > 0.4 ? '#f59e0b' : '#10b981'
                  }}
                />
              ))}
            </div>
            <span className="usage-percentage">
              {Math.round(status.systemLoad * 100)}%
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="status-module connection">
          <div className="module-header">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <span className="module-title">LINK</span>
          </div>
          <div className="status-indicator-container">
            <div 
              className="status-dot"
              style={{ backgroundColor: getStatusColor(status.connection) }}
            />
            <span className="status-text">
              {status.connection.toUpperCase()}
            </span>
          </div>
          {status.connection === 'connected' && (
            <div className="network-activity">
              <div className="signal-bars">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`signal-bar ${animationState.networkActivity ? 'active' : ''}`}
                    style={{
                      height: `${(i + 1) * 25}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Temperature Status */}
        <div className="status-module temperature">
          <div className="module-header">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v8a6 6 0 1012 0V6a4 4 0 00-4-4z" clipRule="evenodd" />
            </svg>
            <span className="module-title">TEMP</span>
          </div>
          <div className="temp-display">
            <span 
              className="temp-value"
              style={{ color: getTemperatureColor(status.temperature) }}
            >
              {status.temperature}°C
            </span>
            <div className="temp-bar">
              <div 
                className="temp-fill"
                style={{ 
                  height: `${Math.min(status.temperature, 100)}%`,
                  backgroundColor: getTemperatureColor(status.temperature)
                }}
              />
            </div>
          </div>
        </div>

        {/* Battery Status */}
        <div className="status-module battery">
          <div className="module-header">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 6a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V6zM5 8v4h10V8H5z" />
            </svg>
            <span className="module-title">POWER</span>
          </div>
          <div className="battery-display">
            <span 
              className="battery-value"
              style={{ color: getBatteryColor(status.batteryLevel) }}
            >
              {status.batteryLevel}%
            </span>
            <div className="battery-icon">
              <div className="battery-body">
                <div 
                  className="battery-fill"
                  style={{ 
                    width: `${status.batteryLevel}%`,
                    backgroundColor: getBatteryColor(status.batteryLevel)
                  }}
                />
              </div>
              <div className="battery-tip" />
            </div>
          </div>
        </div>

        {/* Memory Status */}
        <div className="status-module memory">
          <div className="module-header">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <span className="module-title">MEM</span>
          </div>
          <div className="memory-display">
            <span className="memory-value">
              {Math.round(animationState.memoryUsage * 100)}%
            </span>
            <div className="memory-bar">
              <div 
                className="memory-fill"
                style={{ 
                  width: `${animationState.memoryUsage * 100}%`,
                  backgroundColor: animationState.memoryUsage > 0.8 ? '#ef4444' : '#10b981'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .status-container {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 15px;
          backdrop-filter: blur(5px);
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 12px;
          height: 200px;
        }

        .status-module {
          background: rgba(31, 41, 55, 0.6);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .module-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: #9ca3af;
        }

        .module-title {
          font-family: monospace;
          font-size: 10px;
          letter-spacing: 1px;
          font-weight: bold;
        }

        .status-indicator-container {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-text {
          font-family: monospace;
          font-size: 8px;
          color: #6b7280;
          letter-spacing: 0.5px;
        }

        .audio-levels {
          display: flex;
          align-items: end;
          gap: 2px;
          height: 20px;
          margin-top: auto;
        }

        .audio-bar {
          width: 3px;
          background: #10b981;
          border-radius: 1px;
          animation: audioLevel 0.5s ease-in-out infinite alternate;
        }

        .cpu-usage {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }

        .cpu-bars {
          display: flex;
          align-items: end;
          gap: 1px;
          height: 16px;
          flex: 1;
        }

        .cpu-bar {
          width: 2px;
          background: #10b981;
          border-radius: 1px;
          transition: height 0.5s ease;
        }

        .usage-percentage {
          font-family: monospace;
          font-size: 8px;
          color: #9ca3af;
          min-width: 20px;
        }

        .network-activity {
          margin-top: auto;
        }

        .signal-bars {
          display: flex;
          align-items: end;
          gap: 2px;
          height: 16px;
        }

        .signal-bar {
          width: 3px;
          background: #6b7280;
          border-radius: 1px;
          transition: background-color 0.3s ease;
        }

        .signal-bar.active {
          background: #10b981;
          animation: signalPulse 1s ease-in-out infinite;
        }

        .temp-display {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }

        .temp-value {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          min-width: 30px;
        }

        .temp-bar {
          width: 4px;
          height: 30px;
          background: rgba(107, 114, 128, 0.3);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }

        .temp-fill {
          position: absolute;
          bottom: 0;
          width: 100%;
          border-radius: 2px;
          transition: height 0.5s ease;
        }

        .battery-display {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }

        .battery-value {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          min-width: 25px;
        }

        .battery-icon {
          display: flex;
          align-items: center;
          gap: 1px;
        }

        .battery-body {
          width: 20px;
          height: 10px;
          border: 1px solid #6b7280;
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }

        .battery-fill {
          height: 100%;
          border-radius: 1px;
          transition: width 0.5s ease;
        }

        .battery-tip {
          width: 2px;
          height: 6px;
          background: #6b7280;
          border-radius: 0 1px 1px 0;
        }

        .memory-display {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }

        .memory-value {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          color: #9ca3af;
          min-width: 25px;
        }

        .memory-bar {
          flex: 1;
          height: 6px;
          background: rgba(107, 114, 128, 0.3);
          border-radius: 3px;
          position: relative;
          overflow: hidden;
        }

        .memory-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes audioLevel {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        @keyframes signalPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}