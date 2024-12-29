import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SelectedPlayer } from '../../../types/game';

interface PlayerListViewProps {
  players: SelectedPlayer[];
  title: string;
}

/**
 * PlayerListView component displays players in a simple list format
 * sorted alphabetically by friendly name with collapsible sections
 */
export const PlayerListView: React.FC<PlayerListViewProps> = ({ players, title }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Sort players alphabetically by friendly name
  const sortedPlayers = [...players].sort((a, b) => 
    a.friendly_name.localeCompare(b.friendly_name)
  );

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-base-200 rounded-t-lg hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <span className="text-sm text-base-content/60">
            ({players.length} {players.length === 1 ? 'player' : 'players'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-base-200 rounded-b-lg p-4">
              <ul className="space-y-2">
                {sortedPlayers.map((player) => (
                  <motion.li
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      flex items-center p-3 rounded-lg
                      ${player.team === 'blue' ? 'bg-blue-900/20' : player.team === 'orange' ? 'bg-orange-900/20' : 'bg-base-300'}
                      hover:bg-base-300 transition-colors
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {player.avatar_svg && (
                        <img 
                          src={player.avatar_svg} 
                          alt={player.friendly_name} 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="font-medium">{player.friendly_name}</span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
