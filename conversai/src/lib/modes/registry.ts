import { ConversationMode, ModeFactory, ModeRegistryEntry } from './types';

class ModeRegistry {
  private modes: Map<string, ModeRegistryEntry> = new Map();
  private factories: Map<string, ModeFactory> = new Map();
  private currentModeId: string | null = null;
  private listeners: Set<(modeId: string) => void> = new Set();

  /**
   * Register a mode factory (lazy loading)
   */
  registerFactory(modeId: string, factory: ModeFactory, loadPriority: number = 0) {
    this.factories.set(modeId, factory);
    console.log(`Registered mode factory: ${modeId}`);
  }

  /**
   * Register a mode instance (eager loading)
   */
  registerMode(mode: ConversationMode, loadPriority: number = 0) {
    this.modes.set(mode.id, {
      mode,
      isActive: false,
      loadPriority
    });
    console.log(`Registered mode: ${mode.name}`);
  }

  /**
   * Get a mode by ID, loading it if necessary
   */
  async getMode(modeId: string): Promise<ConversationMode | null> {
    // Check if already loaded
    const entry = this.modes.get(modeId);
    if (entry) {
      return entry.mode;
    }

    // Check if factory exists
    const factory = this.factories.get(modeId);
    if (factory) {
      console.log(`Loading mode: ${modeId}`);
      const mode = await factory();
      this.registerMode(mode);
      return mode;
    }

    console.error(`Mode not found: ${modeId}`);
    return null;
  }

  /**
   * Get all available mode IDs
   */
  getAvailableModeIds(): string[] {
    const loadedIds = Array.from(this.modes.keys());
    const factoryIds = Array.from(this.factories.keys());
    return [...new Set([...loadedIds, ...factoryIds])];
  }

  /**
   * Get all loaded modes
   */
  getLoadedModes(): ConversationMode[] {
    return Array.from(this.modes.values())
      .sort((a, b) => b.loadPriority - a.loadPriority)
      .map(entry => entry.mode);
  }

  /**
   * Switch to a different mode
   */
  async switchMode(modeId: string): Promise<boolean> {
    console.log(`Switching to mode: ${modeId}`);

    // Get the new mode
    const newMode = await this.getMode(modeId);
    if (!newMode) {
      console.error(`Cannot switch to mode: ${modeId} - not found`);
      return false;
    }

    // Cleanup current mode
    if (this.currentModeId) {
      const currentEntry = this.modes.get(this.currentModeId);
      if (currentEntry) {
        await currentEntry.mode.cleanup();
        currentEntry.isActive = false;
      }
    }

    // Initialize new mode
    await newMode.initialize();
    const newEntry = this.modes.get(modeId)!;
    newEntry.isActive = true;
    this.currentModeId = modeId;

    // Notify listeners
    this.notifyListeners(modeId);

    console.log(`Switched to mode: ${newMode.name}`);
    return true;
  }

  /**
   * Get the current active mode
   */
  getCurrentMode(): ConversationMode | null {
    if (!this.currentModeId) return null;
    const entry = this.modes.get(this.currentModeId);
    return entry?.mode || null;
  }

  /**
   * Get the current mode ID
   */
  getCurrentModeId(): string | null {
    return this.currentModeId;
  }

  /**
   * Add a mode change listener
   */
  addModeChangeListener(listener: (modeId: string) => void) {
    this.listeners.add(listener);
  }

