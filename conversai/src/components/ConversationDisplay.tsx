'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types/conversation'

interface ConversationDisplayProps {
  messages: Message[]
}

export default function ConversationDisplay({ messages }: ConversationDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="bg-black rounded-lg shadow-2xl p-6 h-[600px] flex flex-col border border-red-900/50">
      <h2 className="text-2xl font-bold mb-4 text-red-500 tracking-wider">CONVERSATION LOG</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-8 font-mono">
            AWAITING VOICE INPUT...
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-lg px-4 py-2 border
                  ${message.role === 'user' 
                    ? 'bg-red-900/20 border-red-500 text-red-300' 
                    : 'bg-gray-900 border-gray-700 text-gray-300'
                  }
                `}
              >
                <p className="text-sm font-mono">{message.content}</p>
                <p className={`text-xs mt-1 font-mono ${
                  message.role === 'user' 
                    ? 'text-red-400' 
                    : 'text-gray-500'
                }`}>
                  {message.role === 'user' ? 'USER' : 'K.I.T.T.'} • {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}