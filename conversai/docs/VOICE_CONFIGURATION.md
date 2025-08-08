# Voice Configuration for ConversAI

## OpenAI Realtime API Voices (Markdown Library Mode)

The Markdown Library mode uses OpenAI's Realtime API, which offers 6 different voice options:

### Available Voices

1. **`alloy`** (Default)
   - Neutral and balanced
   - Clear articulation
   - Professional tone
   - Good for general use

2. **`echo`**
   - Male voice
   - Warm and conversational
   - Natural pacing
   - Good for friendly interactions

3. **`fable`**
   - British accent
   - Storyteller quality
   - Expressive and engaging
   - Good for narrative content

4. **`onyx`**
   - Deep, authoritative male voice
   - Professional and serious
   - Good for formal contexts
   - Strong presence

5. **`nova`**
   - Female voice
   - Friendly and upbeat
   - Energetic tone
   - Good for casual conversation

6. **`shimmer`**
   - Female voice
   - Soft and gentle
   - Calm and soothing
   - Good for relaxed interactions

## How to Change the Voice

### Option 1: Modify the Mode Configuration

Edit `/src/lib/modes/markdown-library/index.ts`:

```typescript
export class MarkdownLibraryMode extends BaseMode {
  // ...
  selectedVoice: string = 'nova'  // Change from 'alloy' to your preferred voice
}
```

### Option 2: Environment Variable (Future Enhancement)

You could add an environment variable:

```bash
# .env.local
NEXT_PUBLIC_OPENAI_VOICE=echo
```

Then update the mode to read from env:

```typescript
selectedVoice: string = process.env.NEXT_PUBLIC_OPENAI_VOICE || 'alloy'
```

### Option 3: UI Selector (Future Enhancement)

A voice selector could be added to the UI to allow users to change voices on the fly.

## Voice Characteristics Comparison

| Voice    | Gender | Accent    | Tone          | Best For                |
|----------|--------|-----------|---------------|-------------------------|
| alloy    | Neutral| American  | Professional  | General use             |
| echo     | Male   | American  | Warm          | Friendly conversation   |
| fable    | Neutral| British   | Expressive    | Storytelling           |
| onyx     | Male   | American  | Authoritative | Formal/professional    |
| nova     | Female | American  | Upbeat        | Casual chat            |
| shimmer  | Female | American  | Gentle        | Calm interactions      |

## Other Modes Voice Configuration

### Memory Mode (Supabase)
Uses **ElevenLabs** with customizable voices. Default is "Rachel" but can be changed in the ElevenLabs dashboard.

### Claude Local-First Mode
Uses the browser's **Web Speech API** synthesis, which uses system voices. The available voices depend on the user's operating system and browser.

## Testing Different Voices

1. Import your biography using the import tool
2. Load the Markdown Library mode
3. Try different voices by editing the `selectedVoice` property
4. Restart the app to apply changes
5. Test with various prompts to hear the differences

## Voice Selection Tips

- **For professional contexts**: Choose `alloy` or `onyx`
- **For friendly assistance**: Choose `echo` or `nova`
- **For storytelling**: Choose `fable`
- **For calming interactions**: Choose `shimmer`
- **For variety**: Rotate between voices based on context

## Future Enhancements

1. **Dynamic Voice Switching**: Allow changing voice mid-conversation
2. **Voice Profiles**: Save voice preferences per user
3. **Emotion-Based Selection**: Auto-select voice based on conversation tone
4. **Custom Voice Training**: Future support for custom voices
5. **Multi-Voice Conversations**: Different voices for different types of responses