# MVP - Personal AI Assistant

## MVP Objective

Build a foundational voice-enabled assistant that demonstrates the core architecture patterns while keeping complexity manageable. The MVP will serve as a learning platform and foundation for future enhancements.

## MVP Scope: "Conversational Memory Assistant"

### Core Functionality

**Primary Use Case**: A voice assistant that can have natural conversations, remember what you've discussed, and provide relevant context from previous interactions.

**Example Interaction**:
```
User: "Hey assistant, I'm planning a trip to Japan"
Assistant: "That sounds exciting! What cities are you thinking of visiting?"
User: "Tokyo and Kyoto mainly"
Assistant: "Great choices! When are you planning to go?"

[Later conversation]
User: "What did I tell you about my travel plans?"
Assistant: "You mentioned planning a trip to Japan, specifically Tokyo and Kyoto. Would you like to discuss more details about your trip?"
```

## MVP Features

### 1. Voice Interface (Basic)
- **Speech-to-Text**: Real-time transcription using Deepgram or Azure Speech
- **Text-to-Speech**: Natural voice responses using ElevenLabs or Azure TTS
- **Target Latency**: <500ms for MVP (will optimize to <200ms later)
- **Simple Voice Activity Detection**: Start/stop conversation detection

### 2. Conversation Management
- **Session Persistence**: Conversations continue across app restarts
- **Context Awareness**: Assistant remembers the current conversation context
- **Turn Management**: Handle back-and-forth conversation naturally
- **Conversation Logging**: Store all interactions with timestamps

### 3. Basic Memory System
- **Conversation Storage**: Store all conversations in Supabase with metadata
- **Simple Retrieval**: Search past conversations by keyword
- **Context Window**: Maintain last 10 exchanges in active memory
- **User Preferences**: Remember basic user information (name, preferences)

### 4. Simple Web Interface
- **Voice Controls**: Start/stop recording buttons
- **Conversation Display**: Show real-time transcription and responses
- **Conversation History**: Browse past conversations
- **Settings**: Configure voice preferences

## Technical Implementation (MVP)

### Architecture
```
Web Interface (React/Next.js)
    ↓
Voice Handler (Web Audio API)
    ↓
STT Service (Deepgram API)
    ↓
Conversation Manager (Context + Memory)
    ↓
LLM Service (OpenAI GPT-4 or Claude)
    ↓
TTS Service (ElevenLabs API)
    ↓
Audio Output (Web Audio API)
```

### Database Schema (Supabase)
```sql
-- Conversations table
conversations (
  id uuid primary key,
  user_id uuid,
  title text,
  created_at timestamp,
  updated_at timestamp
)

-- Messages table
messages (
  id uuid primary key,
  conversation_id uuid references conversations(id),
  role text, -- 'user' or 'assistant'
  content text,
  audio_url text, -- optional: store audio files
  created_at timestamp
)

-- User preferences
user_preferences (
  id uuid primary key,
  user_id uuid,
  name text,
  preferred_voice text,
  other_preferences jsonb
)
```

## MVP Limitations (Intentional)

### What's NOT Included in MVP
- ❌ Vector embeddings / semantic search (Phase 2)
- ❌ Conversation prediction / pre-loading (Phase 3)
- ❌ Web research capabilities (Phase 3)
- ❌ Advanced agentic workflows (Phase 4)
- ❌ Multi-modal inputs beyond voice (Phase 4)
- ❌ Complex memory management (Phase 2)

### Simplified Implementations
- **Memory**: Simple keyword search instead of semantic search
- **Context**: Fixed context window instead of intelligent selection
- **Voice**: Standard APIs instead of optimized pipeline
- **UI**: Basic web interface instead of mobile app

## Success Criteria

### Functional Requirements
- ✅ Can have a 5-minute natural conversation
- ✅ Remembers conversation context within session
- ✅ Can retrieve information from previous conversations
- ✅ Voice latency under 500ms
- ✅ Conversation data persists across sessions

### Learning Objectives Achieved
- ✅ **Voice Technology**: Understand STT/TTS integration and latency challenges
- ✅ **Database Design**: Work with Supabase for conversation storage
- ✅ **Conversation AI**: Build context-aware dialogue system
- ✅ **Web Development**: Create responsive voice interface

## Development Timeline (Estimated 2-3 weeks)

### Week 1: Foundation
- Day 1-2: Set up Supabase, basic Next.js app
- Day 3-4: Implement voice recording and STT integration
- Day 5-7: Add TTS and basic conversation loop

### Week 2: Core Features
- Day 1-3: Build conversation management and storage
- Day 4-5: Implement basic memory retrieval
- Day 6-7: Create conversation history interface

### Week 3: Polish & Testing
- Day 1-2: Optimize voice pipeline and reduce latency
- Day 3-4: Add error handling and edge cases
- Day 5-7: Testing, debugging, and documentation

## Post-MVP Roadmap

### Phase 2: Intelligent Memory (Week 4-6)
- Add pgvector for semantic search
- Implement conversation summarization
- Build intelligent context retrieval

### Phase 3: Predictive Intelligence (Week 7-10)
- Conversation tree analysis
- Proactive information pre-loading
- Advanced context switching

### Phase 4: Agentic Capabilities (Week 11-16)
- Web research integration
- Task automation
- Multi-agent workflows

## Risk Mitigation

### Technical Risks
- **Voice Latency**: Start with higher latency targets, optimize later
- **API Costs**: Use free tiers and implement usage limits
- **Complexity Creep**: Strict MVP scope adherence

### Learning Risks
- **Overwhelming Scope**: Focus on one technology area at a time
- **Analysis Paralysis**: Start building quickly, iterate based on learnings

## Definition of Done

The MVP is complete when:
1. You can have a natural voice conversation with the assistant
2. The assistant remembers what you've discussed in previous sessions
3. You can ask "what did we talk about yesterday?" and get a relevant answer
4. The system demonstrates all core architectural patterns for future expansion
5. You've gained hands-on experience with each target technology area

This MVP provides a solid foundation while keeping the scope achievable for learning purposes.