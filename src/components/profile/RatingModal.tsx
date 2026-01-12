import React from 'react';
import { motion } from 'framer-motion';
import { PlayerStats } from '../../types/player';
import StarRating from '../StarRating';
import PlaystyleSelector from '../ratings/PlaystyleSelector';
import PositionSelector from '../ratings/PositionSelector';
import { AttributeCombination } from '../../types/playstyle';
import { Position } from '../../types/positions';

interface RatingModalProps {
  player: PlayerStats;
  ratings: {
    attack: number;
    defense: number;
    gameIq: number;
    gk: number;
  };
  setRatings: React.Dispatch<React.SetStateAction<{
    attack: number;
    defense: number;
    gameIq: number;
    gk: number;
  }>>;
  selectedAttributes: AttributeCombination | null;
  onAttributesChange: (attributes: AttributeCombination | null) => void;
  selectedPositions: { first?: Position; second?: Position; third?: Position };
  onPositionsChange: (positions: { first?: Position; second?: Position; third?: Position }) => void;
  onClose: () => void;
  onSubmit: () => void;
  isViewingAs?: boolean;
  viewingAsName?: string;
}

/**
 * Modal component for rating a player's attack, defense, game IQ, and GK skills
 * Also includes position preferences and playstyle selection
 * Allows users to rate on a scale of 0-5 stars (internally 0-10 for half stars)
 */
export const RatingModal: React.FC<RatingModalProps> = ({
  player,
  ratings,
  setRatings,
  selectedAttributes,
  onAttributesChange,
  selectedPositions,
  onPositionsChange,
  onClose,
  onSubmit,
  isViewingAs = false,
  viewingAsName
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
        className="bg-base-200 rounded-lg p-4 sm:p-6 max-w-md w-full space-y-4 relative z-50 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-semibold">
          Rate {player?.friendly_name}
        </h2>

        {/* ViewAs Mode Warning */}
        {isViewingAs && viewingAsName && (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-bold">View-Only Mode</div>
              <div className="text-xs">You're viewing what {viewingAsName} sees. Cannot submit ratings in this mode.</div>
            </div>
          </div>
        )}

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
          <StarRating
            rating={ratings.gameIq}
            onChange={(value) => setRatings(prev => ({ ...prev, gameIq: value }))}
            label="Game IQ Rating"
          />
          <StarRating
            rating={ratings.gk}
            onChange={(value) => setRatings(prev => ({ ...prev, gk: value }))}
            label="GK Rating"
          />
          <PositionSelector
            selectedPositions={selectedPositions}
            onPositionsChange={onPositionsChange}
            disabled={isViewingAs}
          />
          <PlaystyleSelector
            selectedAttributes={selectedAttributes}
            onAttributesChange={onAttributesChange}
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
            whileHover={{ scale: isViewingAs ? 1 : 1.05 }}
            whileTap={{ scale: isViewingAs ? 1 : 0.95 }}
            className={`btn ${isViewingAs ? 'btn-disabled' : 'bg-primary hover:bg-primary/90'} text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2`}
            onClick={isViewingAs ? undefined : onSubmit}
            disabled={isViewingAs}
          >
            <span className="inline-flex items-center justify-center w-4 h-4">⭐</span>
            <span className="font-medium">
              {isViewingAs ? 'CANNOT SUBMIT (VIEW-ONLY)' : 'SUBMIT RATING'}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
