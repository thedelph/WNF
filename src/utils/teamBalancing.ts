import { supabase } from './supabase';

interface PlayerRating {
  player_id: string;
  attack_rating: number;
  defense_rating: number;
  game_iq_rating: number;
  win_rate?: number | null; // Allow win rate to be null for players with no game history
  goal_differential?: number | null; // Goal differential from last 10 games
  total_games?: number | null; // Total games played by the player
}

interface TeamStats {
  attack: number;
  defense: number;
  gameIq: number;
  winRate: number; // Win rate stat
  goalDifferential: number; // Goal differential stat
  playerCount: number;
}

interface BalancedTeams {
  blueTeam: string[];
  orangeTeam: string[];
  stats: {
    blue: TeamStats;
    orange: TeamStats;
  };
  difference: number;
}

export const convertSelectedPlayersToRatings = async (selectedPlayers: any[]): Promise<PlayerRating[]> => {
  // Fetch player ratings, recent win rates, and goal differentials in parallel
  const [ratingResponse, winRateResponse, goalDiffResponse] = await Promise.all([
    supabase
      .from('players')
      .select('id, average_attack_rating, average_defense_rating, average_game_iq_rating')
      .in('id', selectedPlayers.map(p => p.id)),
    supabase
      .rpc('get_player_recent_win_rates', { games_threshold: 10 })
      .in('id', selectedPlayers.map(p => p.id)),
    supabase
      .rpc('get_player_recent_goal_differentials', { games_threshold: 10 })
      .in('id', selectedPlayers.map(p => p.id))
  ]);

  if (ratingResponse.error) {
    throw ratingResponse.error;
  }

  if (winRateResponse.error) {
    throw winRateResponse.error;
  }
  
  if (goalDiffResponse.error) {
    throw goalDiffResponse.error;
  }

  // Create maps for player win rates and goal differentials
  const winRateMap = new Map<string, number | null>();
  const goalDiffMap = new Map<string, number | null>();
  const totalGamesMap = new Map<string, number>();
  
  if (winRateResponse.data) {
    winRateResponse.data.forEach((player: { id: string, recent_win_rate: number | null, games_played: number }) => {
      // Only include win rate if player has played enough games
      winRateMap.set(player.id, player.games_played >= 10 ? player.recent_win_rate : null);
      totalGamesMap.set(player.id, player.games_played);
    });
  }
  
  if (goalDiffResponse.data) {
    goalDiffResponse.data.forEach((player: { id: string, recent_goal_differential: number | null, games_played: number }) => {
      // Only include goal differential if player has played enough games
      goalDiffMap.set(player.id, player.games_played >= 10 ? player.recent_goal_differential : 0);
    });
  }

  return ratingResponse.data.map(player => ({
    player_id: player.id,
    attack_rating: player.average_attack_rating || 5,
    defense_rating: player.average_defense_rating || 5,
    game_iq_rating: player.average_game_iq_rating || 5,
    win_rate: winRateMap.get(player.id), // Get win rate from map or leave as undefined
    goal_differential: goalDiffMap.get(player.id) || 0, // Get goal differential or default to 0
    total_games: totalGamesMap.get(player.id) || 0
  }));
};

/**
 * Calculate team statistics for attack, defense, win rate, and goal differential
 */
const calculateTeamStats = (team: PlayerRating[]): TeamStats => {
  // Handle empty teams
  if (team.length === 0) {
    return { attack: 0, defense: 0, gameIq: 0, winRate: 0, goalDifferential: 0, playerCount: 0 };
  }
  
  // Filter players that have win rate data (10+ games)
  const playersWithWinRates = team.filter(p => p.win_rate !== null && p.win_rate !== undefined);
  
  // Filter players that have goal differential data (10+ games)
  const playersWithGoalDiff = team.filter(p => p.goal_differential !== null && p.goal_differential !== undefined);
  
  // Calculate win rate only for players who have sufficient data
  const winRate = playersWithWinRates.length > 0
    ? playersWithWinRates.reduce((sum, p) => sum + (p.win_rate || 0), 0) / playersWithWinRates.length
    : 0;
    
  // Calculate goal differential average for the team
  const goalDifferential = playersWithGoalDiff.length > 0
    ? playersWithGoalDiff.reduce((sum, p) => sum + (p.goal_differential || 0), 0) / playersWithGoalDiff.length
    : 0;
  
  return {
    attack: team.reduce((sum, p) => sum + p.attack_rating, 0),
    defense: team.reduce((sum, p) => sum + p.defense_rating, 0),
    gameIq: team.reduce((sum, p) => sum + p.game_iq_rating, 0),
    winRate: winRate,
    goalDifferential: goalDifferential,
    playerCount: team.length
  };
};

