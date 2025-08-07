# Biography Import Guide for ConversAI

This guide explains how to import your personal biography data into ConversAI's two memory systems:
- **Memory Mode** (Supabase cloud storage)
- **Claude Local-First Mode** (IndexedDB browser storage)

## Overview

Your biography data contains ~35 facts including:
- Personal information (name, birthplace, age)
- Family details (parents, brother, wife, daughter)
- Career history and current job
- Hobbies and interests
- Pet information (Holly and Benny)

## Method 1: Interactive Privacy-Aware Import (Recommended)

This method lets you choose exactly which facts to import.

### Steps:

1. **Open the interactive tool** in your browser:
   ```
   /Users/clemenshoenig/Documents/My-Coding-Programs/Conversational-AI/conversai/scripts/import-biography-interactive.html
   ```

2. **Select facts to import**:
   - Use "Select Non-Sensitive" to exclude private family details
   - Use category buttons to select specific types (Identity, Relationships, etc.)
   - Manually check/uncheck individual facts

3. **For Claude Local-First (Privacy Mode)**:
   - Click "🔒 Import to Claude Local-First"
   - The data will be stored directly in your browser
   - Refresh ConversAI and switch to Claude Local-First mode
   - The AI will greet you by name!

4. **For Memory Mode (Supabase)**:
   - Click "☁️ Generate Supabase Import Script"
   - Save the generated script
   - Run it with Node.js (see Method 2 for details)

## Method 2: Command-Line Import

Use this for bulk import of all facts.

### Prerequisites:
```bash
cd /Users/clemenshoenig/Documents/My-Coding-Programs/Conversational-AI/conversai
npm install  # If not already done
```

### Import to Supabase (Memory Mode):

1. **Ensure your `.env.local` has**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-key-here
   ```

2. **Run the import**:
   ```bash
   node scripts/import-biography.js supabase
   ```

3. **Verify**: Switch to Memory Mode in ConversAI, the AI should remember all your details

### Generate IndexedDB Import Script:

```bash
node scripts/import-biography.js indexeddb
```

This creates `scripts/indexeddb-import.js` - copy its contents into the browser console.

## Privacy Considerations

### Sensitive Facts (marked with 🔒):
- Birth year and exact age
- Family members' full names and birthdays
- Childhood address
- Health information (daughter's condition)

### Non-Sensitive Facts:
- Your name and current city
- Pet names (Holly and Benny)
- Current job title and company
- Hobbies and interests

## Testing the Import

### Claude Local-First Mode:
1. Refresh the browser after import
2. The greeting should say: "Welcome back, Clemens!"
3. Ask: "What do you know about me?"
4. Check Memory panel → should show your imported facts

### Memory Mode:
1. Switch to Memory Mode
2. Ask: "What's my wife's name?" or "Tell me about my cats"
3. The AI should correctly recall the imported information

## Troubleshooting

### IndexedDB Issues:
- Open DevTools → Application → IndexedDB
- Look for "ConversAILocalFirst" database
- Delete and reimport if needed

### Supabase Issues:
- Check the facts table in Supabase dashboard
- Ensure RLS policies allow your user ID
- Check `.env.local` has correct credentials

## Data Management

### Export your data:
- Claude Local-First: Use Memory panel → Export button
- Memory Mode: Use Supabase dashboard or SQL export

### Delete your data:
- Claude Local-First: Memory panel → Delete button
- Memory Mode: Run SQL: `DELETE FROM facts WHERE user_id = 'your-id'`

## Next Steps

After importing your biography:
1. Continue conversations to add new facts naturally
2. The AI will build on the imported foundation
3. Both modes will remember your information across sessions

Remember: Claude Local-First keeps everything in your browser, while Memory Mode syncs to Supabase cloud storage.