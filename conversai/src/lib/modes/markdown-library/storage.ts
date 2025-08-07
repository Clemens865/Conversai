import { StorageProcessor, ProcessResult, Message } from '../types'

export class MarkdownLibraryStorage implements StorageProcessor {
  private storageKey = 'markdown-library-conversations'
  
  async initialize(): Promise<void> {
    console.log('Initializing Markdown Library storage (localStorage)')
    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage not available')
    }
  }
  
  async saveMessage(conversationId: string, message: Message): Promise<ProcessResult> {
    try {
      const conversations = this.getConversations()
      
      if (!conversations[conversationId]) {
        conversations[conversationId] = {
          id: conversationId,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
      
      conversations[conversationId].messages.push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      })
      conversations[conversationId].updatedAt = new Date().toISOString()
      
      localStorage.setItem(this.storageKey, JSON.stringify(conversations))
      
      return {
        success: true,
        data: { messageId: message.id }
      }
    } catch (error) {
      console.error('Failed to save message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async getConversation(conversationId: string): Promise<ProcessResult> {
    try {
      const conversations = this.getConversations()
      const conversation = conversations[conversationId]
      
      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found'
        }
      }
      
      return {
        success: true,
        data: conversation
      }
    } catch (error) {
      console.error('Failed to get conversation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async searchMemory(query: string): Promise<ProcessResult> {
    try {
      const conversations = this.getConversations()
      const results: any[] = []
      
      // Simple text search across all conversations
      Object.values(conversations).forEach((conv: any) => {
        conv.messages.forEach((msg: any) => {
          if (msg.content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              conversationId: conv.id,
              message: msg,
              score: 1 // Simple match
            })
          }
        })
      })
      
      return {
        success: true,
        data: results
      }
    } catch (error) {
      console.error('Failed to search memory:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async deleteConversation(conversationId: string): Promise<ProcessResult> {
    try {
      const conversations = this.getConversations()
      delete conversations[conversationId]
      localStorage.setItem(this.storageKey, JSON.stringify(conversations))
      
      return {
        success: true,
        data: { deleted: true }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async cleanup(): Promise<void> {
    // Nothing to clean up for localStorage
    console.log('Markdown Library storage cleanup complete')
  }
  
  private getConversations(): Record<string, any> {
    const stored = localStorage.getItem(this.storageKey)
    return stored ? JSON.parse(stored) : {}
  }
  
  // Additional methods for markdown library management
  
  async exportConversations(): Promise<string> {
    const conversations = this.getConversations()
    return JSON.stringify(conversations, null, 2)
  }
  
  async importConversations(data: string): Promise<ProcessResult> {
    try {
      const conversations = JSON.parse(data)
      localStorage.setItem(this.storageKey, JSON.stringify(conversations))
      
      return {
        success: true,
        data: { imported: Object.keys(conversations).length }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid conversation data'
      }
    }
  }
}