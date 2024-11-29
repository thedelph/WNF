interface PlayerRating {
  player_id: string;
  attack_rating: number;
  defense_rating: number;
  win_rate: number;
}

interface TeamStats {
  attack: number;
  defense: number;
  winRate: number;
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
  // Fetch player ratings from the database
  const { data: players, error } = await supabase
    .from('players')
    .select('id, average_attack_rating, average_defense_rating, win_rate')
    .in('id', selectedPlayers.map(p => p.id));

  if (error) {
    console.error('Error fetching player ratings:', error);
    throw error;
  }

  return players.map(player => ({
    player_id: player.id,
    attack_rating: player.average_attack_rating || 5, // Default to 5 if no ratings
    defense_rating: player.average_defense_rating || 5, // Default to 5 if no ratings
    win_rate: player.win_rate || 50 // Default to 50% if no win rate
  }));
};

export const balanceTeams = (players: PlayerRating[]): BalancedTeams => {
  console.log('Starting team balancing with players:', players);

  if (!players || players.length === 0) {
    throw new Error('No players provided for team balancing');
  }

  // Calculate team size
  const teamSize = Math.floor(players.length / 2);
  console.log('Team size:', teamSize);
  
  // Function to calculate team stats
  const calculateTeamStats = (team: PlayerRating[]): TeamStats => {
    const avgAttack = team.reduce((sum, p) => sum + p.attack_rating, 0) / team.length;
    const avgDefense = team.reduce((sum, p) => sum + p.defense_rating, 0) / team.length;
    const avgWinRate = team.reduce((sum, p) => sum + p.win_rate, 0) / team.length;
    return { attack: avgAttack, defense: avgDefense, winRate: avgWinRate };
  };

  // Function to calculate difference between teams
  const calculateDifference = (team1: PlayerRating[], team2: PlayerRating[]): number => {
    const stats1 = calculateTeamStats(team1);
    const stats2 = calculateTeamStats(team2);
    return Math.abs(stats1.attack - stats2.attack) + 
           Math.abs(stats1.defense - stats2.defense) + 
           Math.abs(stats1.winRate - stats2.winRate);
  };

  let bestBalance: BalancedTeams | null = null;
  let minDifference = Infinity;

  // Try different combinations using a greedy approach with randomization
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const team1 = shuffledPlayers.slice(0, teamSize);
    const team2 = shuffledPlayers.slice(teamSize, teamSize * 2);
    
    const difference = calculateDifference(team1, team2);
    
    if (difference < minDifference) {
      minDifference = difference;
      const team1Stats = calculateTeamStats(team1);
      const team2Stats = calculateTeamStats(team2);
      
      bestBalance = {
        blueTeam: team1.map(p => p.player_id),
        orangeTeam: team2.map(p => p.player_id),
        stats: {
          blue: team1Stats,
          orange: team2Stats
        },
        difference
      };
    }
  }

  if (!bestBalance) {
    throw new Error('Failed to find a balanced team configuration');
  }

  console.log('Final balanced teams:', bestBalance);
  return bestBalance;
};
