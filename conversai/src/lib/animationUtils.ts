/**
 * Animation utilities for high-performance 60fps animations
 * Optimized for voice modulator interfaces
 */

// Performance monitoring
export class PerformanceMonitor {
  private frameCount = 0
  private lastTime = 0
  private fps = 60
  private fpsCallback?: (fps: number) => void

  constructor(fpsCallback?: (fps: number) => void) {
    this.fpsCallback = fpsCallback
  }

  update(currentTime: number) {
    this.frameCount++
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      this.frameCount = 0
      this.lastTime = currentTime
      
      if (this.fpsCallback) {
        this.fpsCallback(this.fps)
      }
    }
  }

  getFPS(): number {
    return this.fps
  }
}

// Easing functions for smooth animations
export const easing = {
  // Standard easing functions
  linear: (t: number): number => t,
  
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Bounce effects for voice interfaces
  easeOutBounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  },
  
  // Elastic effects for pursuit mode
  easeOutElastic: (t: number): number => {
    if (t === 0) return 0
    if (t === 1) return 1
    const p = 0.3
    const s = p / 4
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1
  }
}

// State transition manager for smooth state changes
export class StateTransitionManager {
  private currentState: string = 'idle'
  private targetState: string = 'idle'
  private transitionProgress: number = 1
  private transitionDuration: number = 500
  private transitionStartTime: number = 0
  private onTransitionUpdate?: (progress: number, fromState: string, toState: string) => void

  constructor(
    initialState: string = 'idle',
    transitionDuration: number = 500,
    onTransitionUpdate?: (progress: number, fromState: string, toState: string) => void
  ) {
    this.currentState = initialState
    this.targetState = initialState
    this.transitionDuration = transitionDuration
    this.onTransitionUpdate = onTransitionUpdate
  }

  transitionTo(newState: string, duration?: number): void {
    if (newState === this.targetState) return

    this.currentState = this.targetState
    this.targetState = newState
    this.transitionProgress = 0
    this.transitionStartTime = performance.now()
    
    if (duration !== undefined) {
      this.transitionDuration = duration
    }
  }

  update(currentTime: number): { isTransitioning: boolean; progress: number; currentState: string; targetState: string } {
    if (this.transitionProgress >= 1) {
      return {
        isTransitioning: false,
        progress: 1,
        currentState: this.targetState,
        targetState: this.targetState
      }
    }

    const elapsed = currentTime - this.transitionStartTime
    this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1)
    
    const easedProgress = easing.easeInOutCubic(this.transitionProgress)
    
    if (this.onTransitionUpdate) {
      this.onTransitionUpdate(easedProgress, this.currentState, this.targetState)
    }

    return {
      isTransitioning: true,
      progress: easedProgress,
      currentState: this.currentState,
      targetState: this.targetState
    }
  }

  getCurrentState(): string {
    return this.transitionProgress >= 1 ? this.targetState : this.currentState
  }

  isTransitioning(): boolean {
    return this.transitionProgress < 1
  }
}

// Audio-reactive animation controller
export class AudioReactiveAnimator {
  private audioData: number[] = []
  private sensitivity: number = 1
  private smoothing: number = 0.7
  private smoothedData: number[] = []

  constructor(sensitivity: number = 1, smoothing: number = 0.7) {
    this.sensitivity = sensitivity
    this.smoothing = smoothing
  }

  updateAudioData(audioData: number[]): void {
    this.audioData = [...audioData]
    
    // Apply smoothing
    if (this.smoothedData.length === 0) {
      this.smoothedData = [...audioData]
    } else {
      this.smoothedData = this.smoothedData.map((value, index) => {
        const target = audioData[index] || 0
        return value + (target - value) * (1 - this.smoothing)
      })
    }
  }

  getAnimationValue(index: number, baseValue: number = 0): number {
    if (index >= this.smoothedData.length) return baseValue
    
    const audioValue = this.smoothedData[index] || 0
    return baseValue + (audioValue * this.sensitivity)
  }

  getGlobalIntensity(): number {
    if (this.smoothedData.length === 0) return 0
    
    const average = this.smoothedData.reduce((sum, value) => sum + value, 0) / this.smoothedData.length
    return Math.min(average * this.sensitivity, 1)
  }

  getFrequencyBand(startPercent: number, endPercent: number): number {
    const startIndex = Math.floor(this.smoothedData.length * startPercent)
    const endIndex = Math.floor(this.smoothedData.length * endPercent)
    
    if (startIndex >= endIndex) return 0
    
    let sum = 0
    for (let i = startIndex; i < endIndex; i++) {
      sum += this.smoothedData[i] || 0
    }
    
    return (sum / (endIndex - startIndex)) * this.sensitivity
  }

