import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { toast } from 'react-toastify'

const Register: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [friendlyName, setFriendlyName] = useState('')
  const [preferredPosition, setPreferredPosition] = useState('')
  const navigate = useNavigate()

  const positions = ['GK', 'LB', 'CB', 'RB', 'RM', 'CM', 'LM', 'ST']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }
  
    try {
      // First, sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
  
      if (authError) throw authError
  
      if (authData.user) {
        // Create the player profile
        const { error: profileError } = await supabase
          .from('players')
          .insert({
            user_id: authData.user.id,
            friendly_name: friendlyName,
            preferred_position: preferredPosition,
            caps: 0,
            xp: 0,
            win_rate: 0,
            active_bonuses: 0,
            active_penalties: 0,
          })
  
        if (profileError) {
          console.error('Profile Error:', profileError)
          throw profileError
        }
  
        toast.success('Registration successful! Please check your email to verify your account.')
        navigate('/login')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
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
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Preferred Position</span>
              </label>
              <select
                value={preferredPosition}
                onChange={(e) => setPreferredPosition(e.target.value)}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select position</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
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
        </div>
      </div>
    </div>
  )
}

// Add this line to export the component
export default Register