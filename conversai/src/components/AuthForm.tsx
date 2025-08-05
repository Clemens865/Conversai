'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      console.log('Attempting', isSignUp ? 'signup' : 'signin', 'with:', email)
      
      if (isSignUp) {
        await signUp(email, password)
        setSuccess('Account created! Check your email for confirmation.')
      } else {
        await signIn(email, password)
        setSuccess('Signed in successfully!')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      
      // Provide more specific error messages
      if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account before signing in.')
      } else if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.')
      } else if (error.message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setError(error.message || 'An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '400px',
      margin: '0 auto',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '24px',
        color: '#ff3333',
        textAlign: 'center',
        letterSpacing: '1px'
      }}>
        {isSignUp ? 'Create Account' : 'Access KITT'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label htmlFor="email" style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          />
          <p style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '4px'
          }}>
            Minimum 6 characters
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            borderRadius: '8px'
          }}>
            <p style={{
              color: '#ff6666',
              fontSize: '13px',
              margin: 0
            }}>{error}</p>
          </div>
        )}
        
        {success && (
          <div style={{
            padding: '12px',
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid rgba(0, 255, 0, 0.2)',
            borderRadius: '8px'
          }}>
            <p style={{
              color: '#66ff66',
              fontSize: '13px',
              margin: 0
            }}>{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.15)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            color: '#ff3333',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            opacity: loading ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      <div style={{
        marginTop: '24px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setSuccess('')
            }}
            style={{
              color: '#ff3333',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
      
      {isSignUp && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: 'rgba(255, 0, 0, 0.05)',
          border: '1px solid rgba(255, 0, 0, 0.1)',
          borderRadius: '8px'
        }}>
          <p style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
            textAlign: 'center'
          }}>
            Note: You'll need to confirm your email before signing in.
          </p>
        </div>
      )}
    </div>
  )
}