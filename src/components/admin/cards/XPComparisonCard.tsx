import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PiChartLineUp } from "react-icons/pi";

export const XPComparisonCard: React.FC = () => {
  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <PiChartLineUp className="text-primary" />
          XP System v2
        </h2>
        <p>Compare current XP calculations with v2 system (diminishing streak returns + linear decay)</p>
        <div className="card-actions justify-end">
          <Link to="/admin/xp-comparison" className="btn btn-primary">View Comparison</Link>
        </div>
      </div>
    </motion.div>
  );
};
