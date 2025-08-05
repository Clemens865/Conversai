'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSupabase()
  }, [])

  const checkSupabase = async () => {
    const results: any = {}
    
    // Check environment variables
    results.env = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not found',
    }

    // Check client creation
    try {
      const client = createClient()
      results.client = client ? '✅ Created' : '❌ Failed'
      
      if (client) {
        // Test connection
        try {
          const { data, error } = await client.from('conversations').select('count')
          results.connection = error ? `❌ ${error.message}` : '✅ Connected'
        } catch (e: any) {
          results.connection = `❌ ${e.message}`
        }

        // Check auth status
        try {
          const { data: { session } } = await client.auth.getSession()
          results.session = session ? '✅ Active' : '⚪ No session'
        } catch (e: any) {
          results.session = `❌ ${e.message}`
        }
      }
    } catch (e: any) {
      results.client = `❌ ${e.message}`
    }

    setStatus(results)
    setLoading(false)
  }

  if (loading) {
    return <div>Checking Supabase configuration...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Debug Info</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <div className="space-y-1">
            <p>URL: {status.env?.url}</p>
            <p>Anon Key: {status.env?.anonKey}</p>
            <p className="text-xs text-gray-600">URL Value: {status.env?.urlValue}</p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Client Status</h2>
          <p>Client Creation: {status.client}</p>
          <p>Database Connection: {status.connection}</p>
          <p>Auth Session: {status.session}</p>
        </div>

        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded">
          <h2 className="font-semibold mb-2">Next Steps</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Check browser console for errors</li>
            <li>Verify Supabase dashboard auth settings</li>
            <li>Try creating a test account</li>
            <li>Check if email confirmation is required</li>
          </ul>
        </div>
      </div>
    </div>
  )
}