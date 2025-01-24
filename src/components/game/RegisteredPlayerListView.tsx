import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Registration } from '../../types/playerSelection';
import { useUser } from '../../hooks/useUser';

interface RegisteredPlayerListViewProps {
  registrations: Registration[];
  playerStats: Record<string, any>;
  stats: Record<string, any>;
  xpSlots: number;
}

/**
 * List view component for displaying registered players in a compact format
 * Shows player names and XP in a card layout with responsive design
 */
export const RegisteredPlayerListView: React.FC<RegisteredPlayerListViewProps> = ({
  registrations,
  playerStats,
  stats,
  xpSlots,
}) => {
  const { player: currentPlayer } = useUser();
  
  // Sort players by XP
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const aXp = playerStats[a.player.id]?.xp || 0;
    const bXp = playerStats[b.player.id]?.xp || 0;
    return bXp - aXp; // Descending order
  });

  return (
    <div className="container mx-auto space-y-4">
      {/* Player List */}
      <div className="space-y-2">
        {sortedRegistrations.map((registration, index) => {
          const xp = playerStats[registration.player.id]?.xp || 0;
          const isLastXpSlot = index === xpSlots - 1;

          return (
            <React.Fragment key={registration.player.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-lg bg-base-300 p-3 hover:bg-base-200 transition-colors"
              >
                <Link 
                  to={`/players/${registration.player.id}`}
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium hover:text-primary">{registration.player.friendly_name}</span>
                    {registration.player.id === currentPlayer?.id && (
                      <span className="text-sm text-base-content/70">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{xp.toLocaleString()} XP</span>
                  </div>
                </Link>
              </motion.div>
              {isLastXpSlot && (
                <div className="text-xs text-base-content/50 text-center py-1 border-b border-dotted border-base-300">
                  XP Selection Cutoff
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
