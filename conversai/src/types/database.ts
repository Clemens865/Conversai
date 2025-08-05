export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          audio_url: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          audio_url?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          audio_url?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      message_embeddings: {
        Row: {
          id: string
          message_id: string
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          embedding?: number[] | null
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preferred_voice: string | null
          speech_rate: number | null
          other_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_voice?: string | null
          speech_rate?: number | null
          other_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_voice?: string | null
          speech_rate?: number | null
          other_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}