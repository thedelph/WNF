/**
 * Team balancing calculation utilities
 * Contains functions for calculating team statistics including attack, defense, game IQ, win rate, and goal differential
 * These are shared across the team balancing components
 */

import { TeamAssignment } from './types';

/**
 * Calculates comprehensive team statistics based on player ratings
 * @param team - Array of team assignments
 * @returns Object containing team statistics
 */
export const calculateTeamStats = (team: TeamAssignment[]) => {
  // Return empty stats for empty teams
  if (!team || team.length === 0) {
    return {
      attack: 0, 
      defense: 0, 
      gameIq: 0,
      winRate: 0,
      goalDifferential: 0,
      playerCount: 0
    };
  }

  // Calculate attack, defense, and game IQ averages
  const blueAttack = team.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / team.length;
  const blueDefense = team.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / team.length;
  const blueGameIq = team.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / team.length;
  
  // Filter out players with no game history for win rate calculation
  // No longer requiring 10+ games, just need valid data
  const playersWithWinRateHistory = team.filter(p => 
    p.win_rate !== null && 
    p.win_rate !== undefined
  );
  
  // Debug: Log each player's win rate data
  console.log('Player win rate data:');
  team.forEach(p => {
    console.log(`${p.friendly_name}: win_rate=${p.win_rate}, type=${typeof p.win_rate}`);
  });
  
  // Calculate win rate only if we have players with valid history
  const blueWinRate = playersWithWinRateHistory.length > 0 
    ? playersWithWinRateHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / playersWithWinRateHistory.length 
    : 0;
    
  // Filter for goal differential calculation (any player with valid data)
  const playersWithGoalDiffHistory = team.filter(p => 
    p.goal_differential !== null && 
    p.goal_differential !== undefined
  );
  
  // Debug: Log each player's goal differential data
  console.log('Player goal differential data:');
  team.forEach(p => {
    console.log(`${p.friendly_name}: goal_differential=${p.goal_differential}, type=${typeof p.goal_differential}`);
  });
    
  // Calculate goal differential as integer sum of all players' goal differentials
  // No longer dividing by number of players to get an average
  const blueGoalDiff = playersWithGoalDiffHistory.length > 0
    ? Math.round(playersWithGoalDiffHistory.reduce((sum, p) => sum + (p.goal_differential ?? 0), 0))
    : 0;
    
  // Log stats for debugging
  console.log(`Team stats (${team.length} players):`, {
    playersWithWinRate: playersWithWinRateHistory.length,
    playersWithGoalDiff: playersWithGoalDiffHistory.length,
    avgWinRate: blueWinRate,
    avgGoalDiff: blueGoalDiff,
    playerGoalDiffs: playersWithGoalDiffHistory.map(p => ({ 
      name: p.friendly_name, 
      goalDiff: p.goal_differential 
    }))
  });
    
  return { 
    attack: blueAttack, 
    defense: blueDefense, 
    gameIq: blueGameIq,
    winRate: blueWinRate,
    goalDifferential: blueGoalDiff,
    playerCount: team.length 
  };
};

/**
 * Calculates metrics for comparing two teams
 * @param blueTeam - Array of blue team assignments
 * @param orangeTeam - Array of orange team assignments
 * @returns Object containing comparison metrics and individual team stats
 */
