import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { ExtendedPlayerData } from '../../types/playerSelection';
import { useGlobalXP } from '../../hooks/useGlobalXP';

interface Registration {
  player: ExtendedPlayerData;
  status: string;
  created_at: string;
}

interface RegisteredPlayersProps {
  registrations: Registration[];
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerStats, setPlayerStats] = React.useState<Record<string, { xp: number }>>({});
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  // Fetch player stats
  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get player stats for all registered players
        const playerIds = registrations.map(reg => reg.player.id);
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select('id, xp')
          .in('id', playerIds);

        if (statsError) throw statsError;

        // Transform into a lookup object
        const statsLookup = statsData.reduce((acc, player) => {
          acc[player.id] = { xp: player.xp || 0 };
          return acc;
        }, {} as Record<string, { xp: number }>);

        setPlayerStats(statsLookup);
      } catch (error) {
        console.error('Error fetching player stats:', error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching player stats');
      } finally {
        setLoading(false);
      }
    };

    if (registrations.length > 0) {
      fetchPlayerStats();
    } else {
      setLoading(false);
    }
  }, [registrations]);

  if (loading || globalXpLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || globalXpError) {
    return (
      <div className="text-center text-error p-4">
        <p>{error || globalXpError}</p>
      </div>
    );
  }

  // Sort registrations by XP in descending order
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const aXP = playerStats[a.player.id]?.xp || 0;
    const bXP = playerStats[b.player.id]?.xp || 0;
    return bXP - aXP;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 justify-items-center sm:justify-items-stretch">
        {sortedRegistrations.map((registration) => {
          const playerXP = playerStats[registration.player.id]?.xp || 0;
          const rarity = calculateRarity(playerXP, globalXpValues);

          return (
            <motion.div
              key={registration.player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PlayerCard
                id={registration.player.id}
                friendlyName={registration.player.friendly_name}
                xp={playerXP}
                caps={registration.player.caps}
                preferredPosition={registration.player.preferred_position || ''}
                activeBonuses={registration.player.active_bonuses}
                activePenalties={registration.player.active_penalties}
                winRate={registration.player.win_rate}
                currentStreak={registration.player.current_streak}
                maxStreak={registration.player.max_streak}
                rarity={rarity}
                avatarSvg={registration.player.avatar_svg || ''}
                status={registration.status === 'reserve' ? 'reserve' : undefined}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
