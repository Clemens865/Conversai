import { createClient } from '@/lib/supabase/client'
import { Message, Conversation } from '@/types/conversation'

export class ConversationService {
  private supabase = createClient()

  async createConversation(userId: string, title?: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title || 'New Conversation'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }

    return {
      id: data.id,
      title: data.title || 'New Conversation',
      messages: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  async addMessage(
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string,
    audioUrl?: string
  ): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        audio_url: audioUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding message:', error)
      return null
    }

    return {
      id: data.id,
      role: data.role as 'user' | 'assistant',
      content: data.content,
      timestamp: new Date(data.created_at),
      audioUrl: data.audio_url || undefined
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    // Get conversation details
    const { data: conversation, error: convError } = await this.supabase
      .from('conversations')
      .select()
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError)
      return null
    }

    // Get messages
    const { data: messages, error: msgError } = await this.supabase
      .from('messages')
      .select()
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return null
    }

    return {
      id: conversation.id,
      title: conversation.title || 'Conversation',
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        audioUrl: msg.audio_url || undefined
      })),
      createdAt: new Date(conversation.created_at),
      updatedAt: new Date(conversation.updated_at)
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select()
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return []
    }

    return data.map(conv => ({
      id: conv.id,
      title: conv.title || 'Conversation',
      messages: [],
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at)
    }))
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)

    if (error) {
      console.error('Error updating conversation title:', error)
      return false
    }

    return true
  }
}