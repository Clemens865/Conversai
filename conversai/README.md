# ConversAI - Personal Voice Assistant

An intelligent voice-enabled personal assistant with conversational memory, built with Next.js, Supabase, and cutting-edge AI technologies.

## Features

- 🎤 Real-time voice conversations with <500ms latency
- 🧠 Long-term conversational memory
- 💬 Natural language processing with GPT-4
- 🔊 High-quality text-to-speech synthesis
- 📝 Conversation history and search
- 🔐 Secure user authentication

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Voice**: Deepgram (STT), ElevenLabs (TTS)
- **AI**: OpenAI GPT-4o, LangChain
- **Database**: Supabase (PostgreSQL + pgvector)
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy `.env.local.example` to `.env.local` and add your API keys

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
conversai/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utility functions and API clients
│   ├── hooks/        # Custom React hooks
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
└── ...config files
```

## Development Phases

### Phase 1: MVP (Weeks 1-3) ✅ In Progress
- Basic voice conversation
- Simple memory storage
- Web interface

### Phase 2: Enhanced Memory (Weeks 4-6)
- Vector embeddings
- Semantic search
- Conversation summarization

### Phase 3: Predictive Intelligence (Weeks 7-10)
- Conversation prediction
- Context pre-loading
- Performance optimization

### Phase 4: Agentic Capabilities (Weeks 11-16)
- Web research
- Task automation
- Tool integrations

## Contributing

This is a learning project focused on exploring voice AI technologies. Feel free to explore and experiment!