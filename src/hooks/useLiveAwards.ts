/**
 * Hook for fetching live "All Time" awards data
 *
 * When viewing "All Time" on the Hall of Fame, this hook fetches live data
 * directly from the RPCs (like the Live Stats tab) rather than using stored
 * award snapshots. This provides real-time leaderboard data with W/D/L details.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { LiveAward, AwardsByCategory, AwardCategory, MedalType } from '../types/awards';
import { AWARD_CATEGORIES, AWARD_CATEGORY_ORDER } from '../constants/awards';
import {
  ChemistryPairResponse,
  RivalryLeaderboardResponse,
  TrioLeaderboardResponse,
} from '../types/chemistry';

// Helper to create a unique ID for awards
const createAwardId = (category: string, rank: number, playerId: string) =>
  `live_${category}_${rank}_${playerId}`;

// Helper to get medal type from rank (1-indexed)
const getMedalType = (rank: number): MedalType => {
  switch (rank) {
    case 1: return 'gold';
    case 2: return 'silver';
    case 3: return 'bronze';
    default: return 'bronze';
  }
};

// Helper to assign ranks with ties (players with same value get same rank)
// Returns array of ranks corresponding to each item in the sorted array
const assignRanksWithTies = <T>(items: T[], getValue: (item: T) => number): number[] => {
  if (items.length === 0) return [];

  const ranks: number[] = [];
  let currentRank = 1;

  for (let i = 0; i < items.length; i++) {
    if (i === 0) {
      ranks.push(currentRank);
    } else {
      const prevValue = getValue(items[i - 1]);
      const currValue = getValue(items[i]);
      // If same value as previous, same rank; otherwise increment
      if (currValue === prevValue) {
        ranks.push(ranks[i - 1]);
      } else {
        currentRank = i + 1; // Standard competition ranking (1, 2, 2, 4)
        ranks.push(currentRank);
      }
    }
  }

  return ranks;
};

// Helper to group awards by category and deduplicate pair/trio awards
// placeholders: map of categoryId to placeholder message for categories without data
const groupLiveAwardsByCategory = (
  awards: LiveAward[],
  placeholders: Map<AwardCategory, string> = new Map()
): AwardsByCategory[] => {
  const grouped: AwardsByCategory[] = [];

  for (const categoryId of AWARD_CATEGORY_ORDER) {
    let categoryAwards = awards.filter(a => a.category === categoryId);
    const config = AWARD_CATEGORIES[categoryId];

    // Deduplicate pair awards (keep one entry per unique pair per medal)
    if (config.isPairAward) {
      const seen = new Set<string>();
      categoryAwards = categoryAwards.filter(award => {
        const ids = [award.playerId, award.partnerId].sort();
        const key = `${award.medalType}_${ids.join('_')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Deduplicate trio awards (keep one entry per unique trio per medal)
    if (config.isTrioAward) {
      const seen = new Set<string>();
      categoryAwards = categoryAwards.filter(award => {
        const ids = [award.playerId, award.partnerId, award.partner2Id].sort();
        const key = `${award.medalType}_${ids.join('_')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const placeholderMessage = placeholders.get(categoryId);

    // Include category if it has awards OR has a placeholder message
    if (categoryAwards.length > 0 || placeholderMessage) {
      grouped.push({
        category: categoryId,
        config: config,
        awards: categoryAwards.sort((a, b) => {
          const medalOrder = { gold: 0, silver: 1, bronze: 2 };
          return medalOrder[a.medalType] - medalOrder[b.medalType];
        }),
        placeholderMessage: categoryAwards.length === 0 ? placeholderMessage : undefined,
      });
    }
  }

  return grouped;
};

/**
 * Hook to fetch live awards for display
 *
 * @param yearFilter - 'all' for all-time, or a specific year number
 */
