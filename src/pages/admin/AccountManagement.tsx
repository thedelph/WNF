import React from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { motion } from 'framer-motion';
import { FaUserShield } from 'react-icons/fa';
import AdminPasswordReset from '../../components/admin/utils/AdminPasswordReset';
import BetaTesterManagement from '../../components/admin/utils/BetaTesterManagement';
import { Tooltip } from '../../components/ui/Tooltip';

/**
 * Account Management Page
 * 
 * This page provides administrators with tools to manage user accounts,
 * including password reset functionality for users who are having trouble
 * logging in.
 * 
 * Features:
 * - Password reset utility for admins to generate temporary passwords for users
 * - Clear instructions and tooltips to guide admin through the process
 * - Secure handling of temporary password generation
 */
const AccountManagement: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Show loading state while checking admin status
  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  // Only allow admins to access this page
  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FaUserShield className="text-primary" />
          Account Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Manage user accounts and resolve authentication issues.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Password Reset Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-1"
        >
          <div className="card bg-base-100 shadow-xl h-full">
            <div className="card-body">
              <h2 className="card-title flex items-center">
                <span>Password Reset Tool</span>
                <Tooltip content="Use this to help users who can't log in or reset their passwords">
                  <span className="badge badge-accent ml-2">Admin Only</span>
                </Tooltip>
              </h2>
              
              <div className="alert alert-info mb-4">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>
                    This tool should only be used when the standard password reset doesn't work.
                    For example, after merging test users or when reset emails aren't delivered.
                  </span>
                </div>
              </div>
              
              <AdminPasswordReset />
            </div>
          </div>
        </motion.div>
        
        {/* Future Account Management Features */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-1"
        >
          <div className="card bg-base-100 shadow-xl h-full">
            <div className="card-body">
              <h2 className="card-title">Account Troubleshooting Guide</h2>
              
              <div className="prose">
                <h3>Common Login Issues</h3>
                <ul>
                  <li>
                    <strong>Invalid credentials</strong>: 
                    This usually means the password is incorrect or the account doesn't exist.
                  </li>
                  <li>
                    <strong>After test user merge</strong>: 
                    Users might try to use their test account credentials instead of their real account.
                  </li>
                  <li>
                    <strong>Password reset emails not delivered</strong>: 
                    These may end up in spam folders or be rate-limited by Supabase.
                  </li>
                </ul>
                
                <h3>Solutions</h3>
                <ol>
                  <li>Ask the user to check their spam folder for reset emails</li>
                  <li>Use the password reset tool to generate a temporary password</li>
                  <li>Provide the temporary password to the user via a secure channel</li>
                  <li>Instruct the user to change their password immediately after logging in</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Beta Tester Management */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full"
      >
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <BetaTesterManagement />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountManagement;
