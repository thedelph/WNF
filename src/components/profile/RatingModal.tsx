import React from 'react';
import { motion } from 'framer-motion';
import { PlayerStats } from '../../types/player';
import StarRating from '../StarRating';

interface RatingModalProps {
  player: PlayerStats;
  ratings: {
    attack: number;
    defense: number;
  };
  setRatings: React.Dispatch<React.SetStateAction<{
    attack: number;
    defense: number;
  }>>;
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * Modal component for rating a player's attack and defense skills
 * Allows users to rate on a scale of 0-5 stars (internally 0-10 for half stars)
 */
export const RatingModal: React.FC<RatingModalProps> = ({
  player,
  ratings,
  setRatings,
  onClose,
  onSubmit
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-lg p-6 max-w-md w-full space-y-4"
      >
        <h2 className="text-xl font-semibold">
          Rate {player?.friendly_name}
        </h2>
        
        <div className="space-y-4">
          <StarRating
            rating={ratings.attack}
            onChange={(value) => setRatings(prev => ({ ...prev, attack: value }))}
            label="Attack Rating"
          />
          <StarRating
            rating={ratings.defense}
            onChange={(value) => setRatings(prev => ({ ...prev, defense: value }))}
            label="Defense Rating"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-ghost"
            onClick={onClose}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary"
            onClick={onSubmit}
          >
            Submit Rating
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
