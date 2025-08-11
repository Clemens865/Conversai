import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize OpenAI client as fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// This is a simple server-side helper for Claude API calls
// All actual state management happens client-side in IndexedDB
// No user data is stored on the server

export async function POST(req: NextRequest) {
  try {
    let transcript: string = '';
    let conversationContext: string = '';
    let message: string = '';
    let config: any = {};
    
    // Check Content-Type to handle both JSON and FormData
    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Handle JSON request (from RAG AI service)
      const jsonData = await req.json();
      message = jsonData.message || '';
      transcript = jsonData.transcript || message;
      conversationContext = jsonData.context ? JSON.stringify(jsonData.context) : '';
      config = jsonData.config || {};
    } else {
      // Handle FormData request (original implementation)
      const formData = await req.formData();
      transcript = formData.get('transcript') as string;
      conversationContext = formData.get('context') as string;
    }
    
    if (!transcript && !message) {
      return NextResponse.json({ error: 'Missing transcript or message' }, { status: 400 });
    }

    // Parse the context sent from client (contains facts from IndexedDB)
    let context = '';
    try {
      if (conversationContext) {
        const contextData = typeof conversationContext === 'string' 
          ? JSON.parse(conversationContext) 
          : conversationContext;
        context = buildContextPrompt(contextData);
      } else if (config.systemPrompt) {
        // Use system prompt from config if available
        context = config.systemPrompt;
      }
    } catch (e) {
      console.error('Error parsing context:', e);
    }

    // Create the prompt for Claude
    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: 'user',
        content: message || transcript
      }
    ];

    let assistantResponse = '';
    
    // Try Claude API first if configured
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1000,
          temperature: 0.7,
          system: context || "You are a helpful, friendly AI assistant focused on privacy. Keep responses natural and conversational.",
          messages: messages,
        });

        assistantResponse = response.content[0].type === 'text' 
          ? response.content[0].text 
          : 'I understand. How can I help you?';
      } catch (claudeError) {
        console.log('Claude API failed, falling back to OpenAI');
      }
    }
    
    // Fall back to OpenAI if Claude fails or isn't configured
    if (!assistantResponse && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: context || "You are a helpful, friendly AI assistant focused on privacy. Keep responses natural and conversational."
            },
            {
              role: 'user',
              content: message || transcript
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        assistantResponse = completion.choices[0]?.message?.content || 'I understand. How can I help you?';
      } catch (openaiError) {
        console.error('OpenAI API also failed:', openaiError);
        throw openaiError;
      }
    }
    
    if (!assistantResponse) {
      throw new Error('No AI service available');
    }
    
    // Return response - no storage, no logging of personal data
    return NextResponse.json({
      transcript,
      response: assistantResponse,
      // No state or personal data is returned to maintain privacy
    });
    
  } catch (error) {
    console.error('Error in Claude voice processing:', error);
    
    // Don't leak error details that might contain personal information
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function buildContextPrompt(contextData: any): string {
  let context = "You are a helpful AI assistant with local memory. ";
  context += "This conversation is completely private and no data is stored on any server.\n\n";
  
  // Add user facts from client-side context
  if (contextData.userName) {
    context += `User's name: ${contextData.userName}\n`;
  }
  
  if (contextData.facts && contextData.facts.length > 0) {
    context += "Known facts about the user:\n";
    contextData.facts.forEach((fact: any) => {
      context += `- ${fact.fact}\n`;
    });
  }
  
  if (contextData.currentTopic) {
    context += `\nCurrent topic: ${contextData.currentTopic}\n`;
  }
  
  context += "\nRespond naturally and personally based on what you know about the user.";
  context += "\nAlways respect the user's privacy and never suggest storing data in the cloud.";
  
  return context;
}