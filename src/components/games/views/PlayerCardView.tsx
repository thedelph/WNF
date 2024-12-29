import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PlayerCard from '../../PlayerCard';
import { SelectedPlayer } from '../../../types/game';

interface PlayerCardViewProps {
  players: SelectedPlayer[];
  title: string;
}

/**
 * PlayerCardView component displays players in a grid of cards
 * sorted alphabetically by friendly name with collapsible sections
 */
export const PlayerCardView: React.FC<PlayerCardViewProps> = ({ players, title }) => {
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedPlayers.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlayerCard
                      id={player.id}
                      friendlyName={player.friendly_name}
                      caps={player.caps || 0}
                      preferredPosition=""
                      activeBonuses={player.active_bonuses || 0}
                      activePenalties={player.active_penalties || 0}
                      winRate={player.win_rate || 0}
                      currentStreak={player.current_streak || 0}
                      maxStreak={player.max_streak || 0}
                      rarity={player.rarity as any}
                      avatarSvg={player.avatar_svg || ''}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
