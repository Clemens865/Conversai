# ConversAI - Personal Voice Assistant

An intelligent voice-enabled personal assistant with conversational memory, built with Next.js, Supabase, and cutting-edge AI technologies.

## 🚀 Features

- 🎤 **Real-time Voice Conversations** - Sub-500ms latency with Deepgram STT and ElevenLabs TTS
- 🧠 **Intelligent Memory System** - Semantic search and long-term conversation memory
- 💬 **Natural Language Processing** - Powered by GPT-4 for human-like interactions
- 🎨 **KITT-Inspired Interface** - Beautiful UI inspired by Knight Rider
- 📝 **Conversation History** - Full searchable history across sessions
- 🔐 **Secure Authentication** - User accounts with Supabase Auth
- 🔍 **Semantic Search** - Find past conversations by meaning, not just keywords
- 🏷️ **Smart Topic Extraction** - Automatic conversation categorization
- 📊 **Learning Mode** (Coming Soon) - Adaptive questioning to learn about users

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Three.js
- **Voice**: Deepgram (STT), ElevenLabs (TTS)
- **AI**: OpenAI GPT-4o, Text Embeddings
- **Database**: Supabase (PostgreSQL + pgvector)
- **Real-time**: WebSockets for live updates
- **Deployment**: Vercel-ready

## 📁 Project Structure

```
conversai/
├── src/
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   │   ├── kitt/      # KITT interface components
│   │   ├── webgl/     # 3D visualizations
│   │   └── memory/    # Memory management UI
│   ├── lib/           # Core services
│   │   └── services/
│   │       ├── ai/    # AI integrations
│   │       ├── memory/# Memory system
│   │       └── voice/ # Voice pipeline
│   └── types/         # TypeScript definitions
├── scripts/           # Database and utility scripts
├── mockups/           # UI design variations
└── docs/             # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- API keys for: OpenAI, Deepgram, ElevenLabs

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Clemens865/Conversai.git
cd Conversai/conversai
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

4. Set up the database:
```bash
# Run migrations
node scripts/setup-database.js
```

5. Start the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Voice Services
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key

# AI
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
```

## 📚 Development Phases

- ✅ **Phase 1: MVP** - Basic voice conversation with simple memory
- ✅ **Phase 2: Enhanced Memory** - Semantic search, summarization, topics
- 🚧 **Phase 3: Predictive Intelligence** - Conversation prediction (In Progress)
- 📅 **Phase 4: Agentic Capabilities** - Web research, task automation

## 🤝 Contributing

This is a learning project focused on exploring voice AI technologies. Feel free to explore, experiment, and contribute!

## 📄 License

MIT License - feel free to use this project for learning and experimentation.

## 🔒 Security

- Never commit API keys or sensitive data
- Use environment variables for all secrets
- Check `.gitignore` before committing

## 🚀 Future Features

- Learning Mode for personalized interactions
- Multi-language support
- Mobile app versions
- Voice cloning capabilities
- Advanced workflow automation

---

Built with ❤️ for learning AI voice technology