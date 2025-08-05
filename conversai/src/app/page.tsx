'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import MinimalPureInterface from '@/components/MinimalPureInterface'
import AuthForm from '@/components/AuthForm'

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-flex gap-4 mb-4">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="w-2 h-6 bg-red-500 animate-pulse"
                style={{ 
                  animationDelay: `${i * 0.15}s`,
                  boxShadow: '0 0 10px rgba(255, 0, 0, 0.8)'
                }}
              />
            ))}
          </div>
          <p className="text-red-500 text-sm tracking-widest uppercase">Loading KITT...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 tracking-wider" style={{ color: '#ff3333' }}>
            ConversAI
          </h1>
          <p className="text-gray-400 text-lg font-light tracking-wide">
            Your personal KITT-inspired AI assistant
          </p>
        </div>
        
        <AuthForm />
        
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <MinimalPureInterface user={user} />
      
      <button
        onClick={() => signOut()}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '8px 16px',
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: '8px',
          color: '#ff3333',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
        }}
      >
        Sign Out
      </button>
    </>
  )
}