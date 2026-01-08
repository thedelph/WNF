import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { SessionRecoveryBanner } from '../components/auth/SessionRecoveryBanner'
import { AlertCircle, HelpCircle } from 'lucide-react'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  // Track specific problem users (you can update these)
  const problemUserEmails = [
    // Add the emails of the two problematic users here (redacted for privacy)
    'toffeetower@hotmail.com',
    // Add the second problematic user email here
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Clear any existing session issues before attempting login
      if (auth.sessionHealth === 'unhealthy') {
        console.log('Clearing unhealthy session before login attempt')
        await auth.signOut()
      }

      const { error } = await auth.signIn(email, password)
      
      if (error) {
        // Enhanced error handling for specific issues
        const errorMessage = error.message?.toLowerCase() || ''

        if (errorMessage.includes('email not confirmed')) {
          // Get new confirmation email
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email
          })

          if (resendError) {
            toast.error('Failed to resend verification email. Please try again.')
          } else {
            toast.error('Please verify your email address. A new verification email has been sent.')
          }
        } else if (errorMessage.includes('invalid login credentials') || errorMessage.includes('incorrect')) {
          // Special handling for recurring login issues
          const isProblemUser = problemUserEmails.includes(email.toLowerCase())

          if (isProblemUser) {
            toast.error(
              <div>
                <p className="font-bold">Login Failed</p>
                <p className="text-sm mt-1">We're aware of ongoing issues with your account.</p>
                <p className="text-sm mt-1">Please try:</p>
                <ul className="text-xs mt-1 list-disc list-inside">
                  <li>Using the "Forgot Password" option below</li>
                  <li>Requesting a magic link from support</li>
                  <li>Clearing your browser cache and cookies</li>
                </ul>
              </div>,
              { duration: 8000 }
            )
            setShowDiagnostics(true)
          } else {
            toast.error('Invalid email or password. Please try again.')
          }
        } else if (errorMessage.includes('refresh_token') || errorMessage.includes('jwt')) {
          toast.error('Session expired. Please try logging in again.')

          // Attempt automatic recovery
          if (auth.recoverSession) {
            const recovered = await auth.recoverSession()
            if (recovered) {
              toast.success('Session recovered! Please try again.')
            }
          }
        } else {
          throw error
        }
        return
      }

      toast.success('Logged in successfully!')
      navigate('/')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to send magic link (backup method)
  const sendMagicLink = async () => {
    if (!email) {
      toast.error('Please enter your email address first')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      })

      if (error) throw error

      toast.success('Magic link sent! Check your email.')
    } catch (error: any) {
      toast.error('Failed to send magic link: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg max-w-md w-full">
        {/* Session Recovery Banner */}
        {auth && auth.sessionHealth && (
          <SessionRecoveryBanner
            sessionHealth={auth.sessionHealth}
            isRecovering={auth.isRecovering || false}
            onRecoverSession={auth.recoverSession || (() => Promise.resolve(false))}
            error={auth.error}
          />
        )}

        <h3 className="text-2xl font-bold text-center">Login to your account</h3>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block" htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block">Password</label>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-primary w-full mt-4"
                type="submit"
                disabled={isLoading || auth?.isRecovering}
              >
                {isLoading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  'Login'
                )}
              </button>

              {/* Magic Link Option for Problem Users */}
              {showDiagnostics && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Alternative Login Method</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    If you continue to have issues, you can request a magic link.
                  </p>
                  <button
                    type="button"
                    onClick={sendMagicLink}
                    className="btn btn-sm btn-outline btn-info mt-2 w-full"
                    disabled={isLoading || !email}
                  >
                    Send Magic Link to Email
                  </button>
                </div>
              )}
              <div className="text-sm text-center mt-4">
                <Link to="/forgot-password" className="link link-primary">Forgot password?</Link>
              </div>
              <div className="divider">OR</div>
              <div className="text-sm text-center">
                Don't have an account?{' '}
                <Link to="/register" className="link link-primary">
                  Register here
                </Link>
              </div>
            </div>
          </div>
        </form>

        {/* Session Diagnostics (hidden by default, shown for debugging) */}
        {showDiagnostics && auth?.getSessionDiagnostics && (
          <details className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <summary className="cursor-pointer font-semibold">Session Diagnostics</summary>
            <pre className="mt-2 overflow-x-auto">
              {JSON.stringify(auth.getSessionDiagnostics(), null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default Login