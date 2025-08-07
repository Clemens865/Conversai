# Setting Up the Second Approach (Claude Local-First)

## Prerequisites

1. **Anthropic API Key**: Sign up at [Anthropic](https://www.anthropic.com/) to get your Claude API key
2. **Compatible Browser**: Chrome or Edge (for Web Speech API support)
3. **Microphone Permissions**: The browser will ask for microphone access

## Setup Steps

### 1. Install Dependencies

```bash
cd conversai
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```env
# Add this to your existing .env.local
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 3. Start the Development Server

```bash
pnpm dev
```

### 4. Using the Claude Local-First Approach

1. Open http://localhost:3000 in Chrome or Edge
2. Sign in with your existing account
3. Look for the **AI Approach** selector in the bottom-left corner
4. Click it and select **"Claude Local-First"**
5. The interface will switch to the new approach

## Key Differences You'll Notice

### Voice Interaction
- **Instant Recognition**: Speech recognition starts immediately
- **Browser Voice**: Uses your browser's built-in voice (customizable in browser settings)
- **No Upload Delay**: Your voice never leaves your device

### Memory Behavior
- **Deterministic**: Always remembers facts consistently
- **State-Based**: Conversation follows clear states (greeting, learning, assisting)
- **Local Storage**: All data stored in your browser's IndexedDB

### Privacy Features
- ✅ Voice audio stays on your device
- ✅ Only text is sent to Claude API
- ✅ Local storage can be cleared anytime
- ✅ No third-party voice services

## Testing the Approaches

### Test Scenario 1: Memory Consistency
1. Switch to Claude Local-First
2. Say: "My name is [Your Name]"
3. Say: "I have two cats named Holly and Benny"
4. Say: "What's my name and what are my cats' names?"
5. The system should correctly recall this information

### Test Scenario 2: Voice Latency
1. Compare both approaches:
   - Memory Mode: Notice the delay before recognition starts
   - Claude Local-First: Recognition starts instantly

### Test Scenario 3: Privacy
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Speak to the assistant
4. Notice that only text is sent to the API, not audio

## Troubleshooting

### Web Speech API Not Working
- Ensure you're using Chrome or Edge
- Check microphone permissions in browser settings
- Try refreshing the page

### No Voice Output
- Check your system volume
- Ensure browser has permission to play audio
- Check if other tabs are playing audio

### API Errors
- Verify your Anthropic API key is correct
- Check API rate limits
- Ensure you have credits in your Anthropic account

## Customization Options

### Browser Voice Settings
1. Go to Chrome/Edge settings
2. Search for "Text-to-speech"
3. Choose different voices and speeds
4. Changes apply immediately to the app

### Memory Persistence
- Data is stored locally in IndexedDB
- Clear browsing data to reset
- Export/import conversations (coming soon)

## Next Steps

1. Try both approaches and compare the experience
2. Check the metrics displayed for each approach
3. Provide feedback on which approach works better for your needs
4. Explore the deterministic memory behavior of Claude Local-First

## Development Notes

The Claude Local-First approach prioritizes:
- **Privacy**: No audio data leaves your device
- **Speed**: Instant voice recognition and synthesis
- **Predictability**: Deterministic memory behavior
- **Cost**: Only one API service (Claude) vs three

Enjoy exploring the new approach!