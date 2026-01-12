import React from 'react';
import { motion } from 'framer-motion';
import { PiCoinDuotone } from "react-icons/pi";
import { IoLocationOutline, IoTimeOutline, IoCalendarClearOutline } from "react-icons/io5";
import { Game } from '../../types/game';
import CountdownTimer from '../../components/CountdownTimer';
import WeatherCard from '../../components/weather/WeatherCard';
import { Tooltip } from '../../components/ui/Tooltip';
import { formatDate, formatTime, utcToUkTime } from '../../utils/dateUtils';

interface GameHeaderProps {
  game: Game;
  isRegistrationOpen: boolean;
  isRegistrationClosed: boolean;
  weatherCardProps?: {
    venueAddress: string;
    venueName: string;
    gameDateTime: string;
    isVisible: boolean;
    onToggle: () => void;
  };
}

/**
 * GameHeader component displays the game title and key statistics
 * Shows game number, date, time, venue, and registration stats
 * 
 * IMPORTANT TIMEZONE NOTES:
 * - Game times are stored in UTC in the database
 * - When creating a game, the input time (UK local time) is converted to UTC for storage
 * - When displaying, we convert from UTC back to UK time (which adds +1 hour during BST)
 * - This ensures times are always displayed correctly regardless of daylight saving time
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  isRegistrationOpen,
  isRegistrationClosed,
  weatherCardProps
}) => {
  // Get the total number of registrations (excluding 'absent' status - token-only players who didn't register)
  const currentlyRegistered = game.game_registrations?.filter(reg => reg.status !== 'absent')?.length || 0;

  // Count priority token users
  const priorityTokenCount = game.game_registrations?.filter(reg => reg.using_token === true)?.length || 0;

  // Format the date and time using timezone-aware utility functions
  const formattedDate = game.date ? formatDate(utcToUkTime(new Date(game.date))) : '';
  
  // Note: formatTime already handles timezone conversion internally
  const kickoffTime = game.date ? formatTime(game.date) : '';

  // Determine which countdown to show based on game status and dates
  const now = new Date();
  let nextEvent = null;
  let nextEventLabel = '';
  let nextEventColor = '';

  if (game.status === 'upcoming') {
    if (game.registration_window_start && new Date(game.registration_window_start) > now) {
      nextEvent = new Date(game.registration_window_start);
      nextEventLabel = 'Registration Opens';
      nextEventColor = 'text-blue-500';
    }
  } else if (game.status === 'open') {
    if (game.registration_window_end && new Date(game.registration_window_end) > now) {
      nextEvent = new Date(game.registration_window_end);
      nextEventLabel = 'Registration Closes';
      nextEventColor = 'text-orange-500';
    }
  } else if (game.status === 'players_announced' && game.team_announcement_time && new Date(game.team_announcement_time) > now) {
    nextEvent = new Date(game.team_announcement_time);
    nextEventLabel = 'Teams Announced';
    nextEventColor = 'text-green-500';
  }

  // Determine the status text based on registration state and game status
  const getStatusText = () => {
    if (isRegistrationOpen) return 'Open';
    if (isRegistrationClosed) return 'Closed';
    if (game.status === 'players_announced') return 'Players Selected';
    if (game.status === 'teams_announced') return 'Teams Announced';
    return 'Not Open Yet';
  };

  // Determine the status color based on registration state
  const getStatusColor = () => {
    if (isRegistrationOpen) return 'text-success';
    if (isRegistrationClosed) return 'text-error';
    return 'text-warning';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Game Number and Title */}
      <div className="text-center">
        <motion.h1 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
        >
          WNF #{game.sequence_number || '29'}
        </motion.h1>
      </div>

      {/* Game Info Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Date, Time, Location Card */}
        <div className="bg-base-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <IoCalendarClearOutline className="text-primary" size={18} />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IoTimeOutline className="text-primary" size={18} />
              <span>{kickoffTime}</span>
            </div>
            {game.venue?.name && (
              <div className="flex items-center gap-2 text-sm">
                <IoLocationOutline className="text-primary" size={18} />
                <span>
                  {game.venue.name}
                  {game.venue.google_maps_url && (
                    <a 
                      href={game.venue.google_maps_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-primary hover:underline"
                    >
                      Map
                    </a>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Weather Card - Positioned right after location details */}
        {weatherCardProps && (
          <div>
            <Tooltip content="Weather forecast for game day">
              <div className="bg-base-200 rounded-lg overflow-hidden">
                <WeatherCard
                  venueAddress={weatherCardProps.venueAddress}
                  venueName={weatherCardProps.venueName}
                  gameDateTime={weatherCardProps.gameDateTime}
                  isVisible={weatherCardProps.isVisible}
                  onToggle={weatherCardProps.onToggle}
                />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Next Event Card */}
        {nextEvent && (
          <div className="bg-base-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${nextEventColor}`}>
                {nextEventLabel}
              </span>
              <CountdownTimer targetDate={nextEvent} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(utcToUkTime(nextEvent))}
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="bg-base-200 rounded-lg p-4">
          {/* Registration Status */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Registration Status:</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-gray-600 dark:text-gray-300">Players Registered</span>
              <span className={`text-sm font-medium ${currentlyRegistered > game.max_players ? 'text-orange-500' : ''}`}>
                {currentlyRegistered}/{game.max_players}
              </span>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 transition-all duration-300 ${
                  currentlyRegistered > game.max_players 
                    ? 'bg-gradient-to-r from-primary to-orange-500' 
                    : 'bg-primary'
                }`}
                style={{ 
                  width: `${Math.min(((currentlyRegistered) / (game.max_players || 1)) * 100, 100)}%`,
                }}
              />
              {currentlyRegistered > game.max_players && (
                <div 
                  className="h-2.5 bg-orange-500/30 transition-all duration-300 relative -mt-2.5"
                  style={{ 
                    width: `${((currentlyRegistered - game.max_players) / (game.max_players || 1)) * 100}%`,
                  }}
                />
              )}
            </div>
            {currentlyRegistered > game.max_players && (
              <div className="text-xs text-orange-500 mt-1">
                {currentlyRegistered - game.max_players} players on reserve list
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {(game.max_players || 0) - (game.random_slots || 0) - priorityTokenCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                XP Slots
              </div>
            </div>

            <div className="text-center border-l border-r border-gray-300 dark:border-gray-600 px-3">
              <div className="text-2xl font-bold mb-1 flex items-center justify-center gap-1">
                {game.random_slots || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                Random Slots
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold mb-1 flex items-center justify-center gap-1">
                {priorityTokenCount}
                <PiCoinDuotone className="text-yellow-500" />
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                Priority Tokens
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
