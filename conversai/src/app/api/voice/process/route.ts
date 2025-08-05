import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DeepgramService } from '@/lib/services/voice/deepgram'
import { OpenAIService } from '@/lib/services/ai/openai'
import { ElevenLabsService } from '@/lib/services/voice/elevenlabs'
import { ConversationServiceServer } from '@/lib/services/conversation.server'
import { ContextManager } from '@/lib/services/memory/contextManager'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // 2. Get enhanced conversation context using Phase 2 context management
    const conversationService = new ConversationServiceServer()
    
    // Get enhanced context with semantic search
    const enhancedContext = await conversationService.getEnhancedContext(
      user.id,
      conversationId,
      transcript
    )
    
    // Format context for messages
    const contextMessages = enhancedContext.recentMessages || []
    
    console.log('Retrieved context messages:', contextMessages.length)
    console.log('Relevant history:', enhancedContext.relevantHistory?.length || 0)
    console.log('Topics:', enhancedContext.topics)
    
    // If we have relevant history from semantic search, prepend it as system context
    const messages = []
    if (enhancedContext.relevantHistory && enhancedContext.relevantHistory.length > 0) {
      const contextSummary = ContextManager.formatContextForLLM(enhancedContext)
      console.log('=== CONTEXT BEING SENT TO AI ===')
      console.log(contextSummary)
      console.log('=== END CONTEXT ===')
      messages.push({
        role: 'system',
        content: contextSummary
      })
    }
    
    // Add recent conversation messages
    messages.push(...contextMessages)

    // 3. Generate AI response
    console.log('Generating AI response...')
    const openAI = new OpenAIService(openAIApiKey)
    
    // Format messages properly for OpenAI - filter out system messages
    const formattedMessages = messages
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => ({
        id: Date.now().toString(),
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.created_at ? new Date(msg.created_at) : new Date()
      }))
    
    // Add current user message
    formattedMessages.push({
      id: Date.now().toString(),
      role: 'user' as const,
      content: transcript,
      timestamp: new Date()
    })
    
    const aiResponse = await openAI.generateResponse({
      messages: formattedMessages,
      temperature: 0.7,
    })

    // 4. Save messages to database (with Phase 2 enhancements)
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
        
        // Add messages to conversation (embeddings will be generated in background)
        await conversationService.addMessage(conversationId, 'user', transcript)
        await conversationService.addMessage(conversationId, 'assistant', aiResponse)
        
        console.log('Messages saved to database for conversation:', conversationId)
      } catch (dbError) {
        console.error('Database storage error (non-fatal):', dbError)
        // Continue without database storage - don't fail the request
      }
    }

    // 5. Generate speech from AI response (optional - handle errors gracefully)
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

    return NextResponse.json({
      transcript,
      response: aiResponse,
      audio: speechBase64,
      audioType: audioType,
      success: true
    })

  } catch (error) {
    console.error('Voice processing error:', error)
    return NextResponse.json({ 
      error: 'Failed to process voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}