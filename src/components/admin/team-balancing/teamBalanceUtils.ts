import { TeamAssignment } from './types';
import { calculateBalanceScore } from '../../../utils/teamBalancing';
import { calculateTeamComparison } from './teamBalanceCalcs';

interface TeamBalance {
    blueTeam: TeamAssignment[];
    orangeTeam: TeamAssignment[];
    score: number;
}

/**
 * Generate all possible team combinations with similar sizes
 * Uses binary counting to generate combinations
 */
const generateTeamCombinations = (players: TeamAssignment[]): TeamBalance[] => {
    const combinations: TeamBalance[] = [];
    const n = players.length;

    // Generate binary numbers from 0 to 2^n - 1
    const maxCombinations = Math.pow(2, n);
    for (let i = 0; i < maxCombinations; i++) {
        const blueTeam: TeamAssignment[] = [];
        const orangeTeam: TeamAssignment[] = [];

        // Convert number to binary and distribute players
        for (let j = 0; j < n; j++) {
            if ((i & (1 << j)) !== 0) {
                blueTeam.push(players[j]);
            } else {
                orangeTeam.push(players[j]);
            }
        }

        // Only consider combinations where teams are of similar size
        if (Math.abs(blueTeam.length - orangeTeam.length) <= 1) {
            const score = calculateBalanceScore(blueTeam, orangeTeam);
            combinations.push({ blueTeam, orangeTeam, score });
        }
    }

    return combinations;
};

/**
 * Find the optimal team balance from all possible combinations
 */
/**
 * Find the optimal team balance from all possible combinations
 * @param players - Array of all available players
 * @returns The optimal team balance configuration
 */
export const findOptimalTeamBalance = (players: TeamAssignment[]): TeamBalance => {
    const combinations = generateTeamCombinations(players);
    
    // Sort combinations by score (ascending - lower is better)
    const sortedCombinations = [...combinations].sort((a, b) => a.score - b.score);
    
    // Return the best combination (lowest score)
    return sortedCombinations[0];
};

/**
 * Calculate the impact of each metric on the overall balance score
 * @param blueTeam - Blue team players
 * @param orangeTeam - Orange team players
 * @returns Object containing the impact of each metric
 */
export const calculateMetricImpact = (blueTeam: TeamAssignment[], orangeTeam: TeamAssignment[]) => {
    // Calculate original balance metrics
    const { attackDiff, defenseDiff, winRateDiff, goalDifferentialDiff } = 
        calculateTeamComparison(blueTeam, orangeTeam);
    
    // Calculate the contribution of each metric to the overall score
    const totalDiff = attackDiff + defenseDiff + winRateDiff + goalDifferentialDiff;
    
    return {
        attack: attackDiff / totalDiff,
        defense: defenseDiff / totalDiff,
        winRate: winRateDiff / totalDiff,
        goalDifferential: goalDifferentialDiff / totalDiff
    };
};

import { PlayerSwapSuggestion } from './types';

/**
 * Calculate the best possible swaps for improving team balance
 * Returns an array of swap suggestions with improvement metrics
 * @param blueTeam - Blue team players
 * @param orangeTeam - Orange team players
 * @param focusMetric - Optional metric to focus on (attack, defense, winRate, goalDifferential)
 * @returns Array of swap suggestions sorted by improvement
 */
