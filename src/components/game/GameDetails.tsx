import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { calculateRarity } from '../../utils/rarityCalculations';
import { PlayerCard } from '../player-card/PlayerCard';
import { RegisteredPlayers } from './RegisteredPlayers';
import { ExtendedPlayerData } from '../../types/playerSelection';
import { CountdownTimer } from '../common/CountdownTimer';
import { format } from 'date-fns';

interface GameDetailsProps {
  game: {
    id: string;
    date: string;
    status: string;
    outcome?: string;
    notes?: string;
    max_players: number;
    random_slots: number;
    registration_window_start: string;
    registration_window_end: string;
    team_announcement_time?: string;
    venue?: {
      name: string;
      google_maps_url?: string;
    };
    game_registrations?: any[];
  };
  isUserRegistered: boolean;
  isRegistrationClosed: boolean;
  handleRegistration: () => Promise<void>;
  children?: React.ReactNode;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ 
  game, 
  isUserRegistered,
  isRegistrationClosed,
  handleRegistration,
  children
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<Record<string, { xp: number }>>({});
  const [priorityTokenCount, setPriorityTokenCount] = useState(0);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player stats for all players
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select('id, xp')
          .in('id', game.game_registrations?.map(player => player.id) || []);

        if (statsError) throw statsError;

        // Get count of players using priority tokens
        const { data: tokenData, error: tokenError } = await supabase
          .from('game_registrations')
          .select('id')
          .eq('game_id', game.id)
          .eq('used_token', true);

        if (tokenError) throw tokenError;

        // Set priority token count
        setPriorityTokenCount(tokenData?.length || 0);

        // Transform into a lookup object
        const statsLookup = statsData.reduce((acc, player) => {
          acc[player.id] = { xp: player.xp || 0 };
          return acc;
        }, {} as Record<string, { xp: number }>);

        setPlayerStats(statsLookup);
      } catch (error) {
        console.error('Error fetching player stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (game.game_registrations?.length > 0) {
      fetchPlayerStats();
    }
  }, [game.game_registrations, game.id]);

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

  // Group players by team
  const blueTeam = game.game_registrations?.filter(p => p.team === 'blue') || [];
  const orangeTeam = game.game_registrations?.filter(p => p.team === 'orange') || [];

  // Calculate rarity based on all players' XP
  const allXP = Object.values(playerStats).map(stats => stats.xp);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

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
        </div>

        {/* Game configuration details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Total Players</div>
            <div className="stat-value">{game.max_players}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">XP Slots</div>
            <div className="stat-value">{game.max_players - game.random_slots - priorityTokenCount}</div>
            <div className="stat-desc">After deducting token & random slots</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Priority Token Slots</div>
            <div className="stat-value text-primary">{priorityTokenCount}</div>
            <div className="stat-desc">Guaranteed slots</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Random Slots</div>
            <div className="stat-value">{game.random_slots}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title">Currently Registered</div>
            <div className="stat-value">{game.game_registrations?.length || 0}</div>
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

          {game.status === 'players_announced' && game.team_announcement_time && (
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

        {/* Teams */}
        <div className="mt-8 space-y-8">
          {/* Registered Players */}
          <div>
            <h3 className="text-xl font-bold mb-4">Registered Players</h3>
            <RegisteredPlayers 
              registrations={game.game_registrations?.map(reg => ({
                player: reg,
                status: reg.status || 'registered',
                created_at: reg.created_at
              })) || []}
              isUserRegistered={isUserRegistered}
              isRegistrationClosed={isRegistrationClosed}
              onRegister={handleRegisterClick}
              isRegistering={isRegistering}
              gameStatus={game.status}
            />
          </div>

          {/* Blue Team */}
          {blueTeam.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold text-blue-500">Blue Team</h3>
              <div className="grid grid-cols-1 gap-4">
                {blueTeam.map((player) => {
                  const playerXP = playerStats[player.id]?.xp || 0;
                  const rarity = calculateRarity(playerXP, allXP);

                  return (
                    <PlayerCard
                      key={player.id}
                      {...player}
                      xp={playerXP}
                      rarity={rarity}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Orange Team */}
          {orangeTeam.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-xl font-bold text-orange-500">Orange Team</h3>
              <div className="grid grid-cols-1 gap-4">
                {orangeTeam.map((player) => {
                  const playerXP = playerStats[player.id]?.xp || 0;
                  const rarity = calculateRarity(playerXP, allXP);

                  return (
                    <PlayerCard
                      key={player.id}
                      {...player}
                      xp={playerXP}
                      rarity={rarity}
                    />
                  );
                })}
              </div>
            </motion.div>
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