import { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { format } from 'date-fns';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { motion } from 'framer-motion';
import CountdownTimer from '../CountdownTimer';
import { useRegistrationClose } from '../../hooks/useRegistrationClose';
import { RegisteredPlayers } from './RegisteredPlayers';
import { PlayerSelectionResults } from '../games/PlayerSelectionResults';
import { TeamSelectionResults } from '../games/TeamSelectionResults';

interface Props {
  game: Game;
  isRegistrationClosed: boolean;
  isUserRegistered: boolean;
  handleRegistration: () => Promise<void>;
  handlePlayerSelection: (params: {
    gameId: number;
    maxPlayers: number;
    randomSlots: number;
  }) => Promise<{
    selectedPlayers: any[];
    reservePlayers: any[];
  }>;
  handleGameUpdate: () => Promise<void>;
  children?: React.ReactNode;
}

export const GameDetails: React.FC<Props> = ({
  game,
  isRegistrationClosed,
  isUserRegistered,
  handleRegistration,
  handlePlayerSelection,
  handleGameUpdate,
  children
}) => {
  const [isRegistering, setIsRegistering] = useState(false);

  // Use the registration close hook
  useRegistrationClose({
    game,
    onGameUpdated: async () => {
      // Notify parent to refresh data instead of reloading page
      if (handleGameUpdate) {
        await handleGameUpdate();
      }
    }
  });

  const handleRegisterClick = async () => {
    try {
      setIsRegistering(true);
      await handleRegistration();
    } catch (error) {
      console.error('Error handling registration:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {format(new Date(game.date), 'EEEE, MMMM do yyyy')}
            </h2>
            <p className="text-sm text-gray-500">
              {format(new Date(game.date), 'h:mm a')}
            </p>
            {game.venue && (
              <p className="mt-2 text-gray-600">
                Venue: {game.venue.name}
                {game.venue.google_maps_url && (
                  <a
                    href={game.venue.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 hover:text-blue-600"
                  >
                    (View Map)
                  </a>
                )}
              </p>
            )}
          </div>

          {/* Registration button */}
          {game.status === 'open' && !isRegistrationClosed && (
            <button
              onClick={handleRegisterClick}
              disabled={isRegistering}
              className={`btn ${
                isUserRegistered ? 'btn-error' : 'btn-success'
              } ${isRegistering ? 'loading' : ''}`}
            >
              {isRegistering ? (
                'Processing...'
              ) : isUserRegistered ? (
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unregister Interest
                </span>
              ) : (
                'Register Interest'
              )}
            </button>
          )}
        </div>

        {/* Game configuration details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Total Players</div>
            <div className="stat-value">{game.max_players}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">XP Spots</div>
            <div className="stat-value">{game.max_players - game.random_slots}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Random Spots</div>
            <div className="stat-value">{game.random_slots}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Currently Registered</div>
            <div className="stat-value">{game.registrations_count || 0}</div>
          </div>
        </div>

        {/* Game Status Information */}
        <div className="mt-6 space-y-4">
          {/* Registration Window */}
          {game.status === 'upcoming' && (
            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Registration Opens In</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Opens: {format(new Date(game.registration_window_start), 'MMM do h:mm a')}
                    <br />
                    Closes: {format(new Date(game.registration_window_end), 'MMM do h:mm a')}
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <CountdownTimer targetDate={new Date(game.registration_window_start)} />
                </div>
              </div>
            </div>
          )}

          {game.status === 'open' && (
            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Registration Window</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Opens: {format(new Date(game.registration_window_start), 'MMM do h:mm a')}
                    <br />
                    Closes: {format(new Date(game.registration_window_end), 'MMM do h:mm a')}
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <CountdownTimer targetDate={new Date(game.registration_window_end)} />
                </div>
              </div>
            </div>
          )}

          {game.status === 'players_announced' && (
            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Team Announcement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Teams will be announced at: {format(new Date(game.team_announcement_time), 'MMM do h:mm a')}
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <CountdownTimer targetDate={new Date(game.team_announcement_time)} />
                </div>
              </div>
            </div>
          )}

          {game.status === 'teams_announced' && (
            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Game Start</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Game starts at: {format(new Date(game.date), 'MMM do h:mm a')}
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <CountdownTimer targetDate={new Date(game.date)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Player Lists */}
        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
};