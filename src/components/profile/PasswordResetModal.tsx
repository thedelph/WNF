import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Tooltip } from '../ui/Tooltip'

interface PasswordResetModalProps {
  onClose: () => void
}

/**
 * Modal component for password reset functionality
 * Allows users to reset their password while logged in
 * Uses a two-step verification approach:
 * 1. First validates the current password
 * 2. Then allows setting a new password
 */
export default function PasswordResetModal({ onClose }: PasswordResetModalProps) {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'verify' | 'reset'>('verify')

  // Handle verification of current password
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      if (!user || !user.email) {
        toast.error('Unable to verify user information')
        return
      }
      
      // Use a safer approach - attempt to sign in with the current credentials
      // We'll use signInWithPassword in a controlled way
      const toastId = toast.loading('Verifying password...')
      
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })
      
      toast.dismiss(toastId)
      
      if (error) {
        console.error('Password verification failed:', error)
        toast.error('Current password is incorrect')
        return
      }
      
      // If we got here, password verification succeeded
      toast.success('Password verified')
      setStep('reset')
      
    } catch (error) {
      console.error('Error verifying password:', error)
      toast.error('Failed to verify current password')
    } finally {
      setIsSubmitting(false)
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
      setIsSubmitting(true)
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        throw error
      }
      
      toast.success('Password updated successfully')
      onClose()
      
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-base-200 p-6 rounded-box shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">
          {step === 'verify' ? 'Verify Current Password' : 'Change Password'}
        </h2>
        
        {step === 'verify' ? (
          // Step 1: Verify current password
          <form onSubmit={handleVerify}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Current Password</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Enter your current password"
                required
              />
              <Tooltip content="Your current password is required for security reasons">
                <label className="label cursor-pointer">
                  <span className="label-text-alt text-info flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verification required
                  </span>
                </label>
              </Tooltip>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          // Step 2: Reset password
          <form onSubmit={handleReset}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">New Password</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Enter new password"
                minLength={8}
                required
              />
              <label className="label">
                <span className="label-text-alt text-info">Password must be at least 8 characters</span>
              </label>
            </div>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Confirm New Password</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Confirm new password"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
