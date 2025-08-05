// KITT Interface Types
export interface AudioVisualization {
  frequencyData: number[]
  timeDomainData: number[]
  volume: number
  pitch: number
  isActive: boolean
}

export interface AnimationState {
  scannerActive: boolean
  pulseActive: boolean
  glowIntensity: number
  scannerSpeed: number
  voiceVisualizationActive: boolean
}

export interface SystemStatus {
  microphone: 'active' | 'inactive' | 'error'
  processor: 'idle' | 'processing' | 'error'
  connection: 'connected' | 'disconnected' | 'error'
  temperature: number
  batteryLevel: number
  systemLoad: number
}

export interface VoiceModulatorSettings {
  gain: number
  pitch: number
  reverb: number
  compressor: boolean
  noiseGate: boolean
  visualizationMode: 'bars' | 'wave' | 'spectrum' | 'circular'
  sensitivity: number
}

export interface PursuitModeState {
  isActive: boolean
  targetLocked: boolean
  threat_level: 'low' | 'medium' | 'high' | 'critical'
  scanMode: 'passive' | 'active' | 'pursuit'
  targetDistance: number | null
  targetBearing: number | null
}

export interface ControlPanelState {
  mode: 'normal' | 'pursuit' | 'stealth' | 'maintenance'
  primarySystems: boolean
  auxiliarySystems: boolean
  emergencyMode: boolean
  autoResponse: boolean
  voiceCommands: boolean
}

export interface KITTTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  borderColor: string
  glowColor: string
  textColor: string
  warningColor: string
  errorColor: string
  successColor: string
}

export interface AudioContext {
  context: AudioContext | null
  analyser: AnalyserNode | null
  microphone: MediaStreamAudioSourceNode | null
  processor: ScriptProcessorNode | null
  stream: MediaStream | null
}

export interface VoiceProcessingResult {
  transcript: string
  confidence: number
  processing_time: number
  audio_duration: number
  response?: string
  audio_response?: string
  error?: string
}

export interface KITTProps {
  onNewMessage: (message: any) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
  theme?: Partial<KITTTheme>
  className?: string
}

export interface AccessibilityFeatures {
  announceStatus: boolean
  keyboardNavigation: boolean
  highContrast: boolean
  screenReaderSupport: boolean
  voiceGuidance: boolean
}

export interface KITTScannerProps {
  active: boolean
  speed?: number
  color?: string
  intensity?: number
  direction?: 'left-to-right' | 'right-to-left' | 'bidirectional'
}

export interface AudioProcessorOptions {
  fftSize: number
  smoothingTimeConstant: number
  minDecibels: number
  maxDecibels: number
  sampleRate: number
}

export type VoiceVisualizationData = {
  bars: number[]
  wave: number[]
  spectrum: number[]
  peak: number
  average: number
  timestamp: number
}