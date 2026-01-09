import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserShield } from 'react-icons/fa';
import { Tooltip } from '../../ui/Tooltip';

/**
 * Account Management Card Component
 * 
 * This component displays a card in the Admin Portal that links to
 * account management utilities like password reset functionality.
 * 
 * It uses the same styling and structure as other admin cards for consistency.
 */
const AccountManagementCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body">
        <h2 className="card-title flex items-center">
          <FaUserShield className="text-primary mr-2" />
          Account Management
          
          <Tooltip content="Reset passwords and manage user accounts">
            <span className="badge badge-secondary ml-2">Admin</span>
          </Tooltip>
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Manage user accounts, reset passwords, and resolve login issues.
        </p>
        
        <div className="card-actions justify-end mt-auto">
          <Link to="/admin/account-management" className="btn btn-primary">
            Manage Accounts
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountManagementCard;