export const useLiveAwards = (yearFilter: 'all' | number = 'all') => {
  const [awards, setAwards] = useState<LiveAward[]>([]);
  const [awardsByCategory, setAwardsByCategory] = useState<AwardsByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert year filter to format expected by RPCs (null = all time)
  const targetYear = yearFilter === 'all' ? null : yearFilter;

  useEffect(() => {
    const fetchLiveAwards = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel for performance
        const [
          xpResult,
          winRatesResult,
          goalDiffsResult,
          attendanceStreaksResult,
          winStreaksResult,
          unbeatenStreaksResult,
          capsResult,
          chemistryResult,
          buddiesResult,
          rivalryResult,
          trioResult,
          cursedTrioResult,
          teamColorsResult,
          superSubResult,
        ] = await Promise.all([
          // XP Champion - from highest_xp_records_view (includes snapshot_date)
          // Uses xp_v2 for current era, falls back to xp for v1 era
          supabase
            .from('highest_xp_records_view')
            .select('player_id, friendly_name, xp, xp_v2, snapshot_date')
            .order('xp_v2', { ascending: false, nullsFirst: false })
            .limit(3),

          // Win Rate Leader
          supabase.rpc('get_player_win_rates', { target_year: targetYear }),

          // Net Positive (goal differentials)
          supabase.rpc('get_player_goal_differentials', { target_year: targetYear }),

          // Iron Man (attendance streaks)
          supabase.rpc('get_player_attendance_streaks', { target_year: targetYear }),

          // Hot Streak (winning streaks)
          supabase.rpc('get_player_winning_streaks', { target_year: targetYear }),

          // The Wall (unbeaten streaks)
          supabase.rpc('get_player_unbeaten_streaks', { target_year: targetYear }),

          // Appearance King (caps)
          supabase.rpc('get_player_caps', { target_year: targetYear }),

          // Dynamic Duo (chemistry)
          supabase.rpc('get_player_chemistry', { target_player_id: null, target_year: targetYear }),

          // Best Buddies
          supabase.rpc('get_best_buddies', { target_year: targetYear }),

          // Fiercest Rivalry
          supabase.rpc('get_rivalry_leaderboard', { limit_count: 3, target_year: targetYear }),

          // Dream Team Trio
          supabase.rpc('get_trio_leaderboard', { limit_count: 3, target_year: targetYear, sort_order: 'best' }),

          // Cursed Trio
          supabase.rpc('get_trio_leaderboard', { limit_count: 3, target_year: targetYear, sort_order: 'worst' }),

          // Team Colors (for Blue Blood and Dutch Master)
          supabase.rpc('get_player_team_colors', { target_year: targetYear }),

          // Super Sub (reserve appearances) - will fall back to direct query if RPC doesn't exist
          supabase.rpc('get_super_sub_leaderboard', { target_year: targetYear }),
        ]);

        const allAwards: LiveAward[] = [];
        // Track placeholder messages for categories that don't meet thresholds
        const placeholders = new Map<AwardCategory, string>();

        // Process XP Champion
        if (xpResult.data) {
          const sorted = xpResult.data.slice(0, 3);
          const ranks = assignRanksWithTies(sorted, (p: any) => p.xp_v2 ?? p.xp ?? 0);
          sorted.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('xp_champion', ranks[index], player.player_id),
              playerId: player.player_id,
              playerName: player.friendly_name || 'Unknown',
              category: 'xp_champion',
              medalType: getMedalType(ranks[index]),
              year: null,
              value: player.xp_v2 ?? player.xp ?? 0,
              achievedDate: player.snapshot_date,
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Win Rate Leader
        if (winRatesResult.data) {
          // Filter out players who don't meet minimum games threshold (win_rate is null)
          const sorted = winRatesResult.data
            .filter((p: any) => p.win_rate !== null)
            .sort((a: any, b: any) => Number(b.win_rate) - Number(a.win_rate))
            .slice(0, 3);

          if (sorted.length === 0) {
            // No one meets the 10-game minimum threshold yet
            placeholders.set('win_rate_leader', 'Check back after 10 even-team games have been played');
          } else {
            const ranks = assignRanksWithTies(sorted, (p: any) => Number(p.win_rate));
            sorted.forEach((player: any, index: number) => {
              allAwards.push({
                id: createAwardId('win_rate_leader', ranks[index], player.id),
                playerId: player.id,
                playerName: player.friendly_name,
                category: 'win_rate_leader',
                medalType: getMedalType(ranks[index]),
                year: null,
                value: Number(player.win_rate),
                wins: Number(player.wins),
                draws: Number(player.draws),
                losses: Number(player.losses),
                gamesTogether: Number(player.total_games),
                awardedAt: new Date().toISOString(),
              });
            });
          }
        }

        // Process Net Positive (goal differentials)
        if (goalDiffsResult.data) {
          const sorted = goalDiffsResult.data
            .sort((a: any, b: any) => Number(b.goal_differential) - Number(a.goal_differential))
            .slice(0, 3);
          const ranks = assignRanksWithTies(sorted, (p: any) => Number(p.goal_differential));
          sorted.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('net_positive', ranks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'net_positive',
              medalType: getMedalType(ranks[index]),
              year: null,
              value: Number(player.goal_differential),
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Iron Man (attendance streaks)
        if (attendanceStreaksResult.data) {
          const sorted = attendanceStreaksResult.data
            .sort((a: any, b: any) => Number(b.max_streak) - Number(a.max_streak))
            .slice(0, 3);
          const ranks = assignRanksWithTies(sorted, (p: any) => Number(p.max_streak));
          sorted.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('iron_man', ranks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'iron_man',
              medalType: getMedalType(ranks[index]),
              year: null,
              value: Number(player.max_streak),
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Hot Streak (winning streaks)
        if (winStreaksResult.data) {
          const sorted = winStreaksResult.data
            .sort((a: any, b: any) => Number(b.max_win_streak) - Number(a.max_win_streak))
            .slice(0, 3);
          const ranks = assignRanksWithTies(sorted, (p: any) => Number(p.max_win_streak));
          sorted.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('hot_streak', ranks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'hot_streak',
              medalType: getMedalType(ranks[index]),
              year: null,
              value: Number(player.max_win_streak),
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process The Wall (unbeaten streaks)
        if (unbeatenStreaksResult.data) {
          const sorted = unbeatenStreaksResult.data
            .sort((a: any, b: any) => Number(b.max_unbeaten_streak) - Number(a.max_unbeaten_streak))
            .slice(0, 3);
          const ranks = assignRanksWithTies(sorted, (p: any) => Number(p.max_unbeaten_streak));
          sorted.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('the_wall', ranks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'the_wall',
              medalType: getMedalType(ranks[index]),
              year: null,
              value: Number(player.max_unbeaten_streak),
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Appearance King (caps)
        if (capsResult.data) {
          const sorted = capsResult.data
            .sort((a: any, b: any) => Number(b.total_games) - Number(a.total_games))
            .slice(0, 3);
          const ranks = assignRanksWithTies(sorted, (p: any) => Number(p.total_games));
          sorted.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('appearance_king', ranks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'appearance_king',
              medalType: getMedalType(ranks[index]),
              year: null,
              value: Number(player.total_games),
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Dynamic Duo (chemistry)
        if (chemistryResult.data) {
          // Recalculate using points system to ensure consistency:
          // - Win = 3 points, Draw = 1 point, Loss = 0 points
          // - Performance rate = (wins×3 + draws×1) / (games×3) × 100
          // - Chemistry score = performance_rate × confidence_factor
          const CHEMISTRY_K = 10;
          const pairs = (chemistryResult.data as ChemistryPairResponse[])
            .filter((pair) => pair.player1_id < pair.player2_id) // Deduplicate
            .map(pair => {
              const games = Number(pair.games_together);
              const wins = Number(pair.wins_together);
              const draws = Number(pair.draws_together);

              // Calculate performance rate using points system
              const pointsEarned = (wins * 3) + (draws * 1);
              const pointsAvailable = games * 3;
              const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

              // Confidence factor based on sample size
              const confidenceFactor = games / (games + CHEMISTRY_K);
              const chemistryScore = performanceRate * confidenceFactor;

              return { ...pair, chemistryScore, performanceRate };
            })
            .sort((a, b) => b.chemistryScore - a.chemistryScore)
            .slice(0, 3);

          const pairRanks = assignRanksWithTies(pairs, (p: any) => p.chemistryScore);
          pairs.forEach((pair, index: number) => {
            allAwards.push({
              id: createAwardId('dynamic_duo', pairRanks[index], pair.player1_id),
              playerId: pair.player1_id,
              playerName: pair.player1_name,
              partnerId: pair.player2_id,
              partnerName: pair.player2_name,
              category: 'dynamic_duo',
              medalType: getMedalType(pairRanks[index]),
              year: null,
              value: pair.chemistryScore,
              wins: Number(pair.wins_together),
              draws: Number(pair.draws_together),
              losses: Number(pair.losses_together),
              gamesTogether: Number(pair.games_together),
              winPercentage: pair.performanceRate,
              awardedAt: new Date().toISOString(),
            });
          });

          // Process Cursed Duos (worst chemistry)
          // Curse score = (100 - performanceRate) × confidence_factor
          const cursedPairs = (chemistryResult.data as ChemistryPairResponse[])
            .filter((pair) => pair.player1_id < pair.player2_id) // Deduplicate
            .map(pair => {
              const games = Number(pair.games_together);
              const wins = Number(pair.wins_together);
              const draws = Number(pair.draws_together);

              // Calculate performance rate using points system
              const pointsEarned = (wins * 3) + (draws * 1);
              const pointsAvailable = games * 3;
              const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

              // Confidence factor based on sample size
              const confidenceFactor = games / (games + CHEMISTRY_K);
              const curseScore = (100 - performanceRate) * confidenceFactor;

              return { ...pair, curseScore, performanceRate };
            })
            .sort((a, b) => b.curseScore - a.curseScore)
            .slice(0, 3);

          const cursedPairRanks = assignRanksWithTies(cursedPairs, (p: any) => p.curseScore);
          cursedPairs.forEach((pair, index: number) => {
            allAwards.push({
              id: createAwardId('cursed_duos', cursedPairRanks[index], pair.player1_id),
              playerId: pair.player1_id,
              playerName: pair.player1_name,
              partnerId: pair.player2_id,
              partnerName: pair.player2_name,
              category: 'cursed_duos',
              medalType: getMedalType(cursedPairRanks[index]),
              year: null,
              value: pair.curseScore,
              wins: Number(pair.wins_together),
              draws: Number(pair.draws_together),
              losses: Number(pair.losses_together),
              gamesTogether: Number(pair.games_together),
              winPercentage: pair.performanceRate,
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Best Buddies
        if (buddiesResult.data) {
          // Deduplicate and sort by games together
          const buddies = buddiesResult.data
            .filter((buddy: any) => buddy.id < buddy.buddy_id) // Deduplicate
            .sort((a: any, b: any) => Number(b.games_together) - Number(a.games_together))
            .slice(0, 3);

          const buddyRanks = assignRanksWithTies(buddies, (b: any) => Number(b.games_together));
          buddies.forEach((buddy: any, index: number) => {
            allAwards.push({
              id: createAwardId('best_buddies', buddyRanks[index], buddy.id),
              playerId: buddy.id,
              playerName: buddy.friendly_name,
              partnerId: buddy.buddy_id,
              partnerName: buddy.buddy_friendly_name,
              category: 'best_buddies',
              medalType: getMedalType(buddyRanks[index]),
              year: null,
              value: Number(buddy.games_together),
              gamesTogether: Number(buddy.games_together),
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Fiercest Rivalry
        if (rivalryResult.data) {
          // Calculate rivalry using points system (same as win rate):
          // - Win = 3 points, Draw = 1 point, Loss = 0 points
          // - Performance rate = (wins×3 + draws×1) / (games×3) × 100
          // - Dominance = |performance_rate - 50| (how far from even)
          // - Rivalry score = dominance × confidence_factor (games / (games + K))
          const RIVALRY_K = 5;
          const rivalriesWithScore = (rivalryResult.data as RivalryLeaderboardResponse[])
            .map(rivalry => {
              const games = Number(rivalry.games_against);
              const wins = Number(rivalry.player1_wins);
              const draws = Number(rivalry.draws);

              // Calculate performance rate using points system
              const pointsEarned = (wins * 3) + (draws * 1);
              const pointsAvailable = games * 3;
              const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 50;

              // Dominance is how far from 50% (even matchup)
              const dominance = Math.abs(performanceRate - 50);

              // Confidence factor based on sample size
              const confidenceFactor = games / (games + RIVALRY_K);
              const rivalryScore = dominance * confidenceFactor;

              return { ...rivalry, rivalryScore, performanceRate };
            })
            .sort((a, b) => b.rivalryScore - a.rivalryScore)
            .slice(0, 3);

          const rivalryRanks = assignRanksWithTies(rivalriesWithScore, (r: any) => r.rivalryScore);
          rivalriesWithScore.forEach((rivalry, index: number) => {
            allAwards.push({
              id: createAwardId('fiercest_rivalry', rivalryRanks[index], rivalry.player1_id),
              playerId: rivalry.player1_id,
              playerName: rivalry.player1_name,
              partnerId: rivalry.player2_id,
              partnerName: rivalry.player2_name,
              category: 'fiercest_rivalry',
              medalType: getMedalType(rivalryRanks[index]),
              year: null,
              value: rivalry.rivalryScore, // Weighted score: dominance × confidence
              wins: Number(rivalry.player1_wins),
              draws: Number(rivalry.draws),
              losses: Number(rivalry.player2_wins),
              gamesAgainst: Number(rivalry.games_against),
              winPercentage: rivalry.performanceRate, // Use points-based performance rate
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Dream Team Trio
        if (trioResult.data) {
          // Recalculate using points system to ensure consistency:
          // - Win = 3 points, Draw = 1 point, Loss = 0 points
          // - Performance rate = (wins×3 + draws×1) / (games×3) × 100
          // - Trio score = performance_rate × confidence_factor
          const TRIO_K = 3; // Lower K since trio minimum is 3 games
          const triosWithScore = (trioResult.data as TrioLeaderboardResponse[])
            .map(trio => {
              const games = Number(trio.games_together);
              const wins = Number(trio.wins);
              const draws = Number(trio.draws);

              // Calculate performance rate using points system
              const pointsEarned = (wins * 3) + (draws * 1);
              const pointsAvailable = games * 3;
              const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

              // Confidence factor based on sample size
              const confidenceFactor = games / (games + TRIO_K);
              const trioScore = performanceRate * confidenceFactor;

              return { ...trio, trioScore, performanceRate };
            })
            .sort((a, b) => b.trioScore - a.trioScore)
            .slice(0, 3);

          const trioRanks = assignRanksWithTies(triosWithScore, (t: any) => t.trioScore);
          triosWithScore.forEach((trio, index: number) => {
            allAwards.push({
              id: createAwardId('dream_team_trio', trioRanks[index], trio.player1_id),
              playerId: trio.player1_id,
              playerName: trio.player1_name,
              partnerId: trio.player2_id,
              partnerName: trio.player2_name,
              partner2Id: trio.player3_id,
              partner2Name: trio.player3_name,
              category: 'dream_team_trio',
              medalType: getMedalType(trioRanks[index]),
              year: null,
              value: trio.trioScore,
              wins: Number(trio.wins),
              draws: Number(trio.draws),
              losses: Number(trio.losses),
              gamesTogether: Number(trio.games_together),
              winPercentage: trio.performanceRate,
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Cursed Trio (worst trio chemistry)
        if (cursedTrioResult.data) {
          // Recalculate using points system for curse score:
          // - Curse score = (100 - performance_rate) × confidence_factor
          const TRIO_K = 3; // Lower K since trio minimum is 3 games
          const cursedTriosWithScore = (cursedTrioResult.data as TrioLeaderboardResponse[])
            .map(trio => {
              const games = Number(trio.games_together);
              const wins = Number(trio.wins);
              const draws = Number(trio.draws);

              // Calculate performance rate using points system
              const pointsEarned = (wins * 3) + (draws * 1);
              const pointsAvailable = games * 3;
              const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

              // Confidence factor based on sample size
              const confidenceFactor = games / (games + TRIO_K);
              const curseScore = (100 - performanceRate) * confidenceFactor;

              return { ...trio, curseScore, performanceRate };
            })
            .sort((a, b) => b.curseScore - a.curseScore)
            .slice(0, 3);

          const cursedTrioRanks = assignRanksWithTies(cursedTriosWithScore, (t: any) => t.curseScore);
          cursedTriosWithScore.forEach((trio, index: number) => {
            allAwards.push({
              id: createAwardId('cursed_trio', cursedTrioRanks[index], trio.player1_id),
              playerId: trio.player1_id,
              playerName: trio.player1_name,
              partnerId: trio.player2_id,
              partnerName: trio.player2_name,
              partner2Id: trio.player3_id,
              partner2Name: trio.player3_name,
              category: 'cursed_trio',
              medalType: getMedalType(cursedTrioRanks[index]),
              year: null,
              value: trio.curseScore,
              wins: Number(trio.wins),
              draws: Number(trio.draws),
              losses: Number(trio.losses),
              gamesTogether: Number(trio.games_together),
              winPercentage: trio.performanceRate,
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Blue Blood and Dutch Master (team colors)
        if (teamColorsResult.data) {
          const blueTeam = teamColorsResult.data
            .filter((p: any) => p.team === 'blue')
            .sort((a: any, b: any) => Number(b.team_frequency) - Number(a.team_frequency))
            .slice(0, 3);

          const blueRanks = assignRanksWithTies(blueTeam, (p: any) => Number(p.team_frequency));
          blueTeam.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('blue_blood', blueRanks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'blue_blood',
              medalType: getMedalType(blueRanks[index]),
              year: null,
              value: Number(player.team_frequency) * 100, // Convert to percentage
              awardedAt: new Date().toISOString(),
            });
          });

          const orangeTeam = teamColorsResult.data
            .filter((p: any) => p.team === 'orange')
            .sort((a: any, b: any) => Number(b.team_frequency) - Number(a.team_frequency))
            .slice(0, 3);

          const orangeRanks = assignRanksWithTies(orangeTeam, (p: any) => Number(p.team_frequency));
          orangeTeam.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('dutch_master', orangeRanks[index], player.id),
              playerId: player.id,
              playerName: player.friendly_name,
              category: 'dutch_master',
              medalType: getMedalType(orangeRanks[index]),
              year: null,
              value: Number(player.team_frequency) * 100, // Convert to percentage
              awardedAt: new Date().toISOString(),
            });
          });
        }

        // Process Super Sub (reserve appearances)
        // Fall back to direct query since RPC may not exist
        if (superSubResult.data && !superSubResult.error) {
          const superSubData = superSubResult.data.slice(0, 3);
          const superSubRanks = assignRanksWithTies(superSubData, (p: any) => Number(p.reserve_count || p.total_games));
          superSubData.forEach((player: any, index: number) => {
            allAwards.push({
              id: createAwardId('super_sub', superSubRanks[index], player.id || player.player_id),
              playerId: player.id || player.player_id,
              playerName: player.friendly_name,
              category: 'super_sub',
              medalType: getMedalType(superSubRanks[index]),
              year: null,
              value: Number(player.reserve_count || player.total_games),
              awardedAt: new Date().toISOString(),
            });
          });
        } else {
          // Fallback: query game_registrations directly for reserve counts
          const { data: reserveData } = await supabase
            .from('game_registrations')
            .select(`
              player_id,
              players!inner(friendly_name)
            `)
            .eq('status', 'reserve');

          if (reserveData) {
            // Group by player and count
            const counts = new Map<string, { player_id: string; friendly_name: string; count: number }>();
            reserveData.forEach((reg: any) => {
              const existing = counts.get(reg.player_id);
              if (existing) {
                existing.count++;
              } else {
                counts.set(reg.player_id, {
                  player_id: reg.player_id,
                  friendly_name: reg.players?.friendly_name || 'Unknown',
                  count: 1,
                });
              }
            });

            // Sort by count and get top 3
            const sorted = Array.from(counts.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);

            const fallbackRanks = assignRanksWithTies(sorted, (p: any) => p.count);
            sorted.forEach((player: any, index: number) => {
              allAwards.push({
                id: createAwardId('super_sub', fallbackRanks[index], player.player_id),
                playerId: player.player_id,
                playerName: player.friendly_name,
                category: 'super_sub',
                medalType: getMedalType(fallbackRanks[index]),
                year: null,
                value: player.count,
                awardedAt: new Date().toISOString(),
              });
            });
          }
        }

        setAwards(allAwards);
        setAwardsByCategory(groupLiveAwardsByCategory(allAwards, placeholders));
      } catch (err) {
        console.error('Error fetching live awards:', err);
        setError('Failed to load live awards');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveAwards();
  }, [targetYear]);

  return {
    awards,
    awardsByCategory,
    loading,
    error,
  };
};

export default useLiveAwards;
