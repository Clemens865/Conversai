# Understanding Mode UI Fields in ConversAI

## What the Fields Mean

When you select a mode in ConversAI, you see these fields:

### 🎤 Voice Provider
This is the **Speech-to-Text (STT) and Text-to-Speech (TTS) service** being used:
- **OpenAI Realtime API**: Combined voice input/output through WebSocket
- **Deepgram + ElevenLabs**: Separate STT and TTS services
- **Web Speech API**: Browser's built-in voice recognition

### 🤖 AI Model
This is the **Large Language Model (LLM)** that powers the conversation:
- **GPT-4o Realtime**: OpenAI's latest multimodal model
- **GPT-4 Turbo**: OpenAI's GPT-4 via standard API
- **Claude 3 Opus**: Anthropic's Claude model

### 💾 Memory/Storage Type
This is **where and how** conversations and data are stored:
- **Markdown Library (localStorage)**: Your biography as markdown files in browser
- **Fact-Based Storage (Supabase)**: Extracted facts in cloud database
- **IndexedDB (local)**: Browser's local database

### 🔐 Privacy Level
This indicates **where your data is processed**:
- **Cloud**: Data sent to external servers
- **Local**: Data stays on your device
- **Hybrid**: Mix of local and cloud processing

## Mode-Specific Details

### Markdown Library Mode
- **Voice**: OpenAI Realtime API (supports 6 voices: alloy, echo, fable, onyx, nova, shimmer)
- **AI**: GPT-4o Realtime (latest model with voice capabilities)
- **Storage**: Your complete biography stored as markdown in browser
- **Privacy**: Local storage, but API calls go to OpenAI

### Memory Mode (Supabase)
- **Voice**: Deepgram (transcription) + ElevenLabs (speech)
- **AI**: GPT-4 Turbo
- **Storage**: Facts extracted and stored in Supabase cloud database
- **Privacy**: Cloud-based with full persistence

### Claude Local-First Mode
- **Voice**: Web Speech API (browser's built-in)
- **AI**: Claude 3 Opus
- **Storage**: IndexedDB (browser's local database)
- **Privacy**: Maximum privacy, local storage only

## Future Enhancements

### Voice Selection UI
Instead of showing "OpenAI Realtime API", we could add:
- Dropdown to select voice (alloy, echo, nova, etc.)
- Voice preview button
- Voice characteristics display

### Model Selection UI
Instead of fixed AI models, we could offer:
- Model dropdown (GPT-4, GPT-3.5, Claude, etc.)
- Performance/cost trade-offs
- Model capabilities comparison

### Storage Options
More granular control over data:
- Export/import conversations
- Clear storage button
- Storage usage indicator

## Technical Implementation

The fields come from the `ModeFeatures` interface:
```typescript
interface ModeFeatures {
  voiceProvider: string;    // Shows in "Voice" field
  aiModel: string;          // Shows in "AI" field
  memoryType: string;       // Shows in "Storage" field
  privacy: 'cloud' | 'local' | 'hybrid';
  offlineSupport: boolean;
  realTimeProcessing: boolean;
}