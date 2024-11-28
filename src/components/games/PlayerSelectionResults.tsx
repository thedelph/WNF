import React, { useEffect, useState } from 'react';
import { FaUser, FaUserClock, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePlayerXP, PlayerStats } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { supabase } from '../../utils/supabase';
import { useUser } from '../../hooks/useUser';

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
  const [selectedExpanded, setSelectedExpanded] = useState(false);
  const [reserveExpanded, setReserveExpanded] = useState(false);
  const { player: currentPlayer, loading: userLoading, error: userError } = useUser();

  useEffect(() => {
    console.log('Current Player:', currentPlayer);
    console.log('User Loading:', userLoading);
    console.log('User Error:', userError);
  }, [currentPlayer, userLoading, userError]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allPlayers = [...selectedPlayers, ...reservePlayers];
        if (allPlayers.length === 0) {
          setLoading(false);
          return;
        }

        // First, fetch the registration data to get player IDs
        const { data: registrationData, error: regError } = await supabase
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
          .in('id', allPlayers.map(p => p.id));

        if (regError) {
          console.error('Error fetching registration data:', regError);
          throw regError;
        }

        if (!registrationData) {
          console.warn('No registration data returned from database');
          throw new Error('No registration data found in database');
        }

        // Map the data to our expected format
        const playerDataMap = registrationData.reduce((acc, reg) => {
          if (!reg.player) return acc;

          const stats = {
            caps: reg.player.caps || 0,
            activeBonuses: reg.player.active_bonuses || 0,
            activePenalties: reg.player.active_penalties || 0,
            currentStreak: reg.player.current_streak || 0
          };

          // Store using registration ID as key for lookup, but keep player ID for comparison
          acc[reg.id] = {
            id: reg.player.id, // This is the actual player ID
            friendly_name: reg.player.friendly_name,
            preferred_position: reg.player.preferred_position || '',
            win_rate: reg.player.win_rate || 0,
            max_streak: reg.player.max_streak || 0,
            avatar_svg: reg.player.avatar_svg || '',
            stats
          };

          console.log('Mapped player data:', {
            registrationId: reg.id,
            playerId: reg.player.id,
            name: reg.player.friendly_name
          });

          return acc;
        }, {} as Record<string, ExtendedPlayerData>);

        setExtendedPlayerData(playerDataMap);
      } catch (error) {
        console.error('Error fetching player data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPlayers, reservePlayers]);

  // Debug logging for all players
  useEffect(() => {
    if (!loading && currentPlayer) {
      [...selectedPlayers, ...reservePlayers].forEach(player => {
        const extendedData = extendedPlayerData[player.id];
        console.log('All Players Comparison:', {
          player: player.friendly_name,
          registrationId: player.id,
          playerId: extendedData?.id,
          currentPlayerId: currentPlayer?.id,
          isCurrentUser: extendedData?.id === currentPlayer?.id,
          extendedData: !!extendedData
        });
      });
    }
  }, [selectedPlayers, reservePlayers, extendedPlayerData, currentPlayer, loading]);

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

  const renderPlayerSection = (players: Player[], title: string, icon: JSX.Element, isExpanded: boolean, setExpanded: (expanded: boolean) => void) => (
    <div className="mb-6">
      <button 
        onClick={() => setExpanded(!isExpanded)}
        className="w-full text-left text-xl font-semibold mb-3 flex items-center gap-2 hover:bg-gray-100 p-2 rounded transition-colors"
      >
        {icon}
        {title} ({players.length})
        {isExpanded ? <FaChevronDown className="ml-2" /> : <FaChevronRight className="ml-2" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 justify-items-end">
              {loading ? (
                <div>Loading player data...</div>
              ) : (
                players.map((player) => {
                  const extendedData = extendedPlayerData[player.id];
                  const isCurrentUser = extendedData?.id === currentPlayer?.id;
                  
                  return (
                    <div key={player.id} className="relative w-full">
                      {player.isRandomlySelected && (
                        <div className="absolute -top-2 right-0 -translate-x-full z-10 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          Random Pick
                        </div>
                      )}
                      {isCurrentUser && (
                        <div className="absolute -top-2 left-0 z-10 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          You
                        </div>
                      )}
                      <PlayerCard
                        id={extendedData?.id || player.id}
                        friendlyName={extendedData?.friendly_name || player.friendly_name}
                        caps={extendedData?.stats.caps || (player.stats?.caps || 0)}
                        preferredPosition={extendedData?.preferred_position || ''}
                        activeBonuses={extendedData?.stats.activeBonuses || (player.stats?.activeBonuses || 0)}
                        activePenalties={extendedData?.stats.activePenalties || (player.stats?.activePenalties || 0)}
                        winRate={extendedData?.win_rate || 0}
                        currentStreak={extendedData?.stats.currentStreak || (player.stats?.currentStreak || 0)}
                        maxStreak={extendedData?.max_streak || 0}
                        rarity={calculateRarity(getCalculatedXP(player), allXPValues)}
                        avatarSvg={extendedData?.avatar_svg || ''}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div>
      {renderPlayerSection(
        sortedSelectedPlayers,
        'Selected Players',
        <FaUser className="text-green-500" />,
        selectedExpanded,
        setSelectedExpanded
      )}
      {renderPlayerSection(
        sortedReservePlayers,
        'Reserve Players',
        <FaUserClock className="text-yellow-500" />,
        reserveExpanded,
        setReserveExpanded
      )}
    </div>
  );
};