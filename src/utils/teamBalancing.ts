import { supabase } from './supabase';

interface PlayerRating {
  player_id: string;
  attack_rating: number;
  defense_rating: number;
  win_rate?: number; // Added win rate property
}

interface TeamStats {
  attack: number;
  defense: number;
  winRate: number; // Added win rate stat
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
  // Fetch both player ratings and recent win rates in parallel
  const [ratingResponse, winRateResponse] = await Promise.all([
    supabase
      .from('players')
      .select('id, average_attack_rating, average_defense_rating')
      .in('id', selectedPlayers.map(p => p.id)),
    supabase
      .rpc('get_player_recent_win_rates')
      .in('id', selectedPlayers.map(p => p.id))
  ]);

  if (ratingResponse.error) {
    throw ratingResponse.error;
  }

  if (winRateResponse.error) {
    throw winRateResponse.error;
  }

  // Create a map of player win rates for easy lookup
  const winRateMap = new Map<string, number>();
  if (winRateResponse.data) {
    winRateResponse.data.forEach((player: { id: string, recent_win_rate: number }) => {
      winRateMap.set(player.id, player.recent_win_rate || 50); // Default to 50% if no win rate
    });
  }

  return ratingResponse.data.map(player => ({
    player_id: player.id,
    attack_rating: player.average_attack_rating || 5,
    defense_rating: player.average_defense_rating || 5,
    win_rate: winRateMap.get(player.id) || 50 // Get win rate from map or default to 50%
  }));
};

/**
 * Calculate team statistics for attack, defense, and win rate
 */
const calculateTeamStats = (team: PlayerRating[]): TeamStats => {
  if (team.length === 0) {
    return { attack: 0, defense: 0, winRate: 0, playerCount: 0 };
  }
  
  return {
    attack: team.reduce((sum, p) => sum + p.attack_rating, 0),
    defense: team.reduce((sum, p) => sum + p.defense_rating, 0),
    winRate: team.reduce((sum, p) => sum + (p.win_rate || 50), 0) / team.length, // Calculate average win rate
    playerCount: team.length
  };
};

/**
 * Calculate a balance score for a given team composition
 * Lower score means better balance
 * Considers attack, defense ratings, and recent win rates
 */
export const calculateBalanceScore = (team1: PlayerRating[], team2: PlayerRating[]): number => {
  const stats1 = calculateTeamStats(team1);
  const stats2 = calculateTeamStats(team2);

  // Calculate raw differences in attack and defense
  const attackDiff = Math.abs(stats1.attack - stats2.attack);
  const defenseDiff = Math.abs(stats1.defense - stats2.defense);
  
  // Calculate difference in win rates (no longer scaled by factor of 5 to make all metrics equal)
  const winRateDiff = Math.abs(stats1.winRate - stats2.winRate);

  // Final score is the sum of attack, defense, and win rate differences
  return attackDiff + defenseDiff + winRateDiff;
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
