'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface AudioAnalysisConfig {
  fftSize?: number
  smoothingTimeConstant?: number
  frequencyBins?: number
  updateInterval?: number
}

interface AudioAnalysisData {
  audioLevel: number
  frequencyData: number[]
  dominantFrequency: number
  isActive: boolean
  energy: number
  spectralCentroid: number
}

export const useAudioFrequencyAnalysis = (config: AudioAnalysisConfig = {}) => {
  const {
    fftSize = 512,
    smoothingTimeConstant = 0.8,
    frequencyBins = 32,
    updateInterval = 50
  } = config

  const [analysisData, setAnalysisData] = useState<AudioAnalysisData>({
    audioLevel: 0,
    frequencyData: new Array(frequencyBins).fill(0),
    dominantFrequency: 0,
    isActive: false,
    energy: 0,
    spectralCentroid: 0
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  const startAnalysis = useCallback(async (stream: MediaStream) => {
    try {
      // Clean up existing analysis
      stopAnalysis()

      // Create audio context
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      sourceRef.current = source

      // Create analyser
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = smoothingTimeConstant
      analyser.minDecibels = -90
      analyser.maxDecibels = -10
      analyserRef.current = analyser

      // Connect source to analyser
      source.connect(analyser)

      // Create data array for frequency data
      const bufferLength = analyser.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)

      // Start analysis loop
      const analyze = () => {
        if (!analyserRef.current || !dataArrayRef.current) return

        // Get frequency data
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const frequencyArray = Array.from(dataArrayRef.current)

        // Calculate overall audio level (RMS)
        const rms = Math.sqrt(
          frequencyArray.reduce((sum, value) => sum + value * value, 0) / frequencyArray.length
        ) / 255

        // Create frequency bins for visualization
        const binSize = Math.floor(frequencyArray.length / frequencyBins)
        const frequencies: number[] = []
        
        for (let i = 0; i < frequencyBins; i++) {
          let sum = 0
          const startIndex = i * binSize
          const endIndex = Math.min(startIndex + binSize, frequencyArray.length)
          
          for (let j = startIndex; j < endIndex; j++) {
            sum += frequencyArray[j]
          }
          
          const average = sum / (endIndex - startIndex)
          frequencies.push(average / 255)
        }

        // Find dominant frequency
        const maxIndex = frequencyArray.indexOf(Math.max(...frequencyArray))
        const nyquist = (audioContextRef.current?.sampleRate || 44100) / 2
        const dominantFreq = (maxIndex / frequencyArray.length) * nyquist

        // Calculate energy (sum of all frequencies)
        const energy = frequencyArray.reduce((sum, value) => sum + value, 0) / (frequencyArray.length * 255)

        // Calculate spectral centroid (frequency center of mass)
        let weightedSum = 0
        let magnitudeSum = 0
        
        for (let i = 0; i < frequencyArray.length; i++) {
          const frequency = (i / frequencyArray.length) * nyquist
          const magnitude = frequencyArray[i]
          weightedSum += frequency * magnitude
          magnitudeSum += magnitude
        }
        
        const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0

        // Update state
        setAnalysisData({
          audioLevel: rms,
          frequencyData: frequencies,
          dominantFrequency: dominantFreq,
          isActive: true,
          energy,
          spectralCentroid
        })

        animationRef.current = requestAnimationFrame(analyze)
      }

      analyze()

      return true
    } catch (error) {
      console.error('Failed to start audio analysis:', error)
      return false
    }
  }, [fftSize, smoothingTimeConstant, frequencyBins])

  const stopAnalysis = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    dataArrayRef.current = null

    setAnalysisData({
      audioLevel: 0,
      frequencyData: new Array(frequencyBins).fill(0),
      dominantFrequency: 0,
      isActive: false,
      energy: 0,
      spectralCentroid: 0
    })
  }, [frequencyBins])

  // Enhanced analysis methods
  const getFrequencyBand = useCallback((lowFreq: number, highFreq: number): number => {
    if (!analyserRef.current || !dataArrayRef.current) return 0

    const nyquist = (audioContextRef.current?.sampleRate || 44100) / 2
    const lowIndex = Math.floor((lowFreq / nyquist) * dataArrayRef.current.length)
    const highIndex = Math.floor((highFreq / nyquist) * dataArrayRef.current.length)
    
    let sum = 0
    for (let i = lowIndex; i <= highIndex; i++) {
      sum += dataArrayRef.current[i] || 0
    }
    
    return (sum / (highIndex - lowIndex + 1)) / 255
  }, [])

  const getBassLevel = useCallback(() => getFrequencyBand(20, 250), [getFrequencyBand])
  const getMidLevel = useCallback(() => getFrequencyBand(250, 4000), [getFrequencyBand])
  const getTrebleLevel = useCallback(() => getFrequencyBand(4000, 20000), [getFrequencyBand])

  const getVoiceFrequencies = useCallback(() => getFrequencyBand(85, 3400), [getFrequencyBand])

  // Detect audio features
  const detectOnset = useCallback((): boolean => {
    const currentEnergy = analysisData.energy
    const energyThreshold = 0.3
    const previousEnergy = useRef(0)
    
    const isOnset = currentEnergy > energyThreshold && 
                   currentEnergy > previousEnergy.current * 1.5
    
    previousEnergy.current = currentEnergy
    return isOnset
  }, [analysisData.energy])

  const detectSilence = useCallback((): boolean => {
    return analysisData.audioLevel < 0.01 && analysisData.energy < 0.05
  }, [analysisData.audioLevel, analysisData.energy])

  // Beat detection (simplified)
  const detectBeat = useCallback((): boolean => {
    const bassLevel = getBassLevel()
    const beatThreshold = 0.4
    const previousBass = useRef(0)
    
    const isBeat = bassLevel > beatThreshold && 
                  bassLevel > previousBass.current * 1.3
    
    previousBass.current = bassLevel
    return isBeat
  }, [getBassLevel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis()
    }
  }, [stopAnalysis])

  return {
    analysisData,
    startAnalysis,
    stopAnalysis,
    getFrequencyBand,
    getBassLevel,
    getMidLevel,
    getTrebleLevel,
    getVoiceFrequencies,
    detectOnset,
    detectSilence,
    detectBeat,
    isSupported: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
  }
}