import React, { useState } from 'react';
import { supabase } from '../../../utils/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Tooltip } from '../../ui/Tooltip';

/**
 * AdminPasswordReset component for administrators to reset a user's password
 * This utility allows admins to set a temporary password for users who are having
 * trouble with the standard password reset flow
 */
const AdminPasswordReset: React.FC = () => {
  // State for email input and UI control
  const [email, setEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [instructions, setInstructions] = useState('');

  // No need for password generation since we're using Supabase's built-in reset flow

  /**
   * Sends a manual password reset email to the user
   * This uses Supabase's built-in password reset functionality
   * which is more reliable than trying to directly update passwords
   */
  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Please enter the user\'s email address');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the application URL for redirecting after password reset
      const appUrl = window.location.origin;
      const resetUrl = `${appUrl}/reset-password`;
      
      // Use Supabase's built-in password reset functionality
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl
      });
      
      if (error) {
        throw error;
      }
      
      // Set instructions for the admin to share with the user
      setInstructions(
        "1. Check spam/junk folder if email isn't in the inbox\n" +
        "2. Click the 'Reset Password' link in the email\n" +
        "3. Set a new password on the reset page"
      );
      
      // Mark as sent so we show the success UI
      setResetSent(true);
      
      toast.success(`Password reset email sent to ${email}`);
      
      // Get the player name if possible (not critical if it fails)
      try {
        const { data: playerData } = await supabase
          .from('players')
          .select('friendly_name')
          .filter('user_id', 'in', (
            await supabase.from('player_email_lookup').select('user_id').eq('email', email)
          ).data?.map(d => d.user_id) || []);
          
        if (playerData && playerData.length > 0) {
          toast.success(`Email sent to ${playerData[0].friendly_name}`);
        }
      } catch (e) {
        // Ignore errors in this optional step
        console.log('Could not fetch player name:', e);
      }
    } catch (error: any) {
      console.error('Admin password reset error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-base-200 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Admin Password Reset</h2>
      
      <Tooltip content="Use this utility to reset a user's password when they cannot access the standard reset flow">
        <p className="text-sm text-base-content/50 mb-4">
          This tool allows administrators to set a temporary password for users who are having trouble with the standard password reset flow.
        </p>
      </Tooltip>
      
      <fieldset className="fieldset w-full mb-4">
        <legend className="fieldset-legend">User Email</legend>
        <input
          type="email"
          placeholder="Enter user email"
          className="input w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </fieldset>
      
      <button
        className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
        onClick={handleResetPassword}
        disabled={isLoading || !email}
      >
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </button>
      
      {resetSent && (
        <motion.div
          className="mt-6 p-4 bg-success/10 border border-success rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="font-bold text-success mb-2">Password Reset Email Sent</h3>
          <p className="mb-2 text-sm">A password reset email has been sent to <span className="font-semibold">{email}</span>. Share these instructions with the user:</p>
          
          <div className="bg-base-100 p-3 rounded-md mb-3">
            <pre className="whitespace-pre-wrap text-sm">{instructions}</pre>
          </div>
          
          <div className="alert alert-warning">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Important:</strong> The reset email may appear in spam/junk folders.
              </span>
            </div>
          </div>
          
          <div className="flex justify-end mt-3">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                navigator.clipboard.writeText(instructions);
                toast.success('Instructions copied to clipboard');
              }}
            >
              Copy Instructions
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminPasswordReset;
