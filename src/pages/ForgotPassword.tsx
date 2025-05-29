import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

/**
 * ForgotPassword component that allows users to request a password reset link
 * This component displays a form for users to enter their email address
 * and sends a password reset link to that email using Supabase Auth
 */
const ForgotPassword: React.FC = () => {
  // State for email input and loading status
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  /**
   * Handle form submission to request password reset
   * @param e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Request password reset from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      // Show success message and update UI
      setResetSent(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <motion.div 
        className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-center">Reset Password</h3>
        
        {!resetSent ? (
          <form onSubmit={handleSubmit}>
            <div className="mt-4">
              <div>
                <label className="block" htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Your registered email"
                  className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  className={`btn btn-primary w-full mt-4 ${isLoading ? 'loading' : ''}`} 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                
                <div className="divider">OR</div>
                
                <div className="text-sm text-center">
                  Remember your password?{' '}
                  <Link to="/login" className="link link-primary">
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-4">
            <div className="alert alert-success mb-4">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Password reset link sent!</span>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4">
              We've sent a password reset link to <span className="font-semibold">{email}</span>.
              Please check your email and click on the link to reset your password.
            </p>
            
            <p className="text-sm text-gray-500 mb-6">
              If you don't see the email, check your spam folder or request another reset link.
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                className="btn btn-outline w-full" 
                onClick={() => setResetSent(false)}
              >
                Try another email
              </button>
              
              <Link to="/login" className="btn btn-primary w-full mt-2">
                Back to login
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
