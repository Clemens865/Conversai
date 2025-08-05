# KITT Interface Components

A modular React component library for creating advanced voice interfaces inspired by the Knight Industries Two Thousand (KITT) from Knight Rider. Built with TypeScript, modern React patterns, and comprehensive accessibility features.

## 🚀 Features

### Core Components
- **KITTInterface**: Main integrated interface component
- **VoiceModulator**: Real-time audio visualization and processing controls
- **ControlPanel**: Curved dashboard with operation modes and system controls
- **StatusIndicators**: Comprehensive system monitoring with animated indicators
- **PursuitMode**: Advanced tactical interface with radar display

### Technical Features
- **Real-time WebAudio API integration** for voice visualization
- **Multiple visualization modes** (bars, wave, spectrum, circular)
- **Curved dashboard layouts** using CSS Grid and clip-path
- **Advanced animation system** with custom hooks
- **TypeScript** throughout for type safety
- **Comprehensive accessibility** (ARIA labels, keyboard navigation, screen reader support)
- **Responsive design** with mobile support
- **Customizable themes** with CSS custom properties

## 📦 Components

### KITTInterface
The main component that integrates all KITT modules into a complete interface.

```typescript
import { KITTInterface } from '@/components/kitt'

<KITTInterface
  onNewMessage={handleMessage}
  isRecording={isRecording}
  setIsRecording={setIsRecording}
  conversationId="conversation-id"
  theme={{
    primaryColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)'
  }}
/>
```

**Features:**
- Integrated voice recording and processing
- Real-time audio visualization
- System status monitoring
- Pursuit mode activation
- Emergency controls
- Keyboard navigation support

### VoiceModulator
Advanced audio visualization component with processing controls.

```typescript
import { VoiceModulator } from '@/components/kitt'

<VoiceModulator
  isActive={true}
  settings={voiceSettings}
  onSettingsChange={setVoiceSettings}
/>
```

**Features:**
- 4 visualization modes (bars, wave, spectrum, circular)
- Real-time frequency analysis
- Adjustable gain, pitch, and reverb
- Noise gate and compressor toggles
- Sensitivity controls
- Canvas-based rendering for smooth performance

### ControlPanel
Curved dashboard component with operation modes and system controls.

```typescript
import { ControlPanel } from '@/components/kitt'

<ControlPanel
  state={controlState}
  onStateChange={setControlState}
/>
```

**Features:**
- Curved dashboard layout using clip-path
- Multiple operation modes (Normal, Pursuit, Stealth, Maintenance)
- System power controls
- Emergency mode activation
- Voice command toggles
- Animated status indicators

### StatusIndicators
Comprehensive system monitoring component.

```typescript
import { StatusIndicators } from '@/components/kitt'

<StatusIndicators status={systemStatus} />
```

**Features:**
- Real-time system monitoring
- Animated CPU and memory usage displays
- Network activity indicators
- Temperature and battery status
- Audio level visualization
- Color-coded status indicators

### PursuitMode
Advanced tactical interface with radar display and target tracking.

```typescript
import { PursuitMode } from '@/components/kitt'

<PursuitMode
  state={pursuitState}
  onStateChange={setPursuitState}
/>
```

**Features:**
- Real-time radar visualization with canvas
- Target lock and tracking system
- Threat level assessment
- Multiple scan modes (Passive, Active, Pursuit)
- Distance and bearing display
- Animated radar sweep and scan lines

## 🎣 Custom Hooks

### useAudioProcessor
Advanced audio processing hook with WebAudio API integration.

```typescript
import { useAudioProcessor } from '@/hooks/useAudioProcessor'

const {
  audioContext,
  visualization,
  visualizationData,
  startProcessing,
  stopProcessing
} = useAudioProcessor({
  fftSize: 1024,
  smoothingTimeConstant: 0.85
})
```

**Features:**
- Real-time frequency analysis
- Multiple data formats (bars, wave, spectrum)
- Pitch detection using autocorrelation
- Volume calculation (RMS)
- Configurable processing options

### useAnimationState
Animation management hook for coordinated visual effects.

```typescript
import { useAnimationState } from '@/hooks/useAnimationState'

const {
  animationState,
  activateScanner,
  triggerSystemAlert,
  createBreathingEffect
} = useAnimationState({
  scannerSpeed: 2000,
  glowIntensity: 0.8
})
```

**Features:**
- Scanner line animations
- Pulse effects
- Glow intensity control
- System alert sequences
- Breathing effects
- Coordinated timing management

## 🎨 Theming

Components support comprehensive theming through CSS custom properties:

