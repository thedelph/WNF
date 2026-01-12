import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInjuryTokenStats } from '../../../hooks/useInjuryTokenStatus';

export const InjuryTokenManagementCard: React.FC = () => {
  const { stats, loading } = useInjuryTokenStats();

  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <span className="text-2xl">🩹</span>
          <span className="text-amber-400">Injury Tokens</span>
        </h2>
        <p>Manage injury reserve players, review claims, and handle token activation</p>

        {/* Quick Stats */}
        <div className="stats stats-vertical bg-base-200 shadow mt-2">
          <div className="stat py-2">
            <div className="stat-title text-xs">Active Reserves</div>
            <div className="stat-value text-warning text-xl">
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                stats?.activeCount ?? 0
              )}
            </div>
          </div>
          <div className="stat py-2">
            <div className="stat-title text-xs">This Month</div>
            <div className="stat-value text-lg">
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                stats?.thisMonthCount ?? 0
              )}
            </div>
          </div>
        </div>

        <div className="card-actions justify-end mt-2">
          <Link to="/admin/injuries" className="btn btn-warning btn-outline">
            Manage Injuries
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default InjuryTokenManagementCard;
