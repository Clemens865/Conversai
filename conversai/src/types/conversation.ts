export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  id: string
  userId: string
  name?: string
  preferredVoice?: string
  otherPreferences?: Record<string, any>
}