  /**
   * Remove a mode change listener
   */
  removeModeChangeListener(listener: (modeId: string) => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners(modeId: string) {
    this.listeners.forEach(listener => {
      try {
        listener(modeId);
      } catch (error) {
        console.error('Error in mode change listener:', error);
      }
    });
  }

  /**
   * Get mode metadata for UI display
   */
  async getModeMetadata(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    features: any;
    badges: string[];
    isActive: boolean;
    isLoaded: boolean;
  }>> {
    const metadata = [];

    // Get all mode IDs
    const allModeIds = this.getAvailableModeIds();

    for (const modeId of allModeIds) {
      const entry = this.modes.get(modeId);
      
      if (entry) {
        // Mode is loaded
        metadata.push({
          id: entry.mode.id,
          name: entry.mode.name,
          description: entry.mode.description,
          icon: entry.mode.icon,
          features: entry.mode.features,
          badges: entry.mode.badges,
          isActive: entry.isActive,
          isLoaded: true
        });
      } else {
        // Mode is not loaded, but we know it exists
        // Provide better metadata for known modes
        let modeInfo = {
          id: modeId,
          name: 'Unknown Mode',
          description: 'Click to load this mode',
          icon: '⚡',
          features: {},
          badges: ['Not Loaded'],
          isActive: false,
          isLoaded: false
        };
        
        // Add metadata for known modes
        if (modeId === 'memory-hierarchical') {
          modeInfo = {
            ...modeInfo,
            name: 'Memory Mode (Cloud-Based)',
            description: 'Premium voice quality with advanced vector memory. Stack: Deepgram + ElevenLabs + GPT-4 + Supabase',
            icon: '🧠',
            badges: ['Premium Voice', 'Vector Memory', 'Cloud Storage', 'Complex Context']
          };
        } else if (modeId === 'claude-local-first') {
          modeInfo = {
            ...modeInfo,
            name: 'Claude Local-First (Privacy)',
            description: 'Instant voice with maximum privacy. Stack: Web Speech API + Claude 3 Opus + IndexedDB (local storage)',
            icon: '🔒',
            badges: ['Privacy-First', 'Zero Latency', 'Local Storage', 'Deterministic']
          };
        } else if (modeId === 'markdown-library') {
          modeInfo = {
            ...modeInfo,
            name: 'Markdown Library (Beta)',
            description: 'Context-aware voice AI using markdown knowledge base. Stack: OpenAI Realtime API + Markdown Files',
            icon: '📚',
            badges: ['Realtime API', 'Full Context', 'Markdown-Based', 'Beta']
          };
        }
        
        metadata.push(modeInfo);
      }
    }

    return metadata;
  }
}

// Global registry instance
export const modeRegistry = new ModeRegistry();

// Helper function to register all modes
export async function registerAllModes() {
  // Register mode factories for lazy loading
  modeRegistry.registerFactory('memory-hierarchical', async () => {
    const { MemoryHierarchicalMode } = await import('./memory-hierarchical');
    return new MemoryHierarchicalMode();
  }, 10);

  modeRegistry.registerFactory('claude-local-first', async () => {
    const { ClaudeLocalFirstMode } = await import('./claude-local-first');
    return new ClaudeLocalFirstMode();
  }, 5);

  modeRegistry.registerFactory('markdown-library', async () => {
    const { MarkdownLibraryMode } = await import('./markdown-library');
    return new MarkdownLibraryMode();
  }, 8);

  // Future modes can be added here
  // modeRegistry.registerFactory('gemini-ultra', async () => {
  //   const { GeminiUltraMode } = await import('./gemini-ultra');
  //   return new GeminiUltraMode();
  // }, 3);
  // Would feature: Google Cloud Speech + Gemini Ultra + Google Cloud Storage
  // Strategic approach: Multimodal AI with vision capabilities

  // modeRegistry.registerFactory('llama-local', async () => {
  //   const { LlamaLocalMode } = await import('./llama-local');
  //   return new LlamaLocalMode();
  // }, 1);
  // Would feature: Local whisper.cpp + Llama 3 (Ollama) + SQLite
  // Strategic approach: 100% offline, complete privacy

  // modeRegistry.registerFactory('openai-realtime', async () => {
  //   const { OpenAIRealtimeMode } = await import('./openai-realtime');
  //   return new OpenAIRealtimeMode();
  // }, 2);
  // Would feature: OpenAI Realtime API (voice-to-voice) + Redis
  // Strategic approach: Ultra-low latency conversational AI
}