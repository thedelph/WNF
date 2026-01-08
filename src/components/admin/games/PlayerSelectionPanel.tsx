import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';
import { Tooltip } from '../../ui/Tooltip';

interface PlayerSelectionPanelProps {
  title: string;
  players: Array<{ id: string; friendly_name: string; shield_tokens_available?: number }>;
  selectedPlayerIds: string[];
  onPlayerSelect: (id: string) => void;
  onShieldClick?: (playerId: string) => void;
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
  onShieldClick,
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
              className={`flex items-center justify-between p-3 sm:p-4 hover:bg-base-200 text-sm sm:text-base ${
                selectedPlayerIds.includes(player.id) ? 'bg-primary text-primary-content' : ''
              }`}
            >
              <div
                className="flex items-center flex-grow cursor-pointer"
                onClick={() => onPlayerSelect(player.id)}
              >
                <span className="truncate mr-2">{player.friendly_name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onShieldClick && (player.shield_tokens_available ?? 0) > 0 && (
                  <Tooltip content={`Use shield token (${player.shield_tokens_available} available)`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShieldClick(player.id);
                      }}
                      className="btn btn-xs btn-warning btn-outline"
                    >
                      🛡️
                    </button>
                  </Tooltip>
                )}
                <div
                  className="cursor-pointer"
                  onClick={() => onPlayerSelect(player.id)}
                >
                  {selectedPlayerIds.includes(player.id) ? (
                    <FaCheckSquare className="text-primary-content w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <FaSquare className="text-base-content w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayerSelectionPanel;
