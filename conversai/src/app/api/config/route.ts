import { NextResponse } from 'next/server'

export async function GET() {
  // Check if API keys are configured
  const hasDeepgram = !!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
  const hasElevenLabs = !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
  const hasOpenAI = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY

  return NextResponse.json({
    configured: hasDeepgram && hasElevenLabs && hasOpenAI,
    services: {
      deepgram: hasDeepgram,
      elevenLabs: hasElevenLabs,
      openai: hasOpenAI,
    }
  })
}