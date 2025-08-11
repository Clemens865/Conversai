import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Clemens's biography for context (fallback knowledge base)
const CLEMENS_BIO = `
Clemens Hoenig is a robotics expert and computer vision specialist who founded Robotic Eyes.
He worked extensively at Yorizon, focusing on advanced computer vision and AI systems.
His expertise includes robotics, computer vision, artificial intelligence, and entrepreneurship.
He has contributed to various innovative projects in the field of visual computing and autonomous systems.
`;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          answer: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.',
          sources: ['Configuration Error']
        },
        { status: 500 }
      );
    }

    try {
      // Create a chat completion with context about Clemens
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant with knowledge about Clemens Hoenig. 
            Use this information to answer questions: ${CLEMENS_BIO}
            If the question is not about Clemens, answer it to the best of your ability.
            Keep responses concise and informative.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const answer = completion.choices[0]?.message?.content || 'No response generated';

      return NextResponse.json({
        answer,
        sources: ['OpenAI GPT-3.5 Turbo', 'Fallback Knowledge Base'],
        confidence: 0.75,
      });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      
      // If OpenAI fails, provide a basic response
      if (question.toLowerCase().includes('clemens') || question.toLowerCase().includes('yorizon')) {
        return NextResponse.json({
          answer: `Based on available information: ${CLEMENS_BIO}`,
          sources: ['Static Knowledge Base'],
          confidence: 0.5,
        });
      }

      return NextResponse.json({
        answer: 'I apologize, but I cannot process your question at the moment. Please try again later.',
        sources: ['Error Handler'],
        confidence: 0,
      });
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}