/**
 * Calculate a balance score for a given team composition
 * Lower score means better balance
 * Considers attack, defense, game IQ ratings, recent win rates, and goal differentials
 * Each metric is weighted equally (20% each)
 */
export const calculateBalanceScore = (team1: PlayerRating[], team2: PlayerRating[]): number => {
  const stats1 = calculateTeamStats(team1);
  const stats2 = calculateTeamStats(team2);

  // Calculate differences for each metric
  const attackDiff = Math.abs(stats1.attack - stats2.attack);
  const defenseDiff = Math.abs(stats1.defense - stats2.defense);
  const gameIqDiff = Math.abs(stats1.gameIq - stats2.gameIq);
  
  // Check if we have valid win rate data
  const hasWinRateData = team1.some(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10) && 
                        team2.some(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10);
  const winRateDiff = hasWinRateData ? Math.abs(stats1.winRate - stats2.winRate) : 0;
  
  // Check if we have valid goal differential data
  const hasGoalDiffData = team1.some(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10) && 
                         team2.some(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10);
  const goalDiffDiff = hasGoalDiffData ? Math.abs(stats1.goalDifferential - stats2.goalDifferential) : 0;
  
  // Calculate normalized metrics based on team size to make them comparable
  const normalizedAttackDiff = attackDiff / Math.max(1, Math.max(stats1.playerCount, stats2.playerCount));
  const normalizedDefenseDiff = defenseDiff / Math.max(1, Math.max(stats1.playerCount, stats2.playerCount));
  const normalizedGameIqDiff = gameIqDiff / Math.max(1, Math.max(stats1.playerCount, stats2.playerCount));
  
  // Apply equal 20% weighting to each metric
  return (normalizedAttackDiff * 0.20) + 
         (normalizedDefenseDiff * 0.20) + 
         (normalizedGameIqDiff * 0.20) +
         (winRateDiff * 0.20) + 
         (goalDiffDiff * 0.20);
};

/**
 * Generate all possible team combinations and find the most balanced one
 * Uses binary counting to try every possible combination
 */
const findOptimalTeams = (players: PlayerRating[]): { team1: PlayerRating[]; team2: PlayerRating[]; score: number } => {
  const n = players.length;
  let bestScore = Infinity;
  let bestTeams = { team1: [] as PlayerRating[], team2: [] as PlayerRating[], score: Infinity };

  // Generate binary numbers from 0 to 2^n - 1
  const maxCombinations = Math.pow(2, n);
  for (let i = 0; i < maxCombinations; i++) {
    const team1: PlayerRating[] = [];
    const team2: PlayerRating[] = [];

    // Convert number to binary and distribute players
    for (let j = 0; j < n; j++) {
      if ((i & (1 << j)) !== 0) {
        team1.push(players[j]);
      } else {
        team2.push(players[j]);
      }
    }

    // Only consider combinations where teams are of similar size
    if (Math.abs(team1.length - team2.length) <= 1) {
      const score = calculateBalanceScore(team1, team2);
      if (score < bestScore) {
        bestScore = score;
        bestTeams = { team1, team2, score };
      }
    }
  }

  return bestTeams;
};

export const balanceTeams = (players: PlayerRating[]): BalancedTeams => {
  if (!players || players.length === 0) {
    throw new Error('No players provided for team balancing');
  }

  // Find the optimal team balance
  const { team1, team2, score } = findOptimalTeams(players);
  
  // Calculate final stats
  const team1Stats = calculateTeamStats(team1);
  const team2Stats = calculateTeamStats(team2);
  
  const result: BalancedTeams = {
    blueTeam: team1.map(p => p.player_id),
    orangeTeam: team2.map(p => p.player_id),
    stats: {
      blue: team1Stats,
      orange: team2Stats
    },
    difference: score
  };

  return result;
};
