# ConversAI - Personal AI Assistant with Memory

ConversAI is a sophisticated personal AI assistant that remembers conversations and learns about you over time. It features multiple conversation modes, voice interaction, and privacy-focused options.

## Features

- 🧠 **Persistent Memory**: Remembers facts about you across conversations
- 🎙️ **Voice Interaction**: Speak naturally with voice input and responses
- 🔒 **Privacy Options**: Choose between cloud-based or local-only storage
- 🤖 **Multiple AI Models**: OpenAI GPT-4, Anthropic Claude, and more
- 📝 **Fact-Based Memory**: Structured knowledge storage with confidence scoring
- 🌐 **Production Ready**: Deploy to Vercel with one click

## Conversation Modes

### 1. Memory Mode (Recommended for Production)
- Cloud-based memory with Supabase
- Persistent across devices
- Voice input via Deepgram
- AI responses with GPT-4
- Text-to-speech with ElevenLabs

### 2. Claude Local-First
- Complete privacy - all data stays in your browser
- Uses IndexedDB for storage
- Powered by Anthropic's Claude
- No cloud sync required

### 3. Markdown Library (Beta - Local Development)
- Store knowledge in markdown files
- Load entire documents into context
- OpenAI Realtime API integration (requires local proxy)

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Voice**: Deepgram (STT), ElevenLabs (TTS), Web Speech API
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Database**: Supabase (PostgreSQL), IndexedDB
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Add your API keys to `.env.local`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   
   # AI Services
   NEXT_PUBLIC_OPENAI_API_KEY=your_key
   NEXT_PUBLIC_DEEPGRAM_API_KEY=your_key
   NEXT_PUBLIC_ELEVENLABS_API_KEY=your_key
   ANTHROPIC_API_KEY=your_key
   ```

5. Run the development server:
   ```bash
   npm run dev
   
   # Or with Realtime API proxy for Markdown Library mode
   npm run dev:all
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
conversai/
├── src/
│   ├── app/              # Next.js app router
│   │   └── api/          # API routes
│   ├── components/       # React components
│   ├── lib/
│   │   ├── modes/        # Conversation modes
│   │   ├── services/     # API services
│   │   ├── stores/       # State management
│   │   └── hooks/        # Custom React hooks
│   └── styles/           # CSS styles
├── public/               # Static assets
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── ...config files
```

## Deploy to Production

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/conversai)

### Quick Deploy Steps:
1. Click the deploy button above
2. Connect your GitHub account
3. Configure environment variables in Vercel
4. Deploy!

### Production Notes:
- ✅ **Memory Mode**: Fully functional in production
- ✅ **Claude Local-First**: Works everywhere (browser-based)
- ⚠️ **Markdown Library**: Realtime API only works locally

See [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) for detailed instructions.

## Documentation

- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md)
- [Realtime API Proxy Setup](docs/REALTIME_PROXY_SETUP.md)
- [WebSocket Authentication Explained](docs/WEBSOCKET_AUTH_EXPLAINED.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.