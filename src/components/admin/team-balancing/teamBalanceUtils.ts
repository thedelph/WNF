import { TeamAssignment } from './types';
import { calculateBalanceScore } from '../../../utils/teamBalancing';
import { calculateTeamComparison } from './teamBalanceCalcs';

interface TeamBalance {
    blueTeam: TeamAssignment[];
    orangeTeam: TeamAssignment[];
    score: number;
}

/**
 * Check if a player has unknown stats (less than 10 games played)
 * @param player - The player to check
 * @returns True if the player has unknown stats
 */
export const isUnknownPlayer = (player: TeamAssignment): boolean => {
    return player.total_games === null || 
           player.total_games === undefined || 
           player.total_games < 10;
};

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
 * Generate all combinations of players of a specific size
 * Used for distributing unknown players optimally
 */
const generateCombinationsOfSize = (players: TeamAssignment[], size: number): TeamAssignment[][] => {
    if (size === 0) return [[]];
    if (size > players.length) return [];
    if (size === players.length) return [players];
    
    const combinations: TeamAssignment[][] = [];
    
    // Recursive approach to generate combinations
    const generate = (start: number, current: TeamAssignment[]) => {
        if (current.length === size) {
            combinations.push([...current]);
            return;
        }
        
        for (let i = start; i < players.length; i++) {
            current.push(players[i]);
            generate(i + 1, current);
            current.pop();
        }
    };
    
    generate(0, []);
    return combinations;
};

/**
 * Calculate balance score based only on Attack, Defense, and Game IQ
 * Used for distributing unknown players optimally
 */
const calculatePartialBalanceScore = (team1: TeamAssignment[], team2: TeamAssignment[]): number => {
    // Return high score if either team is empty
    if (team1.length === 0 || team2.length === 0) {
        return 1000;
    }
    
    // Calculate average ratings for each team
    const team1Attack = team1.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / team1.length;
    const team1Defense = team1.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / team1.length;
    const team1GameIq = team1.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / team1.length;
    
    const team2Attack = team2.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / team2.length;
    const team2Defense = team2.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / team2.length;
    const team2GameIq = team2.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / team2.length;
    
    // Calculate differences
    const attackDiff = Math.abs(team1Attack - team2Attack);
    const defenseDiff = Math.abs(team1Defense - team2Defense);
    const gameIqDiff = Math.abs(team1GameIq - team2GameIq);
    
    // Equal weighting for the three known metrics
    return (attackDiff + defenseDiff + gameIqDiff) / 3;
};

/**
 * Find optimal distribution of unknown players based on their known stats
 * @param unknownPlayers - Players with < 10 games
 * @param targetBlueCount - Target number of unknowns for blue team
 * @returns Optimal distribution of unknown players
 */
const findOptimalUnknownDistribution = (
    unknownPlayers: TeamAssignment[], 
    targetBlueCount: number
): { blueUnknowns: TeamAssignment[], orangeUnknowns: TeamAssignment[] } => {
    // Generate all possible combinations where blue team gets targetBlueCount unknowns
    const combinations = generateCombinationsOfSize(unknownPlayers, targetBlueCount);
    
    let bestScore = Infinity;
    let bestDistribution = {
        blueUnknowns: [] as TeamAssignment[],
        orangeUnknowns: [] as TeamAssignment[]
    };
    
    // Try each combination and find the one with best Attack/Defense/Game IQ balance
    for (const blueUnknowns of combinations) {
        const orangeUnknowns = unknownPlayers.filter(p => 
            !blueUnknowns.some(bp => bp.player_id === p.player_id)
        );
        
        // Calculate balance based only on the three known metrics
        const score = calculatePartialBalanceScore(blueUnknowns, orangeUnknowns);
        
        if (score < bestScore) {
            bestScore = score;
            bestDistribution = { blueUnknowns, orangeUnknowns };
        }
    }
    
    return bestDistribution;
};

/**
 * Find the optimal team balance from all possible combinations
 * Uses a two-phase approach:
 * 1. Distribute players with unknown stats optimally based on Attack/Defense/Game IQ
 * 2. Optimize remaining players for best overall balance
 * @param players - Array of all available players
 * @returns The optimal team balance configuration
 */
export const findOptimalTeamBalance = (players: TeamAssignment[]): TeamBalance => {
    // Separate players into unknown and experienced groups
    const unknownPlayers = players.filter(isUnknownPlayer);
    const experiencedPlayers = players.filter(p => !isUnknownPlayer(p));
    
    // Phase 1: Find optimal distribution of unknown players
    let blueUnknowns: TeamAssignment[] = [];
    let orangeUnknowns: TeamAssignment[] = [];
    
    if (unknownPlayers.length > 0) {
        const unknownForBlue = Math.floor(unknownPlayers.length / 2);
        const distribution = findOptimalUnknownDistribution(unknownPlayers, unknownForBlue);
        blueUnknowns = distribution.blueUnknowns;
        orangeUnknowns = distribution.orangeUnknowns;
    }
    
    // Phase 2: Find optimal distribution of experienced players
    let bestBalance: TeamBalance;
    
    if (experiencedPlayers.length > 0) {
        // Generate combinations only for experienced players
        const combinations = generateTeamCombinations(experiencedPlayers);
        
        // For each combination, add the pre-assigned unknowns and calculate score
        const fullCombinations = combinations.map(combo => {
            const blueTeam = [...combo.blueTeam, ...blueUnknowns];
            const orangeTeam = [...combo.orangeTeam, ...orangeUnknowns];
            const score = calculateBalanceScore(blueTeam, orangeTeam);
            
            return { blueTeam, orangeTeam, score };
        });
        
        // Sort by score and get the best
        const sortedCombinations = fullCombinations.sort((a, b) => a.score - b.score);
        bestBalance = sortedCombinations[0];
    } else {
        // If all players are unknowns, use the optimal distribution
        bestBalance = {
            blueTeam: blueUnknowns,
            orangeTeam: orangeUnknowns,
            score: calculateBalanceScore(blueUnknowns, orangeUnknowns)
        };
    }
    
    return bestBalance;
};

