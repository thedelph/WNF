import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PiCoinDuotone } from "react-icons/pi";
import { Registration } from '../../types/playerSelection';
import { useUser } from '../../hooks/useUser';
import { Tooltip } from '../ui/Tooltip';
import { toUrlFriendly } from '../../utils/urlHelpers';

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
  
  // Sort players: Priority Token users first (by XP), then remaining players by XP
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const aXp = playerStats[a.player.id]?.xp || 0;
    const bXp = playerStats[b.player.id]?.xp || 0;
    
    // If both players are using tokens or neither is, sort by XP
    if (a.using_token === b.using_token) {
      return bXp - aXp;
    }
    
    // If only one player is using a token, they come first
    return a.using_token ? -1 : 1;
  });

  // Count only tokens used by players who wouldn't make it on XP alone
  const tokensAffectingCutoff = sortedRegistrations
    .filter((reg, index) => {
      // If using token and would NOT make it on XP alone (index >= xpSlots)
      return reg.using_token && index >= xpSlots;
    })
    .length;

  // Adjust XP slots based on tokens that affect the cutoff
  const adjustedXpSlots = xpSlots - tokensAffectingCutoff;

  return (
    <div className="container mx-auto space-y-4">
      {/* Player List */}
      <div className="space-y-2">
        {sortedRegistrations.map((registration, index) => {
          const xp = playerStats[registration.player.id]?.xp || 0;
          const isLastXpSlot = index === xpSlots - 1 && !registration.using_token;

          return (
            <React.Fragment key={registration.player.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center justify-between rounded-lg ${registration.using_token ? 'bg-base-200' : 'bg-base-300'} p-3 hover:bg-base-200 transition-colors`}
              >
                <Link 
                  to={`/player/${toUrlFriendly(registration.player.friendly_name)}`}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:text-primary">
                      {registration.player.friendly_name}
                    </span>
                    {registration.player.id === currentPlayer?.id && (
                      <span className="badge badge-sm badge-primary">You</span>
                    )}
                    {registration.using_token && (
                      <Tooltip content="Using Priority Token">
                        <PiCoinDuotone size={16} className="text-yellow-400" />
                      </Tooltip>
                    )}
                  </div>
                  <span className="text-sm text-base-content/70">{xp.toLocaleString()} XP</span>
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