```typescript
const theme = {
  primaryColor: '#ef4444',     // Main accent color
  secondaryColor: '#dc2626',   // Secondary accent
  accentColor: '#f97316',      // Highlight color
  backgroundColor: '#111827',   // Background
  borderColor: '#374151',      // Borders
  glowColor: 'rgba(239, 68, 68, 0.5)', // Glow effects
  textColor: '#f3f4f6',        // Text
  warningColor: '#f59e0b',     // Warnings
  errorColor: '#dc2626',       // Errors
  successColor: '#10b981'      // Success states
}
```

### Predefined Themes
- **Classic Red** (default): Traditional KITT red theme
- **Ocean Blue**: Blue-themed variant
- **Matrix Green**: Green cyber theme

## ♿ Accessibility

All components include comprehensive accessibility features:

### Keyboard Navigation
- `Space` / `Enter`: Toggle recording
- `Escape`: Stop recording / Exit emergency mode
- `P`: Toggle pursuit mode
- Tab navigation through all interactive elements

### Screen Reader Support
- ARIA labels and roles on all interactive elements
- Live regions for status updates
- Semantic HTML structure
- Descriptive text for visual elements

### Additional Features
- High contrast mode support
- Configurable voice announcements
- Keyboard shortcut help
- Focus management
- Error announcements

## 🏗️ Architecture

### Component Structure
```
src/components/kitt/
├── KITTInterface.tsx        # Main integrated component
├── VoiceModulator.tsx       # Audio visualization
├── ControlPanel.tsx         # Dashboard controls
├── StatusIndicators.tsx     # System monitoring
├── PursuitMode.tsx         # Tactical interface
├── index.ts                # Export file
└── README.md               # Documentation

src/hooks/
├── useAudioProcessor.ts    # Audio processing hook
└── useAnimationState.ts    # Animation management hook

src/types/
└── kitt.ts                 # TypeScript definitions
```

### Key Design Patterns
- **Modular architecture**: Components can be used independently
- **Custom hooks**: Shared logic extraction for reusability
- **TypeScript interfaces**: Comprehensive type safety
- **CSS-in-JS styling**: Scoped styles with dynamic theming
- **Accessibility-first**: Built with screen readers and keyboard navigation in mind

## 🚀 Getting Started

1. **Import components**:
```typescript
import { KITTInterface, VoiceModulator } from '@/components/kitt'
```

2. **Set up state management**:
```typescript
const [isRecording, setIsRecording] = useState(false)
const [voiceSettings, setVoiceSettings] = useState<VoiceModulatorSettings>({
  gain: 1.0,
  pitch: 1.0,
  reverb: 0.2,
  visualizationMode: 'bars',
  // ... other settings
})
```

3. **Handle messages**:
```typescript
const handleNewMessage = (message: Message) => {
  setMessages(prev => [...prev, message])
}
```

4. **Render the interface**:
```typescript
<KITTInterface
  onNewMessage={handleNewMessage}
  isRecording={isRecording}
  setIsRecording={setIsRecording}
  conversationId="unique-id"
/>
```

## 🎮 Demo

Visit `/kitt-demo` to see all components in action with:
- Full integrated interface demonstration
- Individual component showcases
- Theme switching
- Feature explanations
- Technical documentation

## 🛠️ Technical Requirements

- React 18+
- TypeScript 5+
- WebAudio API support
- Modern browser with Canvas support
- CSS Grid and clip-path support

## 📱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with WebAudio support

## 🔧 Configuration

### Audio Processing Options
```typescript
{
  fftSize: 256,              // FFT size for frequency analysis
  smoothingTimeConstant: 0.8, // Smoothing for visualization
  minDecibels: -90,          // Minimum decibel level
  maxDecibels: -10,          // Maximum decibel level
  sampleRate: 44100          // Audio sample rate
}
```

### Animation Configuration
```typescript
{
  scannerSpeed: 2000,        // Scanner animation speed (ms)
  pulseSpeed: 1000,          // Pulse animation speed (ms)
  glowIntensity: 0.8,        // Default glow intensity
  autoTrigger: true          // Auto-trigger animations
}
```

## 🚨 Error Handling

Components include comprehensive error handling:
- Microphone access failures
- Audio processing errors
- Canvas rendering issues
- WebAudio API errors
- Network connectivity problems

All errors are gracefully handled with user-friendly messages and fallback states.

## 🎯 Performance Optimizations

- Canvas-based rendering for smooth animations
- RequestAnimationFrame for optimal timing
- Efficient audio buffer management
- Memoized calculations
- Cleanup on component unmount
- Configurable processing options

## 📈 Future Enhancements

- WebGL-based 3D visualizations
- Voice recognition integration
- Machine learning audio analysis
- Advanced radar simulation
- Multi-language support
- Plugin architecture for custom visualizations

---

Built with ❤️ for the Knight Rider community and modern voice interface enthusiasts.