/**
 * Calculate the impact of each metric on the overall balance score
 * @param blueTeam - Blue team players
 * @param orangeTeam - Orange team players
 * @param permanentGKIds - Optional array of permanent goalkeeper player IDs
 * @returns Object containing the impact of each metric
 */
export const calculateMetricImpact = (blueTeam: TeamAssignment[], orangeTeam: TeamAssignment[], permanentGKIds?: string[]) => {
    // Calculate original balance metrics
    const { attackDiff, defenseDiff, gameIqDiff, winRateDiff, goalDifferentialDiff } =
        calculateTeamComparison(blueTeam, orangeTeam, permanentGKIds);
    
    // Calculate the contribution of each metric to the overall score
    const totalDiff = attackDiff + defenseDiff + gameIqDiff + winRateDiff + goalDifferentialDiff;
    
    return {
        attack: attackDiff / totalDiff,
        defense: defenseDiff / totalDiff,
        gameIq: gameIqDiff / totalDiff,
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
    focusMetric?: 'attack' | 'defense' | 'gameIq' | 'winRate' | 'goalDifferential'
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
                blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / blueTeam.length - 
                orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / orangeTeam.length
            );
            
            const newAttackDiff = Math.abs(
                newBlueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / newBlueTeam.length - 
                newOrangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / newOrangeTeam.length
            );
            
            const originalDefenseDiff = Math.abs(
                blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / blueTeam.length - 
                orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / orangeTeam.length
            );
            
            const newDefenseDiff = Math.abs(
                newBlueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / newBlueTeam.length - 
                newOrangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / newOrangeTeam.length
            );
            
            // Calculate game IQ differences
            const originalGameIqDiff = Math.abs(
                blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / blueTeam.length -
                orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / orangeTeam.length
            );

            const newGameIqDiff = Math.abs(
                newBlueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / newBlueTeam.length -
                newOrangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / newOrangeTeam.length
            );

            // Calculate GK rating differences
            const originalGkDiff = Math.abs(
                blueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 0), 0) / blueTeam.length -
                orangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 0), 0) / orangeTeam.length
            );

            const newGkDiff = Math.abs(
                newBlueTeam.reduce((sum, p) => sum + (p.gk_rating ?? 0), 0) / newBlueTeam.length -
                newOrangeTeam.reduce((sum, p) => sum + (p.gk_rating ?? 0), 0) / newOrangeTeam.length
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
            const gameIqDiffImprovement = originalGameIqDiff - newGameIqDiff;
            const gkDiffImprovement = originalGkDiff - newGkDiff;
            
            // Calculate weighted improvement based on focus metric or default weighting
            let totalDiffImprovement;
            
            if (focusMetric) {
                // If focusing on a specific metric, weight it at 60% and others at 10% each
                switch(focusMetric) {
                    case 'attack':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.6) + 
                            (defenseDiffImprovement * 0.1) + 
                            (gameIqDiffImprovement * 0.1) +
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'defense':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.6) + 
                            (gameIqDiffImprovement * 0.1) +
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'gameIq':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.1) + 
                            (gameIqDiffImprovement * 0.6) +
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'winRate':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.1) + 
                            (gameIqDiffImprovement * 0.1) +
                            (winRateDiffImprovement * 0.6) + 
                            (goalDiffImprovement * 0.1);
                        break;
                    case 'goalDifferential':
                        totalDiffImprovement = 
                            (attackDiffImprovement * 0.1) + 
                            (defenseDiffImprovement * 0.1) + 
                            (gameIqDiffImprovement * 0.1) +
                            (winRateDiffImprovement * 0.1) + 
                            (goalDiffImprovement * 0.6);
                        break;
                }
            } else {
                // Default: Apply 20% weighting to each factor
                totalDiffImprovement = 
                    (attackDiffImprovement * 0.20) + 
                    (defenseDiffImprovement * 0.20) + 
                    (gameIqDiffImprovement * 0.20) +
                    (winRateDiffImprovement * 0.20) + 
                    (goalDiffImprovement * 0.20);
            }
            
            // Only include if it's an improvement
            if (totalDiffImprovement > 0) {
                // Calculate which metric has the biggest improvement
                const improvements: { metric: 'attack' | 'defense' | 'gameIq' | 'gk' | 'winRate' | 'goalDifferential'; value: number }[] = [
                    { metric: 'attack', value: attackDiffImprovement },
                    { metric: 'defense', value: defenseDiffImprovement },
                    { metric: 'gameIq', value: gameIqDiffImprovement },
                    { metric: 'gk', value: gkDiffImprovement },
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
                    gameIqDiffImprovement,
                    gkDiffImprovement,
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
