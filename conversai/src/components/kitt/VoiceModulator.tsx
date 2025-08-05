'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { VoiceModulatorSettings, VoiceVisualizationData } from '@/types/kitt'
import { useAudioProcessor } from '@/hooks/useAudioProcessor'

interface VoiceModulatorProps {
  isActive: boolean
  settings: VoiceModulatorSettings
  onSettingsChange: (settings: VoiceModulatorSettings) => void
  className?: string
}

export function VoiceModulator({ 
  isActive, 
  settings, 
  onSettingsChange, 
  className = '' 
}: VoiceModulatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { visualizationData, startProcessing, stopProcessing } = useAudioProcessor({
    fftSize: 1024,
    smoothingTimeConstant: 0.85
  })

  // Start/stop processing based on active state
  useEffect(() => {
    if (isActive) {
      startProcessing()
    } else {
      stopProcessing()
    }
  }, [isActive, startProcessing, stopProcessing])

  // Render visualization on canvas
  useEffect(() => {
    if (!canvasRef.current || !isActive) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Set canvas styling
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    switch (settings.visualizationMode) {
      case 'bars':
        renderBars(ctx, visualizationData, width, height)
        break
      case 'wave':
        renderWave(ctx, visualizationData, width, height)
        break
      case 'spectrum':
        renderSpectrum(ctx, visualizationData, width, height)
        break
      case 'circular':
        renderCircular(ctx, visualizationData, width, height)
        break
    }
  }, [visualizationData, settings.visualizationMode, isActive])

  const renderBars = (ctx: CanvasRenderingContext2D, data: VoiceVisualizationData, width: number, height: number) => {
    const barWidth = width / data.bars.length
    const maxBarHeight = height * 0.8

    data.bars.forEach((value, index) => {
      const barHeight = value * maxBarHeight * settings.sensitivity
      const x = index * barWidth
      const y = height - barHeight

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, y)
      gradient.addColorStop(0, '#ef4444')
      gradient.addColorStop(0.5, '#f97316')
      gradient.addColorStop(1, '#eab308')

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth - 2, barHeight)

      // Add glow effect
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 10
      ctx.fillRect(x, y, barWidth - 2, barHeight)
      ctx.shadowBlur = 0
    })
  }

  const renderWave = (ctx: CanvasRenderingContext2D, data: VoiceVisualizationData, width: number, height: number) => {
    ctx.beginPath()
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 5

    const sliceWidth = width / data.wave.length
    let x = 0

    data.wave.forEach((value, index) => {
      const y = (value * height * settings.sensitivity) / 2 + height / 2
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      
      x += sliceWidth
    })

    ctx.stroke()
    ctx.shadowBlur = 0
  }

  const renderSpectrum = (ctx: CanvasRenderingContext2D, data: VoiceVisualizationData, width: number, height: number) => {
    const barWidth = width / data.spectrum.length

    data.spectrum.forEach((value, index) => {
      const intensity = value * settings.sensitivity
      const barHeight = intensity * height * 0.8
      const x = index * barWidth
      const y = height - barHeight

      // Color based on frequency
      const hue = (index / data.spectrum.length) * 60 // Red to yellow spectrum
      ctx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 30}%)`
      ctx.fillRect(x, y, barWidth - 1, barHeight)
    })
  }

  const renderCircular = (ctx: CanvasRenderingContext2D, data: VoiceVisualizationData, width: number, height: number) => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 4
    const barCount = data.bars.length

    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 10

    data.bars.forEach((value, index) => {
      const angle = (index / barCount) * Math.PI * 2
      const barLength = value * radius * settings.sensitivity
      
      const startX = centerX + Math.cos(angle) * radius
      const startY = centerY + Math.sin(angle) * radius
      const endX = centerX + Math.cos(angle) * (radius + barLength)
      const endY = centerY + Math.sin(angle) * (radius + barLength)

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    })

    ctx.shadowBlur = 0
  }

  const updateSetting = (key: keyof VoiceModulatorSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-red-500/30 overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="Voice Modulator Controls"
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
          <h3 className="text-lg font-mono text-red-400 tracking-wider">VOICE MODULATOR</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 font-mono">
            {settings.visualizationMode.toUpperCase()}
          </span>
          <svg 
            className={`w-5 h-5 text-red-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Visualization Canvas */}
      <div className="px-4 pb-4">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full h-24 bg-black rounded border border-red-900/50"
          aria-label="Voice visualization display"
        />
      </div>

      {/* Controls */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Visualization Mode */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">VISUALIZATION</label>
              <select
                value={settings.visualizationMode}
                onChange={(e) => updateSetting('visualizationMode', e.target.value)}
                className="w-full bg-gray-800 text-red-400 border border-red-500/30 rounded px-3 py-2 text-sm font-mono"
                aria-label="Visualization mode"
              >
                <option value="bars">BARS</option>
                <option value="wave">WAVEFORM</option>
                <option value="spectrum">SPECTRUM</option>
                <option value="circular">CIRCULAR</option>
              </select>
            </div>

            {/* Sensitivity */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                SENSITIVITY: {Math.round(settings.sensitivity * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.sensitivity}
                onChange={(e) => updateSetting('sensitivity', parseFloat(e.target.value))}
                className="w-full slider-red"
                aria-label="Sensitivity level"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Gain */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                GAIN: {Math.round(settings.gain * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.gain}
                onChange={(e) => updateSetting('gain', parseFloat(e.target.value))}
                className="w-full slider-red"
                aria-label="Audio gain"
              />
            </div>

            {/* Pitch */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                PITCH: {settings.pitch > 1 ? '+' : ''}{Math.round((settings.pitch - 1) * 100)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={settings.pitch}
                onChange={(e) => updateSetting('pitch', parseFloat(e.target.value))}
                className="w-full slider-red"
                aria-label="Pitch adjustment"
              />
            </div>

            {/* Reverb */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                REVERB: {Math.round(settings.reverb * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.reverb}
                onChange={(e) => updateSetting('reverb', parseFloat(e.target.value))}
                className="w-full slider-red"
                aria-label="Reverb level"
              />
            </div>
          </div>

          {/* Toggle Controls */}
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.compressor}
                onChange={(e) => updateSetting('compressor', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${
                settings.compressor ? 'bg-red-500' : 'bg-gray-600'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full mt-0.5 ml-0.5 transition-transform ${
                  settings.compressor ? 'translate-x-6' : ''
                }`} />
              </div>
              <span className="text-xs text-gray-400 font-mono">COMPRESSOR</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.noiseGate}
                onChange={(e) => updateSetting('noiseGate', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${
                settings.noiseGate ? 'bg-red-500' : 'bg-gray-600'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full mt-0.5 ml-0.5 transition-transform ${
                  settings.noiseGate ? 'translate-x-6' : ''
                }`} />
              </div>
              <span className="text-xs text-gray-400 font-mono">NOISE GATE</span>
            </label>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider-red {
          -webkit-appearance: none;
          background: #374151;
          outline: none;
          border-radius: 15px;
          height: 6px;
        }

        .slider-red::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }

        .slider-red::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
      `}</style>
    </div>
  )
}