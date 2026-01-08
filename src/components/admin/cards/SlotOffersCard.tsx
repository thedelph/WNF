import React from 'react';
import { motion } from 'framer-motion';
import { InboxIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Admin card component for managing slot offers
 * Provides quick access to slot offer management functionality
 */
export const SlotOffersCard = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="card bg-base-100 shadow-xl cursor-pointer"
      onClick={() => navigate('/admin/slot-offers')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="card-body">
        <h2 className="card-title">
          <InboxIcon className="w-6 h-6" />
          Slot Offers
        </h2>
        <p>Manage and oversee slot offers for games. Accept or decline offers on behalf of players.</p>
      </div>
    </motion.div>
  );
};
