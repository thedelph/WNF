import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import toast from 'react-hot-toast'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
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
        } else {
          throw error
        }
        return
      }

      toast.success('Logged in successfully!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
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
              <button className="btn btn-primary w-full mt-4" type="submit">
                Login
              </button>
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
      </div>
    </div>
  )
}

export default Login