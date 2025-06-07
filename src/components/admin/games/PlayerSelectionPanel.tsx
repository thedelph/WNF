import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';

interface PlayerSelectionPanelProps {
  title: string;
  players: Array<{ id: string; friendly_name: string }>;
  selectedPlayerIds: string[];
  onPlayerSelect: (id: string) => void;
  className?: string;
}

/**
 * Component for displaying and selecting players from a list
 */
export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  title,
  players,
  selectedPlayerIds,
  onPlayerSelect,
  className = ''
}) => {
  return (
    <div className={className}>
      <h3 className="font-bold mb-2 text-base sm:text-lg">{title}</h3>
      <div className="h-80 overflow-y-auto border border-base-300 rounded-lg">
        <AnimatePresence>
          {players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-between p-3 sm:p-4 hover:bg-base-200 cursor-pointer text-sm sm:text-base ${
                selectedPlayerIds.includes(player.id) ? 'bg-primary text-primary-content' : ''
              }`}
              onClick={() => onPlayerSelect(player.id)}
            >
              <span className="truncate mr-2">{player.friendly_name}</span>
              {selectedPlayerIds.includes(player.id) ? (
                <FaCheckSquare className="text-primary-content w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              ) : (
                <FaSquare className="text-base-content w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayerSelectionPanel;
