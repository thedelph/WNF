import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Game } from '../../types/game';
import CountdownTimer from '../../components/CountdownTimer';

interface GameHeaderProps {
  game: Game;
  isRegistrationOpen: boolean;
  isRegistrationClosed: boolean;
}

/**
 * GameHeader component displays the game title and key statistics
 * Shows game number, date, time, venue, and registration stats
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  isRegistrationOpen,
  isRegistrationClosed,
}) => {
  // Get the total number of registrations
  const currentlyRegistered = game.game_registrations?.length || 0;

  // Format the date and time
  const formattedDate = game.date ? format(new Date(game.date), 'EEEE, do MMMM yyyy') : '';
  const kickoffTime = game.date ? format(new Date(game.date), '@ h:mmaaa') : '';

  // Determine which countdown to show
  const now = new Date();
  let nextEvent = null;
  let nextEventLabel = '';

  if (game.registration_window_start && new Date(game.registration_window_start) > now) {
    nextEvent = new Date(game.registration_window_start);
    nextEventLabel = 'Registration Opens in';
  } else if (game.registration_window_end && new Date(game.registration_window_end) > now) {
    nextEvent = new Date(game.registration_window_end);
    nextEventLabel = 'Registration Closes in';
  } else if (game.team_announcement_time && new Date(game.team_announcement_time) > now) {
    nextEvent = new Date(game.team_announcement_time);
    nextEventLabel = 'Teams Announced in';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Game Title, Date, and Venue */}
      <div className="text-center space-y-2">
        <div className="text-sm text-gray-500 mb-2">Demo Game - For Illustration Only</div>
        <h1 className="text-3xl font-bold">WNF #{game.sequence_number || game.game_number || '29'}</h1>
        <div className="text-xl text-gray-600">
          <div className="flex items-center justify-center space-x-2">
            <span>{formattedDate}</span>
            <span>{kickoffTime}</span>
          </div>
          {game.venue?.name && (
            <div className="text-lg text-gray-500 mt-2">
              {game.venue.name}
            </div>
          )}
        </div>
      </div>

      {/* Next Event Countdown */}
      {nextEvent && (
        <div className="text-center">
          <div className="bg-info/10 text-info rounded-lg p-4 inline-block">
            <div className="font-semibold mb-1">{nextEventLabel}</div>
            <CountdownTimer targetDate={nextEvent} />
          </div>
        </div>
      )}

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
