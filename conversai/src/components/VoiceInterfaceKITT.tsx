'use client'

import { KITTInterface } from '@/components/kitt'
import { Message } from '@/types/conversation'

interface VoiceInterfaceProps {
  onNewMessage: (message: Message) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  conversationId: string | null
}

export default function VoiceInterfaceKITT({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId 
}: VoiceInterfaceProps) {
  return (
    <KITTInterface
      onNewMessage={onNewMessage}
      isRecording={isRecording}
      setIsRecording={setIsRecording}
      conversationId={conversationId}
      className="max-w-6xl mx-auto"
    />
  )
}