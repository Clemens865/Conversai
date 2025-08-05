'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimationState } from '@/types/kitt'

interface AnimationConfig {
  scannerSpeed: number
  pulseSpeed: number
  glowIntensity: number
  autoTrigger: boolean
}

const DEFAULT_CONFIG: AnimationConfig = {
  scannerSpeed: 2000, // ms
  pulseSpeed: 1000, // ms
  glowIntensity: 0.8,
  autoTrigger: true
}

export function useAnimationState(config: Partial<AnimationConfig> = {}) {
  const [animationState, setAnimationState] = useState<AnimationState>({
    scannerActive: false,
    pulseActive: false,
    glowIntensity: DEFAULT_CONFIG.glowIntensity,
    scannerSpeed: DEFAULT_CONFIG.scannerSpeed,
    voiceVisualizationActive: false
  })

  const animationConfig = { ...DEFAULT_CONFIG, ...config }
  const animationTimers = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const animationFrames = useRef<{ [key: string]: number }>({})

  const activateScanner = useCallback((duration?: number) => {
    setAnimationState(prev => ({
      ...prev,
      scannerActive: true,
      scannerSpeed: animationConfig.scannerSpeed
    }))

    if (duration) {
      animationTimers.current.scanner = setTimeout(() => {
        setAnimationState(prev => ({ ...prev, scannerActive: false }))
      }, duration)
    }
  }, [animationConfig.scannerSpeed])

  const deactivateScanner = useCallback(() => {
    setAnimationState(prev => ({ ...prev, scannerActive: false }))
    if (animationTimers.current.scanner) {
      clearTimeout(animationTimers.current.scanner)
      delete animationTimers.current.scanner
    }
  }, [])

  const activatePulse = useCallback((duration?: number) => {
    setAnimationState(prev => ({ ...prev, pulseActive: true }))

    if (duration) {
      animationTimers.current.pulse = setTimeout(() => {
        setAnimationState(prev => ({ ...prev, pulseActive: false }))
      }, duration)
    }
  }, [])

  const deactivatePulse = useCallback(() => {
    setAnimationState(prev => ({ ...prev, pulseActive: false }))
    if (animationTimers.current.pulse) {
      clearTimeout(animationTimers.current.pulse)
      delete animationTimers.current.pulse
    }
  }, [])

  const setGlowIntensity = useCallback((intensity: number) => {
    const clampedIntensity = Math.max(0, Math.min(1, intensity))
    setAnimationState(prev => ({ ...prev, glowIntensity: clampedIntensity }))
  }, [])

  const activateVoiceVisualization = useCallback(() => {
    setAnimationState(prev => ({ ...prev, voiceVisualizationActive: true }))
  }, [])

  const deactivateVoiceVisualization = useCallback(() => {
    setAnimationState(prev => ({ ...prev, voiceVisualizationActive: false }))
  }, [])

  const activateAll = useCallback((duration?: number) => {
    activateScanner(duration)
    activatePulse(duration)
    activateVoiceVisualization()
    setGlowIntensity(1)
  }, [activateScanner, activatePulse, activateVoiceVisualization, setGlowIntensity])

  const deactivateAll = useCallback(() => {
    deactivateScanner()
    deactivatePulse()
    deactivateVoiceVisualization()
    setGlowIntensity(0.3)
  }, [deactivateScanner, deactivatePulse, deactivateVoiceVisualization, setGlowIntensity])

  const triggerSystemAlert = useCallback((alertType: 'warning' | 'error' | 'success' = 'warning') => {
    const sequences = {
      warning: [
        { glow: 1, scanner: true, pulse: true, duration: 500 },
        { glow: 0.3, scanner: false, pulse: false, duration: 200 },
        { glow: 1, scanner: true, pulse: true, duration: 500 }
      ],
      error: [
        { glow: 1, scanner: true, pulse: true, duration: 200 },
        { glow: 0, scanner: false, pulse: false, duration: 100 },
        { glow: 1, scanner: true, pulse: true, duration: 200 },
        { glow: 0, scanner: false, pulse: false, duration: 100 },
        { glow: 1, scanner: true, pulse: true, duration: 200 }
      ],
      success: [
        { glow: 0.5, scanner: false, pulse: true, duration: 1000 },
        { glow: 0.8, scanner: true, pulse: false, duration: 500 }
      ]
    }

    const sequence = sequences[alertType]
    let totalDelay = 0

    sequence.forEach((step, index) => {
      setTimeout(() => {
        setGlowIntensity(step.glow)
        if (step.scanner) activateScanner(step.duration)
        else deactivateScanner()
        if (step.pulse) activatePulse(step.duration)
        else deactivatePulse()
      }, totalDelay)
      totalDelay += step.duration
    })

    // Reset to normal state after sequence
    setTimeout(() => {
      setGlowIntensity(animationConfig.glowIntensity)
      deactivateScanner()
      deactivatePulse()
    }, totalDelay + 500)
  }, [activateScanner, deactivateScanner, activatePulse, deactivatePulse, setGlowIntensity, animationConfig.glowIntensity])

  const createBreathingEffect = useCallback((minIntensity = 0.3, maxIntensity = 0.8, duration = 3000) => {
    const startTime = Date.now()
    
    const breathe = () => {
      const elapsed = Date.now() - startTime
      const progress = (elapsed % duration) / duration
      const intensity = minIntensity + (maxIntensity - minIntensity) * 
        (Math.sin(progress * Math.PI * 2) + 1) / 2
      
      setGlowIntensity(intensity)
      
      animationFrames.current.breathing = requestAnimationFrame(breathe)
    }
    
    breathe()
    
    return () => {
      if (animationFrames.current.breathing) {
        cancelAnimationFrame(animationFrames.current.breathing)
        delete animationFrames.current.breathing
      }
    }
  }, [setGlowIntensity])

  const stopBreathingEffect = useCallback(() => {
    if (animationFrames.current.breathing) {
      cancelAnimationFrame(animationFrames.current.breathing)
      delete animationFrames.current.breathing
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      Object.values(animationTimers.current).forEach(timer => clearTimeout(timer))
      animationTimers.current = {}
      
      // Cancel all animation frames
      Object.values(animationFrames.current).forEach(frame => cancelAnimationFrame(frame))
      animationFrames.current = {}
    }
  }, [])

  return {
    animationState,
    activateScanner,
    deactivateScanner,
    activatePulse,
    deactivatePulse,
    setGlowIntensity,
    activateVoiceVisualization,
    deactivateVoiceVisualization,
    activateAll,
    deactivateAll,
    triggerSystemAlert,
    createBreathingEffect,
    stopBreathingEffect
  }
}