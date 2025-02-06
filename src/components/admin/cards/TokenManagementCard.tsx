import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCoins } from 'react-icons/fa';

export const TokenManagementCard: React.FC = () => {
  return (
    <motion.div 
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <FaCoins className="text-yellow-500" />
          Token Management
        </h2>
        <p>Manage player tokens, view usage statistics, and handle token distribution</p>
        <div className="card-actions justify-end">
          <Link to="/admin/tokens" className="btn btn-primary">Manage Tokens</Link>
        </div>
      </div>
    </motion.div>
  );
};
