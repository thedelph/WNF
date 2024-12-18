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
      <h3 className="font-bold mb-2">{title}</h3>
      <div className="h-80 overflow-y-auto border border-base-300 rounded-lg">
        <AnimatePresence>
          {players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center justify-between p-2 hover:bg-base-200 cursor-pointer ${
                selectedPlayerIds.includes(player.id) ? 'bg-primary text-primary-content' : ''
              }`}
              onClick={() => onPlayerSelect(player.id)}
            >
              <span>{player.friendly_name}</span>
              {selectedPlayerIds.includes(player.id) ? (
                <FaCheckSquare className="text-primary-content" />
              ) : (
                <FaSquare className="text-base-content" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayerSelectionPanel;