  // Get bass, mid, treble levels
  getBass(): number { return this.getFrequencyBand(0, 0.2) }
  getMid(): number { return this.getFrequencyBand(0.2, 0.7) }
  getTreble(): number { return this.getFrequencyBand(0.7, 1) }
}

// Color animation utilities
export class ColorAnimator {
  static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360
    s /= 100
    l /= 100

    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const k = (n + h * 12) % 12
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    }

    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
  }

  static interpolateColor(
    color1: [number, number, number],
    color2: [number, number, number],
    t: number
  ): [number, number, number] {
    return [
      Math.round(color1[0] + (color2[0] - color1[0]) * t),
      Math.round(color1[1] + (color2[1] - color1[1]) * t),
      Math.round(color1[2] + (color2[2] - color1[2]) * t)
    ]
  }

  static getAudioReactiveColor(
    audioLevel: number,
    baseHue: number = 0,
    saturation: number = 100,
    baseLightness: number = 50
  ): string {
    const hue = (baseHue + audioLevel * 60) % 360
    const lightness = baseLightness + audioLevel * 30
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  static createColorPalette(baseHue: number, count: number = 5): string[] {
    const colors: string[] = []
    const hueStep = 360 / count
    
    for (let i = 0; i < count; i++) {
      const hue = (baseHue + i * hueStep) % 360
      colors.push(`hsl(${hue}, 100%, 50%)`)
    }
    
    return colors
  }
}

// Particle system utilities
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

export class ParticlePool {
  private particles: Particle[] = []
  private activeParticles: Particle[] = []
  private poolSize: number

  constructor(poolSize: number = 100) {
    this.poolSize = poolSize
    this.initializePool()
  }

  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.particles.push(this.createParticle())
    }
  }

  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 60,
      size: 2,
      color: '#ff0000',
      alpha: 1
    }
  }

  spawn(x: number, y: number, config: Partial<Particle> = {}): Particle | null {
    let particle = this.particles.pop()
    
    if (!particle) {
      // Pool exhausted, create new particle
      particle = this.createParticle()
    }

    Object.assign(particle, {
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 60 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      color: '#ff4444',
      alpha: 1,
      ...config
    })

    this.activeParticles.push(particle)
    return particle
  }

  update(): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i]
      
      // Update position
      particle.x += particle.vx
      particle.y += particle.vy
      
      // Update life
      particle.life -= 1 / particle.maxLife
      particle.alpha = particle.life
      
      // Add gravity
      particle.vy += 0.1
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.activeParticles.splice(i, 1)
        this.particles.push(particle) // Return to pool
      }
    }
  }

  getActiveParticles(): Particle[] {
    return this.activeParticles
  }

  clear(): void {
    this.particles.push(...this.activeParticles)
    this.activeParticles = []
  }
}

// Hardware acceleration utilities
export const gpuOptimizations = {
  // Force hardware acceleration on element
  enableGPUAcceleration: (element: HTMLElement): void => {
    element.style.transform = 'translateZ(0)'
    element.style.backfaceVisibility = 'hidden'
    element.style.perspective = '1000px'
    element.style.willChange = 'transform, opacity'
  },

  // Disable hardware acceleration
  disableGPUAcceleration: (element: HTMLElement): void => {
    element.style.transform = ''
    element.style.backfaceVisibility = ''
    element.style.perspective = ''
    element.style.willChange = ''
  },

  // Check if hardware acceleration is supported
  isGPUAccelerationSupported: (): boolean => {
    const testElement = document.createElement('div')
    testElement.style.transform = 'translateZ(0)'
    return testElement.style.transform !== ''
  }
}

// Animation frame manager for performance
export class AnimationFrameManager {
  private callbacks: Map<string, (deltaTime: number) => void> = new Map()
  private isRunning: boolean = false
  private lastTime: number = 0
  private animationId: number | null = null

  add(id: string, callback: (deltaTime: number) => void): void {
    this.callbacks.set(id, callback)
    
    if (!this.isRunning) {
      this.start()
    }
  }

  remove(id: string): void {
    this.callbacks.delete(id)
    
    if (this.callbacks.size === 0) {
      this.stop()
    }
  }

  private start(): void {
    this.isRunning = true
    this.lastTime = performance.now()
    this.animate()
  }

  private stop(): void {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private animate = (currentTime: number = performance.now()): void => {
    if (!this.isRunning) return

    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Call all registered callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(deltaTime)
      } catch (error) {
        console.error('Animation callback error:', error)
      }
    })

    this.animationId = requestAnimationFrame(this.animate)
  }
}

// Global animation frame manager instance
export const globalAnimationManager = new AnimationFrameManager()