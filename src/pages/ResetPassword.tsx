import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

/**
 * ResetPassword component handles the final step of the password reset process
 * This component is displayed after a user clicks on the password reset link from their email
 * It allows them to set a new password for their account
 */
const ResetPassword: React.FC = () => {
  // State for password inputs and loading status
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hashPresent, setHashPresent] = useState(false);
  const navigate = useNavigate();

  // Check if we have a hash fragment in the URL which indicates a valid reset link
  useEffect(() => {
    // Check if we're on a valid reset page with hash params
    const hash = window.location.hash;
    setHashPresent(Boolean(hash && hash.length > 0));
    
    // If we have hash params, initialize Supabase auth session
    if (hash && hash.length > 0) {
      // This will pick up the hash fragment automatically
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          // We're in a valid password recovery session
          toast.success('You can now set your new password');
        }
      });
      
      // Clean up the subscription when component unmounts
      return () => {
        data?.subscription?.unsubscribe();
      };
    }
  }, []);

  /**
   * Handle form submission to update the password
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password inputs
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }
      
      toast.success('Password updated successfully');
      
      // Navigate to login page after short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If no hash is present, show error message
  if (!hashPresent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg max-w-md w-full">
          <h3 className="text-2xl font-bold text-center text-red-600">Invalid Reset Link</h3>
          <p className="mt-4 text-center">
            This page should only be accessed from a password reset email link.
          </p>
          <div className="mt-6 text-center">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/forgot-password')}
            >
              Request a new reset link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <motion.div 
        className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-center">Set New Password</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block" htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter new password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <div className="mt-4">
              <label className="block" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm new password"
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                className={`btn btn-primary w-full mt-6 ${isLoading ? 'loading' : ''}`} 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
