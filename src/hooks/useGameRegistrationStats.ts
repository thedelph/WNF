import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Registration } from '../types/playerSelection';
import { findClosestPlaystyle } from '../utils/playstyleUtils';
import { PREDEFINED_PLAYSTYLES } from '../data/playstyles';

interface PlayerStats {
  xp: number;
  wins: number;
  draws: number;
  losses: number;
  total_games: number;
  win_rate: number;
  rarity: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary' | 'Retired';
  caps: number;
  activeBonuses: number;
  activePenalties: number;
  currentStreak: number;
  maxStreak: number;
  benchWarmerStreak: number;
  registrationStreak: number;
  registrationStreakApplies: boolean;
  rank: number | undefined;
  unpaidGames?: number;
  unpaidGamesModifier?: number;
  averagedPlaystyle?: string;
  playstyleMatchDistance?: number;
  playstyleCategory?: 'attacking' | 'midfield' | 'defensive';
  playstyleRatingsCount?: number;
  recentGames?: number;
  gameParticipation?: Array<'selected' | 'reserve' | null>;
}

interface UseGameRegistrationStatsReturn {
  loading: boolean;
  error: string | null;
  playerStats: Record<string, PlayerStats>;
  stats: Record<string, any>;
  tokenCooldownPlayerIds: Set<string>;
  unregisteredTokenHoldersCount: number;
  unregisteredPlayersXP: number[];
}

/**
 * Hook to fetch and manage player stats for game registrations
 * Handles fetching player stats, registration streaks, win rates, and token cooldown data
 * @param registrations Array of game registrations
 * @param gameId Optional game ID for fetching token cooldown data
 * @returns Object containing loading state, error state, player stats, and token cooldown data
 */
