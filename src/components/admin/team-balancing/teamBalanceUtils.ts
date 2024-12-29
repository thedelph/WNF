import { TeamAssignment } from './types';
import { calculateBalanceScore } from '../../../utils/teamBalancing';

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
export const findOptimalTeamBalance = (players: TeamAssignment[]): TeamBalance => {
    const combinations = generateTeamCombinations(players);
    return combinations.reduce((best, current) => 
        current.score < best.score ? current : best
    );
};

/**
 * Calculate the best possible swaps for a selected player
 * Returns an array of player IDs ranked by how much they would improve team balance
 */
export const calculateBestSwaps = (
    selectedPlayer: TeamAssignment,
    currentAssignments: TeamAssignment[]
): { [playerId: string]: number } => {
    const oppositeTeam = currentAssignments.filter(p => p.team !== selectedPlayer.team);
    const swapScores = oppositeTeam.map(player => {
        // Create a new assignment array with the swap
        const newAssignments = currentAssignments.map(p => {
            if (p.player_id === selectedPlayer.player_id) return { ...p, team: player.team };
            if (p.player_id === player.player_id) return { ...p, team: selectedPlayer.team };
            return p;
        });

        // Calculate the score for this swap
        const blueTeam = newAssignments.filter(p => p.team === 'blue');
        const orangeTeam = newAssignments.filter(p => p.team === 'orange');
        const score = calculateBalanceScore(blueTeam, orangeTeam);

        return { playerId: player.player_id, score };
    });

    // Sort by score (lower is better) and create rankings object
    const sortedScores = swapScores.sort((a, b) => a.score - b.score);
    const rankings: { [playerId: string]: number } = {};
    
    // Only rank the top 3 swaps
    sortedScores.slice(0, 3).forEach((score, index) => {
        rankings[score.playerId] = index;
    });

    return rankings;
};
