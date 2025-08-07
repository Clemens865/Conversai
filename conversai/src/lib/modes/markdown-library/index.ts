import { BaseMode } from '../base/BaseMode'
import { ModeFeatures, ModeConfig, ProcessResult } from '../types'
import { MarkdownLibraryVoice } from './voice'
import { MarkdownLibraryAI } from './ai'
import { MarkdownLibraryStorage } from './storage'

export class MarkdownLibraryMode extends BaseMode {
  id = 'markdown-library'
  name = 'Markdown Library (Beta)'
  description = 'Context-aware voice AI using markdown knowledge base. Stack: OpenAI Realtime API + Markdown Files'
  icon = '📚'
  badges = ['Realtime API', 'Full Context', 'Markdown-Based', 'Beta']
  
  features: ModeFeatures = {
    voice: true,
    text: true,
    memory: true,
    multimodal: false,
    proactive: true,
    privacy: 'local-first',
    offline: false
  }
  
  config: ModeConfig = {
    requiredEnvVars: ['NEXT_PUBLIC_OPENAI_API_KEY'],
    optionalEnvVars: [],
    estimatedCost: {
      perMinute: 0.30, // $0.06 input + $0.24 output for Realtime API
      setup: 0
    },
    latencyMs: {
      min: 300,
      max: 800,
      typical: 500
    }
  }
  
  voice = new MarkdownLibraryVoice()
  ai = new MarkdownLibraryAI()
  storage = new MarkdownLibraryStorage()
  
  protected async onInitialize(): Promise<void> {
    console.log('Initializing Markdown Library mode...')
    // Mode-specific initialization if needed
  }
  
  protected async onCleanup(): Promise<void> {
    console.log('Cleaning up Markdown Library mode...')
    // Mode-specific cleanup if needed
  }
  
  protected async onError(error: Error): Promise<void> {
    console.error('Markdown Library mode error:', error)
  }
}