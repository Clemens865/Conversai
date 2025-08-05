import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Please add them to .env.local')
    // Return a dummy client for development
    return null as any
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}