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
              frozen_streak_value,
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
            .eq('status', 'selected')
        ];

        // Execute all queries with retry logic
        const { data: results, error: batchError } = await executeBatchQueries(queries);

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

        // Debug logging for playstyle data
        console.log('🎯 usePlayerGrid - Derived attributes data:', derivedAttributesData);
        console.log('🎯 usePlayerGrid - Number of players with attributes:', derivedAttributesData?.length || 0);

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

        console.log('🎯 usePlayerGrid - Derived attributes map:', derivedAttributesMap);
        console.log('🎯 usePlayerGrid - Player IDs in map:', Object.keys(derivedAttributesMap));

        // Calculate recent games (last 40 completed games)
        // Create a map of game IDs to their position in the last 40 games (0 = oldest, 39 = most recent)
        const gameIdToIndexMap = (latestGameData || []).reduce((acc, game, index) => {
          // Reverse the index so 0 is the oldest game and 39 is the most recent
          acc[game.id] = 39 - index;
          return acc;
        }, {} as Record<string, number>);

        // For each player, create a boolean array showing participation in each of the 40 games
        const recentGamesParticipationMap = (gameRegistrationsData || []).reduce((acc, registration) => {
          const playerId = registration.player_id;
          const gameIndex = gameIdToIndexMap[registration.game_id];

          if (!acc[playerId]) {
            acc[playerId] = new Array(40).fill(false);
          }

          if (gameIndex !== undefined) {
            acc[playerId][gameIndex] = true;
          }

          return acc;
        }, {} as Record<string, boolean[]>);

        // Count total games for backwards compatibility
        const recentGamesMap = Object.entries(recentGamesParticipationMap).reduce((acc, [playerId, participation]) => {
          acc[playerId] = participation.filter(Boolean).length;
          return acc;
        }, {} as Record<string, number>);

        const last40SequenceNumbers = (latestGameData || []).map(g => g.sequence_number);
        console.log('🎯 usePlayerGrid - Recent games calculation:', {
          last40GamesCount: latestGameData?.length || 0,
          last40SequenceNumbers: last40SequenceNumbers.slice(0, 5),
          minSequence: last40SequenceNumbers.length > 0 ? Math.min(...last40SequenceNumbers) : 0,
          maxSequence: last40SequenceNumbers.length > 0 ? Math.max(...last40SequenceNumbers) : 0,
          totalRegistrations: gameRegistrationsData?.length || 0,
          playersWithRecentGames: Object.keys(recentGamesMap).length,
          sampleCounts: Object.entries(recentGamesMap).slice(0, 3).map(([id, count]) => ({ id, count }))
        });

        // Combine all data
        const combinedPlayers = (playersData || []).map(player => {
          // Use the longest_streak from player_streak_stats if available, otherwise fall back to max_streak from players table
          const correctMaxStreak = streakStatsMap[player.friendly_name]?.longestStreak || 0;

          // Log for debugging if there's a discrepancy
          if (streakStatsMap[player.friendly_name]?.longestStreak !== correctMaxStreak) {
            console.log(`Max streak discrepancy for ${player.friendly_name}:`, {
              from_players_table: 0,
              from_streak_stats: streakStatsMap[player.friendly_name]?.longestStreak,
              using: correctMaxStreak
            });
          }

          // Calculate closest playstyle match
          const playerAttributes = derivedAttributesMap[player.id];
          const playstyleMatch = playerAttributes ?
            findClosestPlaystyle(playerAttributes, PREDEFINED_PLAYSTYLES) : null;

          // Debug logging for specific players
          if (player.friendly_name === 'Chris H' || player.friendly_name === 'Nathan') {
            console.log(`🎯 usePlayerGrid - ${player.friendly_name}:`, {
              playerId: player.id,
              attributes: playerAttributes,
              playstyleMatch: playstyleMatch
            });
          }

          return {
            id: player.id,
            friendlyName: player.friendly_name,
            avatarSvg: player.avatar_svg,
            whatsapp_group_member: player.whatsapp_group_member,
            caps: player.caps || 0,
            xp: player.player_xp?.xp || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            maxStreak: correctMaxStreak,
            benchWarmerStreak: player.bench_warmer_streak || 0,
            // Use the database rarity value which now correctly handles Academy vs Retired
            rarity: player.player_xp?.rarity || (player.player_xp?.xp === 0 ? 'Academy' : 'Amateur'),
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
            frozenStreakValue: player.frozen_streak_value || null,
            recentGames: recentGamesMap[player.id] || 0,
            gameParticipation: recentGamesParticipationMap[player.id] || new Array(40).fill(false)
          };
        });

        // Debug log to see how many players have playstyles
        const playersWithPlaystyles = combinedPlayers.filter(p => p.averagedPlaystyle);
        console.log('🎯 usePlayerGrid - Players with playstyles:', {
          total: combinedPlayers.length,
          withPlaystyles: playersWithPlaystyles.length,
          sample: playersWithPlaystyles.slice(0, 3).map(p => ({
            name: p.friendlyName,
            playstyle: p.averagedPlaystyle,
            distance: p.playstyleMatchDistance
          }))
        });

        // Debug Chris H specifically in the final array
        const chrisHFinal = combinedPlayers.find(p => p.friendlyName === 'Chris H');
        if (chrisHFinal) {
          console.log('🎯 usePlayerGrid - Chris H final object:', chrisHFinal);
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
