import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Game } from '../../types/game';

interface GameHeaderProps {
  game: Game;
  isRegistrationOpen: boolean;
  isRegistrationClosed: boolean;
}

/**
 * GameHeader component displays the game title and key statistics
 * Shows game number, date, time, and registration stats
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  isRegistrationOpen,
  isRegistrationClosed,
}) => {
  // Get the total number of registrations
  const currentlyRegistered = game.game_registrations?.length || 0;

  // Format the date if it exists
  const formattedDate = game.date ? format(new Date(game.date), 'EEEE, do MMMM yyyy') : '';
  const formattedTime = game.time ? format(new Date(`2000-01-01T${game.time}`), 'h:mm a') : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Game Title and Date */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">WNF #{game.sequence_number || game.game_number || '29'}</h1>
        <div className="text-xl text-gray-600">
          {formattedDate && <div>{formattedDate}</div>}
          {formattedTime && <div>{formattedTime}</div>}
        </div>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-base-200 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-600">Total Players</div>
          <div className="text-4xl font-bold">{game.max_players || 0}</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-600">XP Slots</div>
          <div className="text-4xl font-bold">{(game.max_players || 0) - (game.random_slots || 0)}</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-600">Random Slots</div>
          <div className="text-4xl font-bold">{game.random_slots || 0}</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-600">Currently Registered</div>
          <div className="text-4xl font-bold">{currentlyRegistered}</div>
        </div>
      </div>
    </motion.div>
  );
};
