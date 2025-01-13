import React from 'react';
import { motion } from 'framer-motion';
import PlayerCard from '../player-card/PlayerCard';
import { supabase } from '../../utils/supabase';
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

interface PlayerStats {
  xp: number;
  wins: number;
  draws: number;
  losses: number;
  total_games: number;
  win_rate: number;
  rarity: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary';
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerStats>>({});
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  // Fetch player stats
  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get player IDs
        const playerIds = registrations.map(reg => reg.player.id);

        // Get win rates using the get_player_win_rates function
        const { data: winRatesData, error: winRatesError } = await supabase
          .rpc('get_player_win_rates');

        if (winRatesError) throw winRatesError;

        // Get other player stats
        const { data: statsData, error: statsError } = await supabase
          .from('player_xp')
          .select('player_id, xp, rarity')
          .in('player_id', playerIds);

        if (statsError) throw statsError;

        // Create a map of win rates by player ID
        const winRatesMap = new Map(winRatesData.map(wr => [wr.id, wr]));

        // Create a map of player XP and rarity by player ID
        const playerXPMap = new Map(statsData.map(stat => [stat.player_id, {
          xp: stat.xp,
          rarity: stat.rarity
        }]));

        // Combine stats and win rates into a lookup object
        const statsLookup = playerIds.reduce((acc, playerId) => {
          const winRateData = winRatesMap.get(playerId);
          const playerXPData = playerXPMap.get(playerId);
          
          acc[playerId] = {
            xp: playerXPData?.xp || 0,
            wins: winRateData?.wins || 0,
            draws: winRateData?.draws || 0,
            losses: winRateData?.losses || 0,
            total_games: winRateData?.total_games || 0,
            win_rate: winRateData?.win_rate || 0,
            rarity: playerXPData?.rarity || 'Amateur'
          };
          return acc;
        }, {} as Record<string, PlayerStats>);

        setPlayerStats(statsLookup);
      } catch (error) {
        console.error('Error fetching player stats:', error);
        setError('Failed to fetch player stats');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
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
          const stats = playerStats[registration.player.id] || {
            xp: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            total_games: 0,
            win_rate: 0,
            rarity: 'Amateur'
          };

          // Calculate streak bonus
          const streakModifier = registration.player.current_streak * 0.1;
          const bonusModifier = registration.player.active_bonuses * 0.1;
          const penaltyModifier = registration.player.active_penalties * -0.1;
          const dropoutModifier = 0; // This would need to be fetched from the database if needed
          const totalModifier = streakModifier + bonusModifier + penaltyModifier + dropoutModifier;

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
                xp={stats.xp}
                caps={registration.player.caps}
                preferredPosition={registration.player.preferred_position || ''}
                activeBonuses={registration.player.active_bonuses}
                activePenalties={registration.player.active_penalties}
                winRate={stats.win_rate}
                currentStreak={registration.player.current_streak}
                maxStreak={registration.player.max_streak}
                rarity={stats.rarity}
                avatarSvg={registration.player.avatar_svg || ''}
                status={registration.status === 'reserve' ? 'reserve' : undefined}
                wins={stats.wins}
                draws={stats.draws}
                losses={stats.losses}
                totalGames={stats.total_games}
                whatsapp_group_member={registration.player.whatsapp_group_member}
                streakBonus={streakModifier}
                bonusModifier={bonusModifier}
                penaltyModifier={penaltyModifier}
                dropoutPenalty={dropoutModifier}
                totalModifier={totalModifier}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
