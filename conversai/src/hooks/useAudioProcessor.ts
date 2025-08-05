'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioContext, AudioVisualization, AudioProcessorOptions, VoiceVisualizationData } from '@/types/kitt'

const DEFAULT_OPTIONS: AudioProcessorOptions = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  sampleRate: 44100
}

export function useAudioProcessor(options: Partial<AudioProcessorOptions> = {}) {
  const [audioContext, setAudioContext] = useState<AudioContext>({
    context: null,
    analyser: null,
    microphone: null,
    processor: null,
    stream: null
  })
  
  const [visualization, setVisualization] = useState<AudioVisualization>({
    frequencyData: [],
    timeDomainData: [],
    volume: 0,
    pitch: 0,
    isActive: false
  })

  const [visualizationData, setVisualizationData] = useState<VoiceVisualizationData>({
    bars: new Array(20).fill(0),
    wave: new Array(256).fill(0),
    spectrum: new Array(128).fill(0),
    peak: 0,
    average: 0,
    timestamp: 0
  })

  const animationFrameRef = useRef<number | null>(null)
  const processingOptions = { ...DEFAULT_OPTIONS, ...options }

  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = context.createAnalyser()
      const microphone = context.createMediaStreamSource(stream)
      
      analyser.fftSize = processingOptions.fftSize
      analyser.smoothingTimeConstant = processingOptions.smoothingTimeConstant
      analyser.minDecibels = processingOptions.minDecibels
      analyser.maxDecibels = processingOptions.maxDecibels
      
      microphone.connect(analyser)
      
      setAudioContext({
        context,
        analyser,
        microphone,
        processor: null,
        stream
      })
      
      return { context, analyser, microphone, stream }
    } catch (error) {
      console.error('Error initializing audio context:', error)
      throw error
    }
  }, [processingOptions])

  const processAudioData = useCallback(() => {
    if (!audioContext.analyser) return

    const bufferLength = audioContext.analyser.frequencyBinCount
    const frequencyData = new Uint8Array(bufferLength)
    const timeDomainData = new Uint8Array(bufferLength)
    
    audioContext.analyser.getByteFrequencyData(frequencyData)
    audioContext.analyser.getByteTimeDomainData(timeDomainData)
    
    // Calculate volume (RMS)
    let sum = 0
    for (let i = 0; i < timeDomainData.length; i++) {
      const amplitude = (timeDomainData[i] - 128) / 128
      sum += amplitude * amplitude
    }
    const volume = Math.sqrt(sum / timeDomainData.length)
    
    // Calculate pitch using autocorrelation
    const pitch = calculatePitch(timeDomainData, processingOptions.sampleRate)
    
    // Generate visualization data
    const bars = generateBarData(frequencyData, 20)
    const wave = Array.from(timeDomainData).map(value => (value - 128) / 128)
    const spectrum = Array.from(frequencyData).slice(0, 128).map(value => value / 255)
    const peak = Math.max(...frequencyData) / 255
    const average = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255
    
    setVisualization({
      frequencyData: Array.from(frequencyData),
      timeDomainData: Array.from(timeDomainData),
      volume,
      pitch,
      isActive: volume > 0.01
    })
    
    setVisualizationData({
      bars,
      wave,
      spectrum,
      peak,
      average,
      timestamp: Date.now()
    })
    
    animationFrameRef.current = requestAnimationFrame(processAudioData)
  }, [audioContext.analyser, processingOptions.sampleRate])

  const generateBarData = (frequencyData: Uint8Array, barCount: number): number[] => {
    const bars = new Array(barCount).fill(0)
    const binSize = Math.floor(frequencyData.length / barCount)
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0
      for (let j = 0; j < binSize; j++) {
        sum += frequencyData[i * binSize + j]
      }
      bars[i] = (sum / binSize) / 255
    }
    
    return bars
  }

  const calculatePitch = (timeDomainData: Uint8Array, sampleRate: number): number => {
    // Simple autocorrelation for pitch detection
    const correlations: number[] = []
    const dataLength = timeDomainData.length
    
    for (let lag = 1; lag < dataLength / 2; lag++) {
      let correlation = 0
      for (let i = 0; i < dataLength - lag; i++) {
        correlation += timeDomainData[i] * timeDomainData[i + lag]
      }
      correlations[lag] = correlation
    }
    
    // Find the lag with maximum correlation
    let maxCorrelation = 0
    let bestLag = 0
    
    for (let i = 1; i < correlations.length; i++) {
      if (correlations[i] > maxCorrelation) {
        maxCorrelation = correlations[i]
        bestLag = i
      }
    }
    
    return bestLag > 0 ? sampleRate / bestLag : 0
  }

  const startProcessing = useCallback(async () => {
    if (!audioContext.analyser) {
      await initializeAudioContext()
    }
    processAudioData()
  }, [audioContext.analyser, initializeAudioContext, processAudioData])

  const stopProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (audioContext.stream) {
      audioContext.stream.getTracks().forEach(track => track.stop())
    }
    
    if (audioContext.context) {
      audioContext.context.close()
    }
    
    setAudioContext({
      context: null,
      analyser: null,
      microphone: null,
      processor: null,
      stream: null
    })
    
    setVisualization({
      frequencyData: [],
      timeDomainData: [],
      volume: 0,
      pitch: 0,
      isActive: false
    })
  }, [audioContext])

  useEffect(() => {
    return () => {
      stopProcessing()
    }
  }, [stopProcessing])

  return {
    audioContext,
    visualization,
    visualizationData,
    initializeAudioContext,
    startProcessing,
    stopProcessing,
    isProcessing: !!animationFrameRef.current
  }
}