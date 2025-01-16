import React from 'react';
import { motion } from 'framer-motion';
import { PlayerCard } from '../player-card/PlayerCard';
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
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
  maxStreak: number;
  benchWarmerStreak: number;
  rank: number | undefined;
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerStats>>({});
  const [registrationsState, setRegistrations] = React.useState(registrations);
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player stats for all players
        const playerIds = registrations.map(reg => reg.player.id);
        
        // Get player stats and XP data
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            caps,
            current_streak,
            max_streak,
            active_bonuses,
            active_penalties,
            win_rate,
            bench_warmer_streak,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .in('id', playerIds);

        if (playerError) throw playerError;

        // Get win rates and game stats
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_player_win_rates')
          .in('id', playerIds);

        if (winRateError) throw winRateError;

        // Create a map of win rate data for easy lookup
        const winRateMap = winRateData.reduce((acc: any, player: any) => ({
          ...acc,
          [player.id]: {
            wins: player.wins,
            draws: player.draws,
            losses: player.losses,
            totalGames: player.total_games,
            winRate: player.win_rate
          }
        }), {});

        // Transform into record for easy lookup
        const stats = playerData?.reduce((acc, player) => ({
          ...acc,
          [player.id]: {
            xp: player.player_xp?.xp || 0,
            rarity: player.player_xp?.rarity || 'Amateur',
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            maxStreak: player.max_streak || 0,
            benchWarmerStreak: player.bench_warmer_streak || 0,
            wins: winRateMap[player.id]?.wins || 0,
            draws: winRateMap[player.id]?.draws || 0,
            losses: winRateMap[player.id]?.losses || 0,
            totalGames: winRateMap[player.id]?.totalGames || 0,
            winRate: winRateMap[player.id]?.winRate || 0,
            rank: player.player_xp?.rank || undefined
          }
        }), {});

        setPlayerStats(stats);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 justify-items-center sm:justify-items-stretch">
        {/* Sort registrations by player XP in descending order */}
        {[...registrationsState]
          .sort((a, b) => {
            const aXp = playerStats[a.player.id]?.xp || 0;
            const bXp = playerStats[b.player.id]?.xp || 0;
            return bXp - aXp; // Descending order
          })
          .map((registration) => {
          const stats = playerStats[registration.player.id] || {
            xp: 0,
            rarity: 'Amateur',
            caps: 0,
            activeBonuses: 0,
            activePenalties: 0,
            currentStreak: 0,
            maxStreak: 0,
            benchWarmerStreak: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            totalGames: 0,
            winRate: 0,
            rank: undefined
          };

          // Calculate streak bonus
          const streakModifier = stats.currentStreak * 0.1;
          const bonusModifier = stats.activeBonuses * 0.1;
          const penaltyModifier = stats.activePenalties * -0.1;
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
                caps={stats.caps}
                preferredPosition={registration.player.preferred_position || ''}
                activeBonuses={stats.activeBonuses}
                activePenalties={stats.activePenalties}
                winRate={stats.winRate}
                currentStreak={stats.currentStreak}
                maxStreak={stats.maxStreak}
                benchWarmerStreak={stats.benchWarmerStreak}
                rarity={stats.rarity}
                avatarSvg={registration.player.avatar_svg || ''}
                status={registration.status === 'reserve' ? 'reserve' : undefined}
                wins={stats.wins}
                draws={stats.draws}
                losses={stats.losses}
                totalGames={stats.totalGames}
                whatsapp_group_member={registration.player.whatsapp_group_member}
                streakBonus={streakModifier}
                bonusModifier={bonusModifier}
                penaltyModifier={penaltyModifier}
                dropoutPenalty={dropoutModifier}
                totalModifier={totalModifier}
                rank={stats.rank}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
