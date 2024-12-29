import { supabase } from './supabase';

interface PlayerRating {
  player_id: string;
  attack_rating: number;
  defense_rating: number;
}

interface TeamStats {
  attack: number;
  defense: number;
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
  const { data: players, error } = await supabase
    .from('players')
    .select('id, average_attack_rating, average_defense_rating')
    .in('id', selectedPlayers.map(p => p.id));

  if (error) {
    throw error;
  }

  return players.map(player => ({
    player_id: player.id,
    attack_rating: player.average_attack_rating || 5,
    defense_rating: player.average_defense_rating || 5,
  }));
};

/**
 * Calculate team statistics for attack and defense
 */
const calculateTeamStats = (team: PlayerRating[]): TeamStats => {
  if (team.length === 0) {
    return { attack: 0, defense: 0, playerCount: 0 };
  }
  
  return {
    attack: team.reduce((sum, p) => sum + p.attack_rating, 0),
    defense: team.reduce((sum, p) => sum + p.defense_rating, 0),
    playerCount: team.length
  };
};

/**
 * Calculate a balance score for a given team composition
 * Lower score means better balance
 * Only considers attack and defense ratings
 */
export const calculateBalanceScore = (team1: PlayerRating[], team2: PlayerRating[]): number => {
  const stats1 = calculateTeamStats(team1);
  const stats2 = calculateTeamStats(team2);

  // Calculate raw differences in attack and defense
  const attackDiff = Math.abs(stats1.attack - stats2.attack);
  const defenseDiff = Math.abs(stats1.defense - stats2.defense);

  // Final score is just the sum of attack and defense differences
  return attackDiff + defenseDiff;
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