export const calculateTeamComparison = (blueTeam: TeamAssignment[], orangeTeam: TeamAssignment[]) => {
  // Calculate stats for each team
  const blue = calculateTeamStats(blueTeam);
  const orange = calculateTeamStats(orangeTeam);
  
  // Debug: Calculate total goal differential across all players
  const allPlayers = [...blueTeam, ...orangeTeam];
  const playersWithGoalDiff = allPlayers.filter(p => 
    p.goal_differential !== null && 
    p.goal_differential !== undefined
  );
  
  const totalGoalDifferential = playersWithGoalDiff.reduce((sum, p) => sum + (p.goal_differential ?? 0), 0);
  
  console.log('Goal differential analysis:', {
    blueTeamTotal: blue.goalDifferential * blue.playerCount,
    orangeTeamTotal: orange.goalDifferential * orange.playerCount,
    totalAcrossAllPlayers: totalGoalDifferential,
    blueTeamPlayers: blueTeam.map(p => ({ 
      name: p.friendly_name, 
      goalDiff: p.goal_differential 
    })),
    orangeTeamPlayers: orangeTeam.map(p => ({ 
      name: p.friendly_name, 
      goalDiff: p.goal_differential 
    }))
  });
  
  // Calculate differences between teams
  const attackDiff = Math.abs(blue.attack - orange.attack);
  const defenseDiff = Math.abs(blue.defense - orange.defense);
  const gameIqDiff = Math.abs(blue.gameIq - orange.gameIq);
  
  // Only calculate stat differences if we have valid data (no longer requiring 10+ games)
  const hasWinRateData = 
    blueTeam.some(p => p.win_rate !== null && p.win_rate !== undefined) && 
    orangeTeam.some(p => p.win_rate !== null && p.win_rate !== undefined);
  
  const hasGoalDiffData =
    blueTeam.some(p => p.goal_differential !== null && p.goal_differential !== undefined) &&
    orangeTeam.some(p => p.goal_differential !== null && p.goal_differential !== undefined);
  
  const winRateDiff = hasWinRateData ? Math.abs(blue.winRate - orange.winRate) : 0;
  const goalDifferentialDiff = hasGoalDiffData ? Math.abs(blue.goalDifferential - orange.goalDifferential) : 0;
  
  // Calculate overall balance score (lower is better) with equal 20% weighting
  const weightedAttackDiff = attackDiff * 0.20;
  const weightedDefenseDiff = defenseDiff * 0.20;
  const weightedGameIqDiff = gameIqDiff * 0.20;
  const weightedWinRateDiff = winRateDiff * 0.20;
  const weightedGoalDiffDiff = goalDifferentialDiff * 0.20;
  
  const currentScore = weightedAttackDiff + weightedDefenseDiff + weightedGameIqDiff + weightedWinRateDiff + weightedGoalDiffDiff;
  
  // Calculate normalized values for visualization
  // We'll use typical expected ranges for each metric to normalize them
  // These ranges can be adjusted based on your data
  const normalizeValue = (value: number, expectedMax: number) => {
    return Math.min(1, value / expectedMax);
  };
  
  // Expected max differences for each metric
  const maxAttackDiff = 2.0;       // 2.0 points is a significant attack rating difference
  const maxDefenseDiff = 2.0;      // 2.0 points is a significant defense rating difference
  const maxGameIqDiff = 2.0;       // 2.0 points is a significant game IQ rating difference
  const maxWinRateDiff = 20.0;     // 20% is a significant win rate difference
  const maxGoalDiffDiff = 20.0;    // 20 goals is a significant goal differential difference
  
  // Calculate normalized differences (0-1 scale)
  const normalizedAttackDiff = normalizeValue(attackDiff, maxAttackDiff);
  const normalizedDefenseDiff = normalizeValue(defenseDiff, maxDefenseDiff);
  const normalizedGameIqDiff = normalizeValue(gameIqDiff, maxGameIqDiff);
  const normalizedWinRateDiff = normalizeValue(winRateDiff, maxWinRateDiff);
  const normalizedGoalDiffDiff = normalizeValue(goalDifferentialDiff, maxGoalDiffDiff);
  
  // Calculate normalized weighted differences (each 0-0.20 scale)
  const normalizedWeightedAttackDiff = normalizedAttackDiff * 0.20;
  const normalizedWeightedDefenseDiff = normalizedDefenseDiff * 0.20;
  const normalizedWeightedGameIqDiff = normalizedGameIqDiff * 0.20;
  const normalizedWeightedWinRateDiff = normalizedWinRateDiff * 0.20;
  const normalizedWeightedGoalDiffDiff = normalizedGoalDiffDiff * 0.20;
  
  return {
    blue,
    orange,
    attackDiff,
    defenseDiff,
    gameIqDiff,
    winRateDiff,
    goalDifferentialDiff,
    currentScore,
    // Add normalized values for visualization
    normalizedAttackDiff,
    normalizedDefenseDiff,
    normalizedGameIqDiff,
    normalizedWinRateDiff,
    normalizedGoalDiffDiff,
    normalizedWeightedAttackDiff,
    normalizedWeightedDefenseDiff,
    normalizedWeightedGameIqDiff,
    normalizedWeightedWinRateDiff,
    normalizedWeightedGoalDiffDiff
  };
};
