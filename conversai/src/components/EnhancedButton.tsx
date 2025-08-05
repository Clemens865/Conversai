'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { gpuOptimizations } from '@/lib/animationUtils'

interface RippleEffect {
  x: number
  y: number
  size: number
  id: number
}

interface EnhancedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'neural'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  hapticFeedback?: boolean
  morphOnHover?: boolean
  glowEffect?: boolean
  rippleEffect?: boolean
  pulseOnActive?: boolean
  loadingState?: boolean
  iconMorphing?: boolean
  soundEffect?: boolean
}

export default function EnhancedButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  hapticFeedback = true,
  morphOnHover = true,
  glowEffect = true,
  rippleEffect = true,
  pulseOnActive = false,
  loadingState = false,
  iconMorphing = false,
  soundEffect = false
}: EnhancedButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [ripples, setRipples] = useState<RippleEffect[]>([])
  
  const buttonRef = useRef<HTMLButtonElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const rippleTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map())

  // Initialize audio context for sound effects
  useEffect(() => {
    if (soundEffect && typeof AudioContext !== 'undefined') {
      audioContextRef.current = new AudioContext()
    }

    // Enable GPU acceleration
    if (buttonRef.current) {
      gpuOptimizations.enableGPUAcceleration(buttonRef.current)
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      // Clear all ripple timeouts
      rippleTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [soundEffect])

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !navigator.vibrate) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    }

    navigator.vibrate(patterns[intensity])
  }, [hapticFeedback])

  // Sound effect function
  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
    if (!soundEffect || !audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000)

    oscillator.start()
    oscillator.stop(audioContextRef.current.currentTime + duration / 1000)
  }, [soundEffect])

  // Ripple effect function
  const createRipple = useCallback((event: React.MouseEvent) => {
    if (!rippleEffect || !buttonRef.current) return

    const button = buttonRef.current
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const ripple: RippleEffect = {
      x,
      y,
      size,
      id: Date.now()
    }

    setRipples(prev => [...prev, ripple])

    // Remove ripple after animation
    const timeout = setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id))
      rippleTimeoutRef.current.delete(ripple.id)
    }, 600)

    rippleTimeoutRef.current.set(ripple.id, timeout)
  }, [rippleEffect])

  // Button event handlers
  const handleMouseEnter = useCallback(() => {
    if (disabled) return
    setIsHovered(true)
    triggerHapticFeedback('light')
    playSound(800, 50, 'sine')
  }, [disabled, triggerHapticFeedback, playSound])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setIsPressed(false)
  }, [])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return
    setIsPressed(true)
    createRipple(event)
    triggerHapticFeedback('medium')
    playSound(1000, 100, 'triangle')
  }, [disabled, createRipple, triggerHapticFeedback, playSound])

  const handleMouseUp = useCallback(() => {
    setIsPressed(false)
  }, [])

  const handleClick = useCallback(() => {
    if (disabled || loadingState) return
    
    setIsActive(true)
    triggerHapticFeedback('heavy')
    playSound(1200, 150, 'square')
    
    setTimeout(() => setIsActive(false), 200)
    
    if (onClick) {
      onClick()
    }
  }, [disabled, loadingState, onClick, triggerHapticFeedback, playSound])

  // Variant styles
  const variantStyles = {
    primary: {
      base: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500',
      hover: 'from-blue-500 to-blue-600',
      active: 'from-blue-700 to-blue-800',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      ripple: 'bg-blue-400'
    },
    secondary: {
      base: 'bg-gradient-to-br from-gray-600 to-gray-700 text-white border-gray-500',
      hover: 'from-gray-500 to-gray-600',
      active: 'from-gray-700 to-gray-800',
      glow: 'shadow-[0_0_20px_rgba(107,114,128,0.5)]',
      ripple: 'bg-gray-400'
    },
    danger: {
      base: 'bg-gradient-to-br from-red-600 to-red-700 text-white border-red-500',
      hover: 'from-red-500 to-red-600',
      active: 'from-red-700 to-red-800',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
      ripple: 'bg-red-400'
    },
    success: {
      base: 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-500',
      hover: 'from-green-500 to-green-600',
      active: 'from-green-700 to-green-800',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
      ripple: 'bg-green-400'
    },
    neural: {
      base: 'bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 text-white border-purple-500',
      hover: 'from-purple-500 via-pink-500 to-red-500',
      active: 'from-purple-700 via-pink-700 to-red-700',
      glow: 'shadow-[0_0_25px_rgba(168,85,247,0.6)]',
      ripple: 'bg-purple-400'
    }
  }

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  }

  const currentVariant = variantStyles[variant]
  const currentSize = sizeStyles[size]

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled || loadingState}
      className={`
        relative overflow-hidden rounded-lg border-2 font-medium
        transition-all duration-300 ease-out
        ${currentSize}
        ${currentVariant.base}
        ${isHovered && !disabled ? currentVariant.hover : ''}
        ${isPressed && !disabled ? currentVariant.active : ''}
        ${glowEffect && isHovered && !disabled ? currentVariant.glow : ''}
        ${morphOnHover && isHovered && !disabled ? 'scale-105 rotate-1' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
        ${loadingState ? 'animate-pulse' : ''}
        ${pulseOnActive && isActive ? 'animate-bounce' : ''}
        ${className}
      `}
      style={{
        transform: `
          ${morphOnHover && isHovered && !disabled ? 'scale(1.05) rotate(1deg)' : 'scale(1) rotate(0deg)'}
          ${isPressed && !disabled ? 'scale(0.95)' : ''}
        `,
        boxShadow: `
          ${glowEffect && isHovered && !disabled ? `0 0 30px ${currentVariant.glow.match(/rgba\([^)]+\)/)?.[0] || 'rgba(0,0,0,0.5)'}` : ''}
          ${isActive ? ', inset 0 0 20px rgba(255,255,255,0.2)' : ''}
        `
      }}
    >
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className={`
            absolute rounded-full opacity-75 animate-ping pointer-events-none
            ${currentVariant.ripple}
          `}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '0.6s'
          }}
        />
      ))}

      {/* Loading spinner overlay */}
      {loadingState && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Shimmer effect on hover */}
      {isHovered && !disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse" />
      )}

      {/* Button content */}
      <span 
        className={`
          relative z-10 flex items-center justify-center space-x-2
          ${iconMorphing && isHovered ? 'transform rotate-12 scale-110' : ''}
          transition-transform duration-300
        `}
      >
        {children}
      </span>

      {/* Glow effect overlay */}
      {glowEffect && (isHovered || isActive) && !disabled && (
        <div 
          className="absolute inset-0 rounded-lg opacity-50 blur-md pointer-events-none"
          style={{
            background: `linear-gradient(45deg, ${currentVariant.base.match(/from-[\w-]+/)?.[0]?.replace('from-', '') || 'blue-500'}, ${currentVariant.base.match(/to-[\w-]+/)?.[0]?.replace('to-', '') || 'blue-600'})`
          }}
        />
      )}
    </button>
  )
}