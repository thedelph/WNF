import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export const ShieldTokenManagementCard: React.FC = () => {
  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <Shield className="text-purple-500" />
          Shield Tokens
        </h2>
        <p>Manage shield tokens for streak protection, view usage statistics, and handle token distribution</p>
        <div className="card-actions justify-end">
          <Link to="/admin/shields" className="btn btn-primary">Manage Shields</Link>
        </div>
      </div>
    </motion.div>
  );
};
