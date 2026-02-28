import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabase';
import { Player } from '../components/player-card/PlayerCardTypes';
import { executeBatchQueries } from '../utils/network';
import { findClosestPlaystyle } from '../utils/playstyleUtils';
import { PREDEFINED_PLAYSTYLES } from '../data/playstyles';

/**
 * Custom hook for managing player grid data and state
 * Handles fetching players, their latest game status, and related stats
 */
export const usePlayerGrid = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get the last 40 completed games to determine which games to query registrations for
        const { data: latestGameData, error: gamesError } = await supabase
          .from('games')
          .select('id, sequence_number')
          .eq('completed', true)
          .eq('is_historical', true)
          .order('sequence_number', { ascending: false })
          .limit(40);

        if (gamesError) throw gamesError;

        // Get the game IDs for the last 40 games
        const last40GameIds = (latestGameData || []).map(g => g.id);

        // Define queries that can run in parallel
        const queries = [
          // Players query
          () => supabase
            .from('players')
            .select(`
              id,
              friendly_name,
              avatar_svg,
              whatsapp_group_member,
              caps,
              active_bonuses,
              active_penalties,
              current_streak,
              bench_warmer_streak,
              shield_active,
              protected_streak_value,
              injury_token_active,
              injury_original_streak,
              injury_return_streak,
              injury_streak_bonus,
              player_xp (
                xp,
                rank,
                rarity
              )
            `)
            .order('friendly_name'),

          // Win rates query
          () => supabase.rpc('get_player_win_rates'),

          // Unpaid games query
          () => supabase
            .from('player_xp_breakdown')
            .select(`
              friendly_name,
              unpaid_games_count,
              unpaid_games_modifier
            `),

          // Registration streak query
          () => supabase
            .from('player_current_registration_streak_bonus')
            .select('friendly_name, current_streak_length, bonus_applies'),

          // Player streak stats (for correct max streak values)
          () => supabase
            .from('player_streak_stats')
            .select('friendly_name, longest_streak, longest_streak_period'),

          // Player averaged attributes for playstyle matching
          () => supabase
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
            `),

          // Game registrations ONLY for the last 40 games (fixes 1000 row limit issue)
          // Fetch both 'selected' and 'reserve' statuses
          () => supabase
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
            .in('game_id', last40GameIds)
            .in('status', ['selected', 'reserve', 'dropped_out'])
        ];

        // Define types for query results
        interface PlayerData {
          id: string;
          friendly_name: string;
          avatar_svg: string | null;
          whatsapp_group_member: string | null;
          caps: number | null;
          active_bonuses: number | null;
          active_penalties: number | null;
          current_streak: number | null;
          bench_warmer_streak: number | null;
          shield_active: boolean | null;
          protected_streak_value: number | null;
          injury_token_active: boolean | null;
          injury_original_streak: number | null;
          injury_return_streak: number | null;
          injury_streak_bonus: number | null;
          player_xp: {
            xp: number;
            rank: number;
            rarity: string;
          } | null;
        }

        interface WinRateData {
          id: string;
          wins: number;
          draws: number;
          losses: number;
          total_games: number;
          win_rate: number;
        }

        interface UnpaidGamesData {
          friendly_name: string;
          unpaid_games_count: number;
          unpaid_games_modifier: number;
        }

        interface RegistrationStreakData {
          friendly_name: string;
          current_streak_length: number;
          bonus_applies: boolean;
        }

        interface StreakStatsData {
          friendly_name: string;
          longest_streak: number;
          longest_streak_period: string | null;
        }

        interface DerivedAttributesData {
          player_id: string;
          pace_rating: number | null;
          shooting_rating: number | null;
          passing_rating: number | null;
          dribbling_rating: number | null;
          defending_rating: number | null;
          physical_rating: number | null;
          total_ratings_count: number;
        }

        interface GameRegistrationData {
          player_id: string;
          game_id: string;
          status: 'selected' | 'reserve' | 'dropped_out';
          games: {
            sequence_number: number;
            is_historical: boolean;
            completed: boolean;
          };
        }

        type BatchQueryResults = [
          PlayerData[] | null,
          WinRateData[] | null,
          UnpaidGamesData[] | null,
          RegistrationStreakData[] | null,
          StreakStatsData[] | null,
          DerivedAttributesData[] | null,
          GameRegistrationData[] | null
        ];

        // Execute all queries with retry logic
        const { data: results, error: batchError } = await executeBatchQueries<BatchQueryResults>(queries);

        if (batchError || !results) {
          throw batchError || new Error('Failed to fetch player data');
        }

        const [
          playersData,
          winRateData,
          unpaidGamesData,
          registrationStreakData,
          streakStatsData,
          derivedAttributesData,
          gameRegistrationsData
        ] = results;

        // Create maps for efficient lookups
        const winRateMap = (winRateData || []).reduce((acc, player) => {
          acc[player.id] = {
            wins: player.wins || 0,
            draws: player.draws || 0,
            losses: player.losses || 0,
            totalGames: player.total_games || 0,
            winRate: player.win_rate || 0
          };
          return acc;
        }, {} as Record<string, { wins: number, draws: number, losses: number, totalGames: number, winRate: number }>);

        const unpaidGamesMap = (unpaidGamesData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            unpaidGames: player.unpaid_games_count || 0,
            unpaidGamesModifier: player.unpaid_games_modifier || 0
          };
          return acc;
        }, {} as Record<string, { unpaidGames: number, unpaidGamesModifier: number }>);

        const registrationStreakMap = (registrationStreakData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            registrationStreak: player.current_streak_length || 0,
            registrationStreakApplies: player.bonus_applies || false
          };
          return acc;
        }, {} as Record<string, { registrationStreak: number, registrationStreakApplies: boolean }>);
        
        // Create map for streak stats data
        const streakStatsMap = (streakStatsData || []).reduce((acc, player) => {
          acc[player.friendly_name] = {
            longestStreak: player.longest_streak || 0,
            longestStreakPeriod: player.longest_streak_period
          };
          return acc;
        }, {} as Record<string, { longestStreak: number, longestStreakPeriod: any }>);

        // Create map for derived attributes
        const derivedAttributesMap = (derivedAttributesData || []).reduce((acc, player) => {
          acc[player.player_id] = {
            pace_rating: player.pace_rating,
            shooting_rating: player.shooting_rating,
            passing_rating: player.passing_rating,
            dribbling_rating: player.dribbling_rating,
            defending_rating: player.defending_rating,
            physical_rating: player.physical_rating,
            total_ratings_count: player.total_ratings_count
          };
          return acc;
        }, {} as Record<string, any>);

        // Calculate recent games (last 40 completed games)
        // Create a map of game IDs to their position in the last 40 games (0 = oldest, 39 = most recent)
        const gameIdToIndexMap = (latestGameData || []).reduce((acc, game, index) => {
          // Reverse the index so 0 is the oldest game and 39 is the most recent
          acc[game.id] = 39 - index;
          return acc;
        }, {} as Record<string, number>);

        // For each player, create an array showing participation status in each of the 40 games
        // Values: 'selected' | 'reserve' | 'dropped_out' | null
        const recentGamesParticipationMap = (gameRegistrationsData || []).reduce((acc, registration) => {
          const playerId = registration.player_id;
          const gameIndex = gameIdToIndexMap[registration.game_id];

          if (!acc[playerId]) {
            acc[playerId] = new Array(40).fill(null);
          }

          if (gameIndex !== undefined) {
            acc[playerId][gameIndex] = registration.status; // 'selected', 'reserve', or 'dropped_out'
          }

          return acc;
        }, {} as Record<string, Array<'selected' | 'reserve' | 'dropped_out' | null>>);

        // Count total games for backwards compatibility (only count 'selected')
        const recentGamesMap = Object.entries(recentGamesParticipationMap).reduce((acc, [playerId, participation]) => {
          acc[playerId] = participation.filter(status => status === 'selected').length;
          return acc;
        }, {} as Record<string, number>);

        // Combine all data
        const combinedPlayers = (playersData || []).map(player => {
          // Use the longest_streak from player_streak_stats if available, otherwise fall back to max_streak from players table
          const correctMaxStreak = streakStatsMap[player.friendly_name]?.longestStreak || 0;

          // Calculate closest playstyle match
          const playerAttributes = derivedAttributesMap[player.id];
          const playstyleMatch = playerAttributes ?
            findClosestPlaystyle(playerAttributes, PREDEFINED_PLAYSTYLES) : null;

          return {
            id: player.id,
            friendlyName: player.friendly_name,
            avatarSvg: player.avatar_svg ?? undefined,
            whatsapp_group_member: player.whatsapp_group_member ?? undefined,
            caps: player.caps || 0,
            xp: player.player_xp?.xp || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            maxStreak: correctMaxStreak,
            benchWarmerStreak: player.bench_warmer_streak || 0,
            // Use the database rarity value which now correctly handles Academy vs Retired
            rarity: (player.player_xp?.rarity || (player.player_xp?.xp === 0 ? 'Academy' : 'Amateur')) as 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary' | 'Retired' | 'Academy',
            rank: player.player_xp?.rank || 0,
            wins: winRateMap[player.id]?.wins || 0,
            draws: winRateMap[player.id]?.draws || 0,
            losses: winRateMap[player.id]?.losses || 0,
            totalGames: winRateMap[player.id]?.totalGames || 0,
            winRate: winRateMap[player.id]?.winRate || 0,
            streakBonus: 0,
            dropoutPenalty: 0,
            bonusModifier: 0,
            penaltyModifier: 0,
            totalModifier: 0,
            unpaidGames: unpaidGamesMap[player.friendly_name]?.unpaidGames || 0,
            unpaidGamesModifier: unpaidGamesMap[player.friendly_name]?.unpaidGamesModifier || 0,
            registrationStreakBonus: registrationStreakMap[player.friendly_name]?.registrationStreak || 0,
            registrationStreakBonusApplies: registrationStreakMap[player.friendly_name]?.registrationStreakApplies || false,
            averagedPlaystyle: playstyleMatch?.playstyleName,
            playstyleMatchDistance: playstyleMatch?.matchDistance,
            playstyleCategory: playstyleMatch?.category,
            playstyleRatingsCount: playerAttributes?.total_ratings_count || 0,
            shieldActive: player.shield_active || false,
            protectedStreakValue: player.protected_streak_value || null,
            // Legacy alias for backwards compatibility
            frozenStreakValue: player.protected_streak_value || null,
            // Injury token fields
            injuryTokenActive: player.injury_token_active || false,
            injuryOriginalStreak: player.injury_original_streak || null,
            injuryReturnStreak: player.injury_return_streak || null,
            injuryStreakBonus: player.injury_streak_bonus ?? null,
            recentGames: recentGamesMap[player.id] || 0,
            gameParticipation: recentGamesParticipationMap[player.id] || new Array<'selected' | 'reserve' | 'dropped_out' | null>(40).fill(null)
          };
        });

        // Debug: Log players with active injury tokens
        const injuredPlayers = combinedPlayers.filter(p => p.injuryTokenActive);
        if (injuredPlayers.length > 0) {
          console.log('🩹 usePlayerGrid - Players with injury tokens:', injuredPlayers.map(p => ({
            name: p.friendlyName,
            injuryTokenActive: p.injuryTokenActive,
            originalStreak: p.injuryOriginalStreak,
            returnStreak: p.injuryReturnStreak
          })));
        }

        setPlayers(combinedPlayers);
      } catch (err: any) {
        console.error('Error in usePlayerGrid:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return { players, loading, error };
};
