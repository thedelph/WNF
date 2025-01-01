import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'

// Temporarily disable registration while preserving functionality
const REGISTRATION_ENABLED = false

const Register: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [friendlyName, setFriendlyName] = useState('')
  const navigate = useNavigate()

  // Check if friendly name is available (allows duplicates with test users)
  const checkFriendlyName = async (name: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('friendly_name, is_test_user')
      .eq('friendly_name', name)
      
    if (error) return false
    
    // If no entries found, the name is available
    if (!data || data.length === 0) return true
    
    // If all matches are test users, allow the name
    return data.every(player => player.is_test_user === true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }

    try {
      // Check if friendly name is available
      const isNameAvailable = await checkFriendlyName(friendlyName)
      if (!isNameAvailable) {
        toast.error('This friendly name is already taken. Please choose another one.')
        return
      }

      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      })
  
      if (authError) throw authError
  
      if (authData.user) {
        // Create the player profile with only the essential fields
        console.log('Creating player profile with user_id:', authData.user.id)
        const { error: profileError } = await supabase
          .from('players')
          .insert({
            user_id: authData.user.id,
            friendly_name: friendlyName,
            caps: 0,
            active_bonuses: 0,
            active_penalties: 0
          })
  
        if (profileError) {
          console.error('Profile Error:', profileError)
          if (profileError.code === '23505') {
            toast.error('This friendly name is already taken. Please choose another one.')
          } else {
            throw profileError
          }
          return
        }
  
        toast.success('Registration successful! Please check your email to verify your account.')
        navigate('/login')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      // Check for specific error types
      if (error.message?.toLowerCase().includes('security purposes')) {
        toast.error('Please wait a moment before trying again')
      } else if (error.message?.toLowerCase().includes('jwt expired')) {
        toast.error('Your session has expired. Please try again.')
        // Clear the expired session
        await supabase.auth.signOut()
        navigate('/login')
      } else {
        toast.error(error.message || 'Registration failed')
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          {REGISTRATION_ENABLED ? (
            <>
              <h2 className="card-title justify-center mb-4">Create your WNF Account</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Friendly Name</span>
                  </label>
                  <input
                    type="text"
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    placeholder="How you want to appear on the teamsheet"
                    className="input input-bordered w-full"
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-neutral-500">This name must be unique</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Confirm Password</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                <div className="form-control mt-6">
                  <button type="submit" className="btn btn-primary">Register</button>
                </div>

                <div className="divider">OR</div>

                <div className="text-center text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="link link-primary">
                    Login here
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="card-title justify-center mb-4">Registration Coming Soon!</h2>
              <p className="text-base-content/80">
                We're currently fine-tuning our registration system. Please check back soon!
              </p>
              <div className="divider">OR</div>
              <div className="text-sm">
                Already have an account?{' '}
                <Link to="/login" className="link link-primary">
                  Login here
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register