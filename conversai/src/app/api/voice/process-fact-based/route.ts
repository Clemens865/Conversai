import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DeepgramService } from '@/lib/services/voice/deepgram'
import { OpenAIService } from '@/lib/services/ai/openai'
import { ElevenLabsService } from '@/lib/services/voice/elevenlabs'
import { ConversationServiceServer } from '@/lib/services/conversation.server'
import { FactBasedMemorySupabase, FactCategory } from '@/lib/services/memory/factBasedMemorySupabase'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Initialize fact-based memory with server-side Supabase client
    const factBasedMemory = new FactBasedMemorySupabase(true);
    factBasedMemory.setSupabase(supabase);

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const conversationId = formData.get('conversationId') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Get API keys from environment
    const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
    const openAIApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY

    if (!deepgramApiKey || !openAIApiKey || !elevenLabsApiKey) {
      return NextResponse.json({ 
        error: 'API keys not configured',
        details: {
          deepgram: !!deepgramApiKey,
          openai: !!openAIApiKey,
          elevenlabs: !!elevenLabsApiKey
        }
      }, { status: 500 })
    }

    // Convert audio file to ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer()
    console.log('Audio file size:', audioBuffer.byteLength, 'bytes')
    console.log('Audio file type:', audioFile.type)

    // 1. Transcribe audio with Deepgram
    console.log('Transcribing audio...')
    const deepgram = new DeepgramService(deepgramApiKey)
    const transcript = await deepgram.transcribeAudio(audioBuffer)

    if (!transcript || transcript.trim() === '') {
      console.log('No speech detected in audio')
      return NextResponse.json({ error: 'No speech detected. Please speak clearly into the microphone.' }, { status: 400 })
    }

    // 2. Extract facts from the transcript
    console.log('Extracting facts from message...')
    const extractedFacts = await factBasedMemory.extractFactsFromMessage(transcript, user.id)
    console.log(`Extracted ${extractedFacts.length} facts from message`)

    // 3. Retrieve relevant facts based on the current context
    const relevantFacts = await factBasedMemory.retrieveFacts({
      keywords: transcript.toLowerCase().split(/\s+/),
      categories: [
        FactCategory.IDENTITY,
        FactCategory.RELATIONSHIPS,
        FactCategory.PREFERENCES,
        FactCategory.ACTIVITIES
      ],
      minConfidence: 0.6,
      limit: 20
    }, user.id)

    console.log(`Retrieved ${relevantFacts.length} relevant facts from memory`)

    // 4. Build context from facts
    const factContext = factBasedMemory.buildContextFromFacts(relevantFacts)
    console.log('=== FACT-BASED CONTEXT ===')
    console.log(factContext)
    console.log('=== END CONTEXT ===')

    // 5. Get recent conversation messages (without vector search)
    const conversationService = new ConversationServiceServer()
    const conversation = await conversationService.getConversation(conversationId)
    
    // Format recent messages for context
    const recentMessages = conversation?.messages.slice(-10) || []
    const contextMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // 6. Generate AI response with fact-based context
    console.log('Generating AI response...')
    const openAI = new OpenAIService(openAIApiKey)
    
    // Create system message with fact context
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI assistant having a natural conversation. Remember and use the following information about the user:

${factContext}

Please be natural and conversational. Use the user's name and reference their information when relevant.`
    }

    // Combine system message, recent messages, and current message
    const messages = [
      systemMessage,
      ...contextMessages.map(msg => ({
        id: Date.now().toString(),
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date()
      })),
      {
        id: Date.now().toString(),
        role: 'user' as const,
        content: transcript,
        timestamp: new Date()
      }
    ]
    
    const aiResponse = await openAI.generateResponse({
      messages: messages.filter(msg => msg.role !== 'system'), // Filter out system for OpenAI format
      temperature: 0.7,
      systemPrompt: systemMessage.content // Pass system prompt separately
    })

    // 7. Extract facts from AI response too
    const responseFacts = await factBasedMemory.extractFactsFromMessage(aiResponse, user.id)
    console.log(`Extracted ${responseFacts.length} facts from AI response`)

    // 8. Save messages to database
    if (conversationId && user) {
      try {
        // Check if conversation exists, create if not
        const existingConv = await conversationService.getConversation(conversationId)
        if (!existingConv) {
          // Create new conversation with authenticated user
          const newConv = await conversationService.createConversation(
            user.id,
            `Conversation ${new Date().toLocaleDateString()}`,
            conversationId
          )
          
          if (!newConv) {
            console.error('Failed to create conversation')
            // Continue without database storage
            return
          }
        }
        
        // Add messages to conversation
        await conversationService.addMessage(conversationId, 'user', transcript)
        await conversationService.addMessage(conversationId, 'assistant', aiResponse)
        
        console.log('Messages saved to database for conversation:', conversationId)
      } catch (dbError) {
        console.error('Database storage error (non-fatal):', dbError)
        // Continue without database storage - don't fail the request
      }
    }

    // 9. Generate speech from AI response (optional - handle errors gracefully)
    let speechBase64 = null
    let audioType = null
    
    try {
      console.log('Generating speech...')
      const elevenLabs = new ElevenLabsService(elevenLabsApiKey)
      const speechBuffer = await elevenLabs.generateSpeech(aiResponse)
      
      // Convert ArrayBuffer to base64 for sending to client
      speechBase64 = Buffer.from(speechBuffer).toString('base64')
      audioType = 'audio/mpeg'
    } catch (ttsError) {
      console.error('TTS generation error (non-fatal):', ttsError)
      // Continue without audio - the text response is still valid
    }

    // Return response with fact-based metadata
    return NextResponse.json({
      transcript,
      response: aiResponse,
      audio: speechBase64,
      audioType: audioType,
      success: true,
      facts: {
        extracted: extractedFacts.length,
        total: await factBasedMemory.getAllUserFacts(user.id).then(facts => facts.length)
      }
    })

  } catch (error) {
    console.error('Voice processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to process voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}