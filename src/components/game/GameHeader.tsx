import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface GameHeaderProps {
  gameNumber: number;
  date: string;
  time: string;
  totalPlayers: number;
  xpSlots: number;
  randomSlots: number;
  currentlyRegistered: number;
}

/**
 * GameHeader component displays the game title and key statistics
 * Shows game number, date, time, and registration stats
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  gameNumber,
  date,
  time,
  totalPlayers,
  xpSlots,
  randomSlots,
  currentlyRegistered,
}) => {
  // Format the date and time
  const formattedDate = format(new Date(date), 'EEEE, do MMMM yyyy');
  const formattedTime = format(new Date(`2000-01-01T${time}`), 'h:mm a');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Game Title and Date */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">WNF #{gameNumber}</h1>
        <div className="text-xl text-gray-600">
          <div>{formattedDate}</div>
          <div>{formattedTime}</div>
        </div>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-base-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Players</div>
          <div className="text-4xl font-bold">{totalPlayers}</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">XP Slots</div>
          <div className="text-4xl font-bold">{xpSlots}</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Random Slots</div>
          <div className="text-4xl font-bold">{randomSlots}</div>
        </div>
        <div className="bg-base-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Currently Registered</div>
          <div className="text-4xl font-bold">{currentlyRegistered}</div>
        </div>
      </div>
    </motion.div>
  );
};
