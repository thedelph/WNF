import React from 'react';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

/**
 * Displays an alert when the user has unpaid games
 * Shows the number of unpaid games and their sequence numbers
 */
export const UnpaidGamesAlert = () => {
  const { status, unpaidGames, loading } = usePaymentStatus();

  if (loading || status !== 'unpaid' || unpaidGames.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="alert alert-warning shadow-lg mb-4"
    >
      <AlertTriangle className="w-6 h-6" />
      <div className="flex flex-col">
        <h3 className="font-bold">
          You have {unpaidGames.length} unpaid {unpaidGames.length === 1 ? 'game' : 'games'}
        </h3>
        <Tooltip
          content={
            <div className="space-y-1 p-2">
              {unpaidGames.map(game => (
                <div key={game.game_id} className="text-sm">
                  WNF #{game.sequence_number} - {format(new Date(game.date), 'MMM d, yyyy')}
                </div>
              ))}
            </div>
          }
        >
          <span className="text-sm cursor-help">
            Click to see unpaid games
          </span>
        </Tooltip>
      </div>
    </motion.div>
  );
};
