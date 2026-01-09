import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Tooltip } from '../ui/Tooltip'
import { createClient } from '@supabase/supabase-js'

interface PasswordChangeSectionProps {
  onClose: () => void
}

/**
 * Password change functionality for the user profile
 * Uses a two-step verification approach:
 * 1. First validates the current password
 * 2. Then allows setting a new password
 */
export default function PasswordChangeSection({ onClose }: PasswordChangeSectionProps) {
  const { user } = useAuth()
  const [passwordResetStep, setPasswordResetStep] = useState<'verify' | 'reset'>('verify')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Handles reset of all form fields and state
  const resetForm = () => {
    setPasswordResetStep('verify')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  // Handle close with cleanup
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Handle verification of current password
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    
    try {
      setIsSubmittingPassword(true)
      
      if (!user || !user.email) {
        toast.error('Unable to verify user information')
        return
      }
      
      const toastId = toast.loading('Verifying password...')
      
      try {
        // Create a temporary Supabase client that won't interfere with our main authenticated session
        // This is a critical step to prevent page refreshes and session changes
        const tempClient = createClient(
          'https://jvdhauvwaowmzbwtpaym.supabase.co',
          // Get the public anon key from the current client
          supabase.supabaseUrl.includes('jvdhauvwaowmzbwtpaym') ? supabase.supabaseKey : '',
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false
            }
          }
        )
        
        // Attempt to sign in with the temp client to verify credentials
        const { error } = await tempClient.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        })
        
        // If there's an error, the password was incorrect
        if (error) {
          console.error('Password verification failed:', error)
          toast.error('Current password is incorrect')
          return
        }
        
        // Clear the temporary client's session immediately
        await tempClient.auth.signOut()
        
        // Password verified successfully without affecting main session
        toast.success('Password verified')
        setPasswordResetStep('reset')
      } finally {
        toast.dismiss(toastId)
      }
    } catch (error) {
      console.error('Error in password verification:', error)
      toast.error('Failed to verify password')
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  // Handle password reset submission
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate password requirements
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    try {
      setIsSubmittingPassword(true)
      
      if (!user || !user.email) {
        toast.error('User session not found')
        return
      }
      
      // First verify the current password one more time using the temp client
      // This ensures we're authorized to make the change
      const tempClient = createClient(
        'https://jvdhauvwaowmzbwtpaym.supabase.co',
        supabase.supabaseUrl.includes('jvdhauvwaowmzbwtpaym') ? supabase.supabaseKey : '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        }
      )
      
      // Login with the temp client to get a fresh session
      const { data, error: signInError } = await tempClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      
      if (signInError) {
        toast.error('Session expired. Please verify your current password again')
        setPasswordResetStep('verify')
        return
      }
      
      if (!data.session) {
        toast.error('Could not create authorization session')
        return
      }
      
      // Now use the new session to update the password
      // Note: updateUser uses the current session from tempClient automatically
      const { error } = await tempClient.auth.updateUser(
        { password: newPassword }
      )
      
      if (error) {
        throw error
      }
      
      // Clear the temp session
      await tempClient.auth.signOut()
      
      // Success!
      toast.success('Password updated successfully')
      
      // Ask user if they want to log out and log back in with new password
      const shouldLogout = window.confirm(
        'Your password has been updated successfully. Would you like to log out now and log back in with your new password?'
      )
      
      if (shouldLogout) {
        // Use a force logout approach that clears local storage
        // This avoids any 403 errors that might occur with the regular logout
        localStorage.removeItem('supabase.auth.token')
        
        // After a short delay, reload the page to force a complete reset
        setTimeout(() => {
          window.location.href = '/login'
        }, 500)
        
        return // Skip handleClose since we're redirecting
      }
      
      handleClose()
      
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-200 rounded-box p-6 shadow-lg"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {passwordResetStep === 'verify' ? 'Verify Current Password' : 'Change Password'}
        </h2>
        <button 
          onClick={handleClose}
          className="btn btn-sm btn-circle"
          aria-label="Close password reset"
        >
          ✕
        </button>
      </div>
      
      {passwordResetStep === 'verify' ? (
        // Step 1: Verify current password
        <form onSubmit={handleVerify}>
          <fieldset className="fieldset mb-4">
            <legend className="fieldset-legend">Current Password</legend>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                tabIndex={-1}
              >
                {showCurrentPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <Tooltip content="Your current password is required for security reasons">
              <p className="fieldset-label text-info flex items-center gap-1 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verification required
              </p>
            </Tooltip>
          </fieldset>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={isSubmittingPassword}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingPassword}
            >
              {isSubmittingPassword ? <span className="loading loading-spinner loading-sm"></span> : 'Continue'}
            </button>
          </div>
        </form>
      ) : (
        // Step 2: Reset password
        <form onSubmit={handleReset}>
          <fieldset className="fieldset mb-4">
            <legend className="fieldset-legend">New Password</legend>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Enter new password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="fieldset-label text-info">Password must be at least 8 characters</p>
          </fieldset>
          <fieldset className="fieldset mb-4">
            <legend className="fieldset-legend">Confirm New Password</legend>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full pr-10"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </fieldset>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPasswordResetStep('verify')}
              className="btn btn-ghost"
              disabled={isSubmittingPassword}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmittingPassword}
            >
              {isSubmittingPassword ? <span className="loading loading-spinner loading-sm"></span> : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  )
}
