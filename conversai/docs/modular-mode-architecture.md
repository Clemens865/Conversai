# ConversAI Modular Mode Architecture

## Overview
ConversAI now uses a fully modular mode system that allows easy addition of new AI approaches while maintaining complete technical separation between modes.

## Architecture Benefits

### 1. **Complete Mode Isolation**
- Each mode has its own:
  - Voice processing pipeline
  - AI integration 
  - Storage mechanism
  - Configuration
  - API endpoints
- No cross-mode dependencies
- Clean interfaces ensure compatibility

### 2. **Easy Mode Addition**
To add a new mode:
1. Create a directory under `src/lib/modes/`
2. Extend the `BaseMode` class
3. Implement required interfaces
4. Register in `registry.ts`
5. Mode automatically appears in UI!

### 3. **Lazy Loading**
- Modes are loaded only when needed
- Reduces initial bundle size
- Faster app startup
- Better performance

### 4. **Consistent Interface**
- All modes follow same interface
- Predictable behavior
- Easy to maintain
- Type-safe throughout

## Mode Structure

```
src/lib/modes/
├── types.ts                    # Core interfaces
├── registry.ts                 # Mode registration & management
├── base/
│   └── BaseMode.ts            # Base class all modes extend
├── memory-hierarchical/        # Mode 1: Original approach
│   ├── index.ts               # Main mode class
│   ├── voice.ts               # Deepgram + ElevenLabs
│   ├── ai.ts                  # GPT-4 integration
│   └── storage.ts             # Supabase storage
├── claude-local-first/         # Mode 2: Privacy-focused
│   ├── index.ts               # Main mode class
│   ├── voice.ts               # Web Speech API
│   ├── ai.ts                  # Claude integration
│   └── storage.ts             # IndexedDB storage
└── [your-new-mode]/           # Easy to add new modes!
```

## Available Modes

### 1. Memory Hierarchical
- **Voice**: Deepgram + ElevenLabs
- **AI**: GPT-4
- **Storage**: Supabase
- **Best For**: Premium experience, complex memory

### 2. Claude Local-First
- **Voice**: Web Speech API
- **AI**: Claude 3 Opus
- **Storage**: IndexedDB
- **Best For**: Privacy, instant response

## Adding a New Mode

### Example: Adding a Gemini Ultra Mode

1. **Create Mode Directory**
```bash
mkdir src/lib/modes/gemini-ultra
```

2. **Create Mode Implementation**
```typescript
// src/lib/modes/gemini-ultra/index.ts
import { BaseMode } from '../base/BaseMode';

export class GeminiUltraMode extends BaseMode {
  id = 'gemini-ultra';
  name = 'Gemini Ultra';
  description = 'Google\'s most powerful AI with multimodal capabilities';
  icon = '✨';
  
  features = {
    voiceProvider: 'Google Cloud Speech',
    aiModel: 'Gemini Ultra',
    memoryType: 'Context Window',
    privacy: 'cloud',
    offlineSupport: false,
    realTimeProcessing: true
  };
  
  badges = ['Multimodal', 'Long Context', 'Fast'];
  
  // Implement required methods...
}
```

3. **Register in Registry**
```typescript
// src/lib/modes/registry.ts
modeRegistry.registerFactory('gemini-ultra', async () => {
  const { GeminiUltraMode } = await import('./gemini-ultra');
  return new GeminiUltraMode();
}, 3);
```

4. **Mode Appears in UI!**
The mode selector automatically displays your new mode.

## Mode Lifecycle

### Initialization
```typescript
// When user selects a mode
await modeRegistry.switchMode('claude-local-first');

// Mode lifecycle:
1. Previous mode cleanup()
2. New mode initialize()
3. Update UI state
4. Ready for use!
```

### Processing Flow
```typescript
// Voice input
mode.voice.startRecording()
  → capture audio/transcript
  → mode.processAudio() or processTranscript()
  → mode.ai.generateResponse()
  → mode.storage.saveMessage()
  → mode.voice.synthesizeSpeech()
  → Update UI
```

## Mode Registry Features

### Dynamic Mode Loading
```typescript
// Register mode for lazy loading
modeRegistry.registerFactory('mode-id', factoryFunction, priority);

// Load mode when needed
const mode = await modeRegistry.getMode('mode-id');
```

### Mode Switching
```typescript
// Switch modes with automatic cleanup
await modeRegistry.switchMode('new-mode-id');

// Listen for mode changes
modeRegistry.addModeChangeListener((modeId) => {
  console.log('Switched to:', modeId);
});
```

### Mode Metadata
```typescript
// Get all available modes
const modes = await modeRegistry.getModeMetadata();
// Returns array with id, name, icon, features, etc.
```

## Best Practices

### 1. **Implement All Interfaces**
```typescript
class YourMode extends BaseMode {
  // Required: voice, ai, storage processors
  voice = new YourVoiceProcessor();
  ai = new YourAIProcessor();
  storage = new YourStorageProcessor();
}
```

### 2. **Handle Errors Gracefully**
```typescript
protected async onProcessAudio(blob: Blob): Promise<ProcessResult> {
  try {
    // Your processing logic
  } catch (error) {
    console.error(`Error in ${this.name}:`, error);
    throw error; // BaseMode handles UI feedback
  }
}
```

### 3. **Update Metrics**
```typescript
// Track performance
this.updateMetrics({
  latency: processingTime,
  accuracy: confidenceScore
});
```

### 4. **Clean Resources**
```typescript
protected async onCleanup(): Promise<void> {
  // Stop any ongoing processes
  this.voice.stopRecording();
  // Clear any timers
  // Close connections
}
```

## Future Enhancements

### Planned Modes
1. **Llama Local** - Fully offline with local LLM
2. **Mixtral Cloud** - Open-source alternative
3. **Multi-Modal** - Vision + voice capabilities
4. **Federated** - Privacy-preserving distributed AI

### Plugin System
- Install modes as npm packages
- Community-contributed modes
- Mode marketplace
- Custom mode templates

### Advanced Features
- Mode chaining (use multiple modes)
- Fallback modes (automatic switching)
- Mode analytics and comparison
- A/B testing framework

## Migration Guide

### From Old System
```typescript
// Old approach-based system
const [conversationApproach, setConversationApproach] = useState('memory-hierarchical');

// New mode-based system
const mode = modeRegistry.getCurrentMode();
```

### API Compatibility
The new system maintains compatibility with existing API endpoints while allowing new modes to define their own endpoints.

## Conclusion

The modular mode architecture provides:
- **Scalability**: Add unlimited modes
- **Maintainability**: Isolated, testable components
- **Flexibility**: Each mode optimized for its use case
- **User Choice**: Easy switching between modes

This architecture ensures ConversAI can evolve with new AI technologies while maintaining a consistent user experience.