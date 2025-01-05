import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
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
  const [playerStats, setPlayerStats] = React.useState<Record<string, { xp: number, rarity: string }>>({});
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
          .select(`
            id,
            friendly_name,
            xp,
            caps,
            active_bonuses,
            active_penalties,
            win_rate,
            current_streak,
            max_streak,
            avatar_svg
          `)
          .in('id', playerIds);

        if (statsError) throw statsError;

        // Get rarity data from player_xp
        const { data: xpData, error: xpError } = await supabase
          .from('player_xp')
          .select('player_id, rarity')
          .in('player_id', statsData.map(p => p.id));

        if (xpError) throw xpError;

        // Create a map of player IDs to rarity
        const rarityMap = xpData?.reduce((acc, xp) => ({
          ...acc,
          [xp.player_id]: xp.rarity
        }), {});

        // Get dropout penalties
        const { data: dropoutData, error: dropoutError } = await supabase
          .from('player_penalties')
          .select('player_id')
          .in('player_id', statsData.map(p => p.id))
          .eq('penalty_type', 'SAME_DAY_DROPOUT')
          .gt('games_remaining', 0);

        if (dropoutError) throw dropoutError;

        // Create a map of player IDs to dropout penalties count
        const dropoutMap = dropoutData?.reduce((acc, penalty) => ({
          ...acc,
          [penalty.player_id]: (acc[penalty.player_id] || 0) + 1
        }), {} as Record<string, number>);

        // Transform the data to match our Player interface
        const transformedPlayers = statsData.map(player => {
          // Calculate streak bonus
          const streakModifier = (player.current_streak || 0) * 0.1;
          const bonusModifier = (player.active_bonuses || 0) * 0.1;
          const penaltyModifier = (player.active_penalties || 0) * -0.1;
          const dropoutModifier = (dropoutMap?.[player.id] || 0) * -0.5; // 50% penalty per dropout
          const totalModifier = streakModifier + bonusModifier + penaltyModifier + dropoutModifier;

          return {
            id: player.id,
            friendlyName: player.friendly_name,
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            winRate: player.win_rate || 0,
            currentStreak: player.current_streak || 0,
            maxStreak: player.max_streak || 0,
            xp: player.xp || 0,
            avatarSvg: player.avatar_svg || '',
            rarity: rarityMap?.[player.id] || 'Amateur',
            streakBonus: streakModifier,
            dropoutPenalty: dropoutModifier,
            bonusModifier: bonusModifier,
            penaltyModifier: penaltyModifier,
            totalModifier: totalModifier
          };
        });

        // Transform into a lookup object
        const statsLookup = transformedPlayers.reduce((acc, player) => {
          acc[player.id] = { xp: player.xp, rarity: player.rarity };
          return acc;
        }, {} as Record<string, { xp: number, rarity: string }>);

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
          const playerRarity = playerStats[registration.player.id]?.rarity || 'Amateur';

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
                activeBonuses={registration.player.active_bonuses}
                activePenalties={registration.player.active_penalties}
                winRate={registration.player.win_rate}
                currentStreak={registration.player.current_streak}
                maxStreak={registration.player.max_streak}
                rarity={playerRarity}
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