export const useGameRegistrationStats = (
  registrations: Registration[],
  gameId?: string
): UseGameRegistrationStatsReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});
  const [stats, setStats] = useState<Record<string, any>>({});
  const [tokenCooldownPlayerIds, setTokenCooldownPlayerIds] = useState<Set<string>>(new Set());
  const [unregisteredTokenHoldersCount, setUnregisteredTokenHoldersCount] = useState<number>(0);
  const [unregisteredPlayersXP, setUnregisteredPlayersXP] = useState<number[]>([]);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player IDs from registrations
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
            unpaid_games,
            unpaid_games_modifier,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .in('id', playerIds);

        if (playerError) throw playerError;

        // Fallback: If nested select didn't return player_xp for any players, fetch directly
        const playersWithoutXP = playerData?.filter(p => !p.player_xp) || [];
        if (playersWithoutXP.length > 0) {
          const { data: xpData, error: xpError } = await supabase
            .from('player_xp')
            .select('player_id, xp, rank, rarity')
            .in('player_id', playersWithoutXP.map(p => p.id));

          if (!xpError && xpData) {
            // Create lookup map
            const xpMap = xpData.reduce((acc, x) => {
              acc[x.player_id] = { xp: x.xp, rank: x.rank, rarity: x.rarity };
              return acc;
            }, {} as Record<string, { xp: number; rank: number; rarity: string }>);

            // Merge into playerData
            playerData?.forEach(p => {
              if (!p.player_xp && xpMap[p.id]) {
                p.player_xp = xpMap[p.id];
              }
            });
          }
        }

        // Get registration streak data
        const { data: regStreakData, error: regStreakError } = await supabase
          .from('player_current_registration_streak_bonus')
          .select('friendly_name, current_streak_length, bonus_applies');

        if (regStreakError) throw regStreakError;

        // Get player averaged attributes for playstyle matching
        const { data: derivedAttrsData, error: derivedAttrsError } = await supabase
          .from('player_derived_attributes')
          .select(`
            player_id,
            pace_rating,
            shooting_rating,
            passing_rating,
            dribbling_rating,
            defending_rating,
            physical_rating,
            total_ratings_count
          `)
          .in('player_id', playerIds);

        if (derivedAttrsError) throw derivedAttrsError;

        // Fetch token cooldown data if gameId is provided
        if (gameId) {
          const { data: tokenCooldownData, error: tokenCooldownError } = await supabase.rpc(
            'check_previous_game_token_usage',
            { current_game_id: gameId }
          );

          if (!tokenCooldownError && tokenCooldownData) {
            const cooldownIds = new Set(tokenCooldownData.map((u: { player_id: string }) => u.player_id));
            setTokenCooldownPlayerIds(cooldownIds);
          }

          // Count ELIGIBLE players with available tokens who haven't registered
          // Tokens can be used for any game while active, but only eligible players count
          const { data: unregisteredTokenData, error: tokenCountError } = await supabase.rpc(
            'get_eligible_token_holders_not_in_game',
            { p_game_id: gameId }
          );

          if (!tokenCountError && unregisteredTokenData) {
            setUnregisteredTokenHoldersCount(unregisteredTokenData.length);
          } else {
            // Fallback: If RPC doesn't exist, count manually using eligibility check
            const { data: tokenHolders, error: fallbackError } = await supabase
              .from('player_tokens')
              .select('player_id')
              .is('used_at', null)
              .not('player_id', 'in', `(${playerIds.join(',')})`);

            if (!fallbackError && tokenHolders) {
              // Check eligibility for each
              let eligibleCount = 0;
              for (const holder of tokenHolders) {
                const { data: isEligible } = await supabase.rpc(
                  'check_token_eligibility',
                  { player_uuid: holder.player_id }
                );
                if (isEligible) eligibleCount++;
              }
              setUnregisteredTokenHoldersCount(eligibleCount);
            }
          }

          // Get XP of all unregistered active players
          const { data: unregisteredPlayersData, error: unregisteredError } = await supabase
            .from('players')
            .select(`
              id,
              player_xp!inner (
                xp
              )
            `)
            .not('id', 'in', `(${playerIds.join(',')})`)
            .gt('player_xp.xp', 0);

          if (!unregisteredError && unregisteredPlayersData) {
            const xpValues = unregisteredPlayersData
              .map(p => p.player_xp?.xp || 0)
              .filter(xp => xp > 0)
              .sort((a, b) => b - a); // Sort descending
            setUnregisteredPlayersXP(xpValues);
          }
        }

        // Get the last 40 completed games to find the actual cutoff sequence
        const { data: latestGameData, error: latestGameError } = await supabase
          .from('games')
          .select('id, sequence_number')
          .eq('completed', true)
          .eq('is_historical', true)
          .order('sequence_number', { ascending: false })
          .limit(40);

        if (latestGameError) throw latestGameError;

        // Get the game IDs for the last 40 games
        const last40GameIds = (latestGameData || []).map(g => g.id);

        // Create a map of game IDs to their position in the last 40 games (0 = oldest, 39 = most recent)
        const gameIdToIndexMap = (latestGameData || []).reduce((acc, game, index) => {
          // Reverse the index so 0 is the oldest game and 39 is the most recent
          acc[game.id] = 39 - index;
          return acc;
        }, {} as Record<string, number>);

        // Get game registrations ONLY for the last 40 games (fixes 1000 row limit issue)
        const { data: gameRegistrationsData, error: gameRegsError } = await supabase
          .from('game_registrations')
          .select(`
            player_id,
            game_id,
            status,
            games!inner (
              sequence_number,
              is_historical,
              completed
            )
          `)
          .in('player_id', playerIds)
          .in('game_id', last40GameIds)
          .in('status', ['selected', 'reserve', 'dropped_out']);

        if (gameRegsError) throw gameRegsError;

        // Create a map of registration streak data for easy lookup
        const regStreakMap = regStreakData?.reduce((acc: any, player: any) => ({
          ...acc,
          [player.friendly_name]: {
            registrationStreak: player.current_streak_length || 0,
            registrationStreakApplies: player.bonus_applies || false
          }
        }), {});

        // Create a map of derived attributes for easy lookup
        const derivedAttrsMap = derivedAttrsData?.reduce((acc: any, player: any) => ({
          ...acc,
          [player.player_id]: {
            pace_rating: player.pace_rating,
            shooting_rating: player.shooting_rating,
            passing_rating: player.passing_rating,
            dribbling_rating: player.dribbling_rating,
            defending_rating: player.defending_rating,
            physical_rating: player.physical_rating,
            total_ratings_count: player.total_ratings_count
          }
        }), {});

        // Calculate recent games (last 40 completed games)
        // For each player, create an array showing participation status in each of the 40 games
        // Values: 'selected' | 'reserve' | 'dropped_out' | null
        const recentGamesParticipationMap = gameRegistrationsData?.reduce((acc: any, registration: any) => {
          const playerId = registration.player_id;
          const gameIndex = gameIdToIndexMap[registration.game_id];

          if (!acc[playerId]) {
            acc[playerId] = new Array(40).fill(null);
          }

          if (gameIndex !== undefined) {
            acc[playerId][gameIndex] = registration.status; // 'selected', 'reserve', or 'dropped_out'
          }

          return acc;
        }, {} as Record<string, Array<'selected' | 'reserve' | 'dropped_out' | null>>) || {};

        // Count total games for backwards compatibility (only count 'selected')
        const recentGamesMap = Object.entries(recentGamesParticipationMap).reduce((acc: any, [playerId, participation]) => {
          acc[playerId] = participation.filter(status => status === 'selected').length;
          return acc;
        }, {} as Record<string, number>);

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
            total_games: player.total_games,
            win_rate: player.win_rate
          }
        }), {});

        // Create a map of registration statuses for easy lookup
        const registrationStatusMap = registrations.reduce((acc: any, reg: any) => ({
          ...acc,
          [reg.player.id]: reg.status
        }), {});

        // Transform into record for easy lookup
        const stats = playerData?.reduce((acc, player) => {
          // Check if player has dropped out
          const isDroppedOut = registrationStatusMap[player.id] === 'dropped_out';

          // Only count unpaid games if player hasn't dropped out AND the game is unpaid
          const shouldCountUnpaidGames = !isDroppedOut && player.unpaid_games > 0;

          // Calculate closest playstyle match
          const playerAttributes = derivedAttrsMap[player.id];
          const playstyleMatch = playerAttributes ?
            findClosestPlaystyle(playerAttributes, PREDEFINED_PLAYSTYLES) : null;

          return {
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
              totalGames: winRateMap[player.id]?.total_games || 0,
              winRate: winRateMap[player.id]?.win_rate || 0,
              rank: player.player_xp?.rank || undefined,
              registrationStreak: regStreakMap[player.friendly_name]?.registrationStreak || 0,
              registrationStreakApplies: regStreakMap[player.friendly_name]?.registrationStreakApplies || false,
              unpaidGames: shouldCountUnpaidGames ? player.unpaid_games : 0,
              unpaidGamesModifier: shouldCountUnpaidGames ? player.unpaid_games * -0.5 : 0,
              averagedPlaystyle: playstyleMatch?.playstyleName,
              playstyleMatchDistance: playstyleMatch?.matchDistance,
              playstyleCategory: playstyleMatch?.category,
              playstyleRatingsCount: playerAttributes?.total_ratings_count || 0,
              recentGames: recentGamesMap[player.id] || 0,
              gameParticipation: recentGamesParticipationMap[player.id] || new Array(40).fill(null)
            }
          };
        }, {});

        const statsMap = registrations.reduce((acc, registration) => {
          // Get player data from the main stats object
          const playerData = stats[registration.player.id] || {};
          
          const playerStats = {
            currentStreak: playerData.currentStreak || 0,
            activeBonuses: playerData.activeBonuses || 0,
            activePenalties: playerData.activePenalties || 0,
            unpaidGamesModifier: playerData.unpaidGamesModifier || 0,
            registrationStreak: regStreakMap[registration.player.friendly_name]?.registrationStreak || 0,
            registrationStreakApplies: regStreakMap[registration.player.friendly_name]?.registrationStreakApplies || false,
          };

          return {
            ...acc,
            [registration.player.id]: playerStats
          };
        }, {});

        setPlayerStats(stats);
        setStats(statsMap);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [registrations, gameId]);

  return { loading, error, playerStats, stats, tokenCooldownPlayerIds, unregisteredTokenHoldersCount, unregisteredPlayersXP };
};