export const calculateBestSwaps = (
    blueTeam: TeamAssignment[],
    orangeTeam: TeamAssignment[],
    focusMetric?: 'attack' | 'defense' | 'winRate' | 'goalDifferential'
): PlayerSwapSuggestion[] => {
    const swapSuggestions: PlayerSwapSuggestion[] = [];
    
    // Try swapping each blue player with each orange player
    for (const bluePlayer of blueTeam) {
        for (const orangePlayer of orangeTeam) {
            // Create a copy of the teams with this swap
            const newBlueTeam = blueTeam.filter(p => p.player_id !== bluePlayer.player_id).concat([{...orangePlayer, team: 'blue'}]);
            const newOrangeTeam = orangeTeam.filter(p => p.player_id !== orangePlayer.player_id).concat([{...bluePlayer, team: 'orange'}]);
            
            // Calculate original balance metrics
            const originalScore = calculateBalanceScore(blueTeam, orangeTeam);
            
            // Calculate new balance metrics after swap
            const newScore = calculateBalanceScore(newBlueTeam, newOrangeTeam);
            
            // Calculate attack and defense differences
            const originalAttackDiff = Math.abs(
                blueTeam.reduce((sum, p) => sum + p.attack_rating, 0) / blueTeam.length - 
                orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / orangeTeam.length
            );
            
            const newAttackDiff = Math.abs(
                newBlueTeam.reduce((sum, p) => sum + p.attack_rating, 0) / newBlueTeam.length - 
                newOrangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / newOrangeTeam.length
            );
            
            const originalDefenseDiff = Math.abs(
                blueTeam.reduce((sum, p) => sum + p.defense_rating, 0) / blueTeam.length - 
                orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / orangeTeam.length
            );
            
            const newDefenseDiff = Math.abs(
                newBlueTeam.reduce((sum, p) => sum + p.defense_rating, 0) / newBlueTeam.length - 
                newOrangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / newOrangeTeam.length
            );
            
            // Calculate win rate differences if data available
            const bluePlayersWithWinRate = blueTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10);
            const orangePlayersWithWinRate = orangeTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10);
            
            let winRateDiffImprovement = 0;
            if (bluePlayersWithWinRate.length > 0 && orangePlayersWithWinRate.length > 0) {
                const originalWinRateDiff = Math.abs(
                    bluePlayersWithWinRate.reduce((sum, p) => sum + (p.win_rate || 0), 0) / bluePlayersWithWinRate.length -
                    orangePlayersWithWinRate.reduce((sum, p) => sum + (p.win_rate || 0), 0) / orangePlayersWithWinRate.length
                );
                
                const newBluePlayersWithWinRate = newBlueTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10);
                const newOrangePlayersWithWinRate = newOrangeTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10);
                
                if (newBluePlayersWithWinRate.length > 0 && newOrangePlayersWithWinRate.length > 0) {
                    const newWinRateDiff = Math.abs(
                        newBluePlayersWithWinRate.reduce((sum, p) => sum + (p.win_rate || 0), 0) / newBluePlayersWithWinRate.length -
                        newOrangePlayersWithWinRate.reduce((sum, p) => sum + (p.win_rate || 0), 0) / newOrangePlayersWithWinRate.length
                    );
                    
                    winRateDiffImprovement = originalWinRateDiff - newWinRateDiff;
                }
            }
            
            // Calculate goal differential differences if data available
            const bluePlayersWithGoalDiff = blueTeam.filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10);
            const orangePlayersWithGoalDiff = orangeTeam.filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10);
            
            let goalDiffImprovement = 0;
            if (bluePlayersWithGoalDiff.length > 0 && orangePlayersWithGoalDiff.length > 0) {
                const originalGoalDiff = Math.abs(
                    bluePlayersWithGoalDiff.reduce((sum, p) => sum + (p.goal_differential || 0), 0) / bluePlayersWithGoalDiff.length -
                    orangePlayersWithGoalDiff.reduce((sum, p) => sum + (p.goal_differential || 0), 0) / orangePlayersWithGoalDiff.length
                );
                
                const newBluePlayersWithGoalDiff = newBlueTeam.filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10);
                const newOrangePlayersWithGoalDiff = newOrangeTeam.filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10);
                
                if (newBluePlayersWithGoalDiff.length > 0 && newOrangePlayersWithGoalDiff.length > 0) {
                    const newGoalDiff = Math.abs(
                        newBluePlayersWithGoalDiff.reduce((sum, p) => sum + (p.goal_differential || 0), 0) / newBluePlayersWithGoalDiff.length -
                        newOrangePlayersWithGoalDiff.reduce((sum, p) => sum + (p.goal_differential || 0), 0) / newOrangePlayersWithGoalDiff.length
                    );
                    
                    goalDiffImprovement = originalGoalDiff - newGoalDiff;
                }
            }
            
            // Calculate overall improvement (positive means better balance)
            const attackDiffImprovement = originalAttackDiff - newAttackDiff;
            const defenseDiffImprovement = originalDefenseDiff - newDefenseDiff;
            
            // Calculate weighted improvement based on focus metric or default weighting
            let totalDiffImprovement;
            
            if (focusMetric) {
                // If focusing on a specific metric, weight it at 70% and others at 10% each
                switch(focusMetric) {
                    case 'attack':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.7) + 
                            (defenseDiffImprovement * 0.1) + 
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'defense':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.7) + 
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'winRate':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.1) + 
                            (winRateDiffImprovement * 0.7) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'goalDifferential':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.1) + 
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.7);
                        break;
                }
            } else {
                // Default: Apply 25% weighting to each factor
                totalDiffImprovement = 
                    (attackDiffImprovement * 0.25) + 
                    (defenseDiffImprovement * 0.25) + 
                    (winRateDiffImprovement * 0.25) + 
                    (goalDiffImprovement * 0.25);
            }
            
            // Only include if it's an improvement
            if (totalDiffImprovement > 0) {
                // Calculate which metric has the biggest improvement
                const improvements = [
                    { metric: 'attack', value: attackDiffImprovement },
                    { metric: 'defense', value: defenseDiffImprovement },
                    { metric: 'winRate', value: winRateDiffImprovement },
                    { metric: 'goalDifferential', value: goalDiffImprovement }
                ];
                
                // Sort by improvement value (descending)
                improvements.sort((a, b) => b.value - a.value);
                
                // The metric with the biggest improvement
                const primaryImpactMetric = improvements[0].metric;
                
                swapSuggestions.push({
                    bluePlayer,
                    orangePlayer,
                    attackDiffImprovement,
                    defenseDiffImprovement,
                    winRateDiffImprovement,
                    goalDiffImprovement,
                    totalDiffImprovement,
                    primaryImpactMetric // Add the metric with the biggest impact
                });
            }
        }
    }
    
    // Sort by total improvement (descending)
    return swapSuggestions.sort((a, b) => b.totalDiffImprovement - a.totalDiffImprovement);
};
