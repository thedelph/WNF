import React, { useEffect, useState } from 'react';
import { FaUser, FaUserClock } from 'react-icons/fa';
import { calculatePlayerXP, PlayerStats } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { supabase } from '../../utils/supabase';

interface Player {
  id: string;
  friendly_name: string;
  isRandomlySelected?: boolean;
  xp: number;
  stats?: PlayerStats;
}

interface ExtendedPlayerData {
  id: string;
  friendly_name: string;
  preferred_position: string;
  win_rate: number;
  max_streak: number;
  avatar_svg: string;
  stats: PlayerStats;
}

interface PlayerSelectionResultsProps {
  selectedPlayers: Player[];
  reservePlayers: Player[];
}

export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({
  selectedPlayers,
  reservePlayers
}) => {
  const [extendedPlayerData, setExtendedPlayerData] = useState<Record<string, ExtendedPlayerData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allPlayers = [...selectedPlayers, ...reservePlayers];
        if (allPlayers.length === 0) {
          setLoading(false);
          return;
        }

        // Create a Set of unique player IDs to prevent duplicates
        const uniquePlayerIds = [...new Set(allPlayers.map(p => p.id))];
        console.log('DEBUG: Player IDs being queried:', uniquePlayerIds);

        // Add debug for sample player
        const samplePlayer = allPlayers[0];
        console.log('DEBUG: Sample player data:', {
          id: samplePlayer.id,
          friendly_name: samplePlayer.friendly_name,
          xp: samplePlayer.xp,
          stats: samplePlayer.stats
        });

        // Query all players at once - this works in PlayerCardGrid
        const { data: allPlayerData, error } = await supabase
          .from('game_registrations')
          .select(`
            id,
            player:players!game_registrations_player_id_fkey (
              id,
              friendly_name,
              preferred_position,
              win_rate,
              max_streak,
              avatar_svg,
              caps,
              active_bonuses,
              active_penalties,
              current_streak
            )
          `)
          .in('id', uniquePlayerIds);

        if (error) {
          console.error('DEBUG: Supabase query error:', {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        if (!allPlayerData || allPlayerData.length === 0) {
          console.warn('DEBUG: No player data returned from database');
          throw new Error('No player data found in database');
        }

        // Debug raw data
        console.log('DEBUG: Raw registration data sample:', allPlayerData[0]);

        // Map the data to our expected format
        const playerDataMap = allPlayerData.reduce((acc, registration) => {
          const player = registration.player;
          if (player) {
            const stats = {
              caps: player.caps || 0,
              activeBonuses: player.active_bonuses || 0,
              activePenalties: player.active_penalties || 0,
              currentStreak: player.current_streak || 0
            };

            acc[registration.id] = {
              id: player.id,
              friendly_name: player.friendly_name,
              preferred_position: player.preferred_position || '',
              win_rate: player.win_rate || 0,
              max_streak: player.max_streak || 0,
              avatar_svg: player.avatar_svg || '',
              stats
            };
          }
          return acc;
        }, {} as Record<string, ExtendedPlayerData>);

        console.log('DEBUG: Final player data map:', Object.values(playerDataMap).map(p => ({ 
          id: p.id, 
          friendly_name: p.friendly_name,
          stats: p.stats
        })));

        setExtendedPlayerData(playerDataMap);
      } catch (error) {
        console.error('Error fetching extended player data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPlayers, reservePlayers]);

  const getCalculatedXP = (player: Player): number => {
    if (!player.stats) return player.xp;
    return calculatePlayerXP(player.stats);
  };

  // Add null checks and provide default empty arrays
  const sortedSelectedPlayers = (selectedPlayers || []).sort(
    (a, b) => getCalculatedXP(b) - getCalculatedXP(a)
  );

  const sortedReservePlayers = (reservePlayers || []).sort(
    (a, b) => getCalculatedXP(b) - getCalculatedXP(a)
  );

  // Calculate rarity based on all players' XP
  const allXPValues = [...sortedSelectedPlayers, ...sortedReservePlayers].map(p => getCalculatedXP(p));

  const renderPlayerSection = (players: Player[], title: string, icon: JSX.Element) => (
    <div>
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        {icon}
        {title} ({players.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div>Loading player data...</div>
        ) : (
          players.map((player) => {
            const extendedData = extendedPlayerData[player.id];
            if (!extendedData) {
              // Use the basic player data if extended data is not available
              return (
                <div key={player.id} className="relative">
                  {player.isRandomlySelected && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                      Random Pick
                    </div>
                  )}
                  <PlayerCard
                    id={player.id}
                    friendlyName={player.friendly_name}
                    caps={player.stats?.caps || 0}
                    preferredPosition=""
                    activeBonuses={player.stats?.activeBonuses || 0}
                    activePenalties={player.stats?.activePenalties || 0}
                    winRate={0}
                    currentStreak={player.stats?.currentStreak || 0}
                    maxStreak={0}
                    rarity={calculateRarity(getCalculatedXP(player), allXPValues)}
                    avatarSvg=""
                  />
                </div>
              );
            }

            return (
              <div key={player.id} className="relative">
                {player.isRandomlySelected && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                    Random Pick
                  </div>
                )}
                <PlayerCard
                  id={player.id}
                  friendlyName={extendedData.friendly_name}
                  caps={player.stats?.caps || 0}
                  preferredPosition={extendedData.preferred_position || ''}
                  activeBonuses={player.stats?.activeBonuses || 0}
                  activePenalties={player.stats?.activePenalties || 0}
                  winRate={extendedData.win_rate}
                  currentStreak={player.stats?.currentStreak || 0}
                  maxStreak={extendedData.max_streak}
                  rarity={calculateRarity(getCalculatedXP(player), allXPValues)}
                  avatarSvg={extendedData.avatar_svg || ''}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderPlayerSection(
        sortedSelectedPlayers,
        'Selected Players',
        <FaUser className="text-green-500" />
      )}
      {sortedReservePlayers.length > 0 && renderPlayerSection(
        sortedReservePlayers,
        'Reserve Players',
        <FaUserClock className="text-orange-500" />
      )}
    </div>
  );
};