import { TeamAssignment } from './types';
import { calculateBalanceScore } from '../../../utils/teamBalancing';

// Configuration constants for the three-layer system
const WEIGHT_SKILL = 0.70;      // 70% base skills (more conservative)
const WEIGHT_OVERALL = 0.20;    // 20% track record (reduced impact)
const WEIGHT_RECENT = 0.10;     // 10% current form (reduced impact)

// Goal difference normalization ranges
const OVERALL_GD_MIN = -50;
const OVERALL_GD_MAX = 50;
const RECENT_GD_MIN = -20;
const RECENT_GD_MAX = 20;

// Win rate and goal diff balance within performance scores
const WIN_RATE_WEIGHT = 0.7;
const GOAL_DIFF_WEIGHT = 0.3;

// Other constants
const MIN_GAMES_FOR_STATS = 10;
const BALANCE_THRESHOLD = 0.5;

// Momentum constants
const MOMENTUM_THRESHOLD_SMALL = 0.1;   // Below this, no momentum effect
const MOMENTUM_THRESHOLD_LARGE = 0.3;   // Above this, maximum momentum effect
const MOMENTUM_WEIGHT_HOT = 0.05;       // 5% bonus for hot streaks (reduced from 10%)
const MOMENTUM_WEIGHT_COLD = 0.03;      // 3% penalty for cold streaks (reduced from 5%)
const MOMENTUM_WEIGHT = 0.10;           // Overall momentum contribution (reduced from 15%)

export interface PlayerWithRating extends TeamAssignment {
  threeLayerRating: number;
  baseSkillRating: number;
  overallPerformanceScore?: number;
  recentFormScore?: number;
  momentumScore?: number;
  momentumCategory?: 'hot' | 'cold' | 'steady';
  momentumAdjustment?: number;
  tier?: number;
}

export interface TierInfo {
  tierNumber: number;
  players: PlayerWithRating[];
  skillRange: { min: number; max: number };
}

export interface TierBasedResult {
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
  tiers: TierInfo[];
  initialScore: number;
  optimizedScore: number;
  wasOptimized: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceMessage: string;
  debugLog?: string;
}

/**
 * Calculate the three-layer rating for a player
 * Combines base skill, overall performance, and recent form
 */
function calculateThreeLayerRating(player: TeamAssignment): {
  threeLayerRating: number;
  baseSkillRating: number;
  overallPerformanceScore?: number;
  recentFormScore?: number;
  momentumScore?: number;
  momentumCategory?: 'hot' | 'cold' | 'steady';
  momentumAdjustment?: number;
} {
  // Layer 1: Base Skill Rating (core ability)
  const baseSkillRating = ((player.attack_rating ?? 5) + 
                          (player.defense_rating ?? 5) + 
                          (player.game_iq_rating ?? 5)) / 3;
  
  // Check if player has enough games for performance metrics
  if (!player.total_games || player.total_games < MIN_GAMES_FOR_STATS) {
    // Players with < 10 games use skill rating only
    return {
      threeLayerRating: baseSkillRating,
      baseSkillRating,
      momentumScore: 0,
      momentumCategory: 'steady',
      momentumAdjustment: 0
    };
  }
  
  // Layer 2: Overall Performance (career track record)
  let overallWinRate = player.overall_win_rate ?? 50;
  // Convert to decimal if it's a percentage (> 1)
  if (overallWinRate > 1) {
    overallWinRate = overallWinRate / 100;
  }
  const overallGoalDiff = player.overall_goal_differential ?? 0;
  
  // Normalize goal differential to 0-1 range
  const overallGdNorm = Math.max(0, Math.min(1, 
    (overallGoalDiff - OVERALL_GD_MIN) / (OVERALL_GD_MAX - OVERALL_GD_MIN)
  ));
  
  const overallPerformanceScore = (overallWinRate * WIN_RATE_WEIGHT) + 
                                  (overallGdNorm * GOAL_DIFF_WEIGHT);
  
  // Layer 3: Recent Form (last 10 games)
  let recentWinRate = player.win_rate ?? 50;
  // Convert to decimal if it's a percentage (> 1)
  if (recentWinRate > 1) {
    recentWinRate = recentWinRate / 100;
  }
  const recentGoalDiff = player.goal_differential ?? 0;
  
  // Normalize recent goal differential
  const recentGdNorm = Math.max(0, Math.min(1,
    (recentGoalDiff - RECENT_GD_MIN) / (RECENT_GD_MAX - RECENT_GD_MIN)
  ));
  
  const recentFormScore = (recentWinRate * WIN_RATE_WEIGHT) + 
                         (recentGdNorm * GOAL_DIFF_WEIGHT);
  
  // Momentum calculation: Compare recent form to overall performance
  const momentum = recentFormScore - overallPerformanceScore;
  let momentumAdjustment = 0;
  let momentumCategory: 'hot' | 'cold' | 'steady' = 'steady';
  
  if (Math.abs(momentum) >= MOMENTUM_THRESHOLD_SMALL) {
    if (momentum > 0) {
      // Hot streak - performing better than usual
      momentumCategory = 'hot';
      const scaledMomentum = Math.min(momentum / MOMENTUM_THRESHOLD_LARGE, 1);
      momentumAdjustment = scaledMomentum * MOMENTUM_WEIGHT_HOT;
    } else {
      // Cold streak - performing worse than usual
      momentumCategory = 'cold';
      const scaledMomentum = Math.min(Math.abs(momentum) / MOMENTUM_THRESHOLD_LARGE, 1);
      momentumAdjustment = -scaledMomentum * MOMENTUM_WEIGHT_COLD;
    }
  }
  
  // Combined rating with three-layer weighting + momentum
  // The original formula would cap ratings at base skill, which is incorrect
  // We need performance to be able to boost OR reduce ratings
  // Solution: Use performance scores centered around 0.5 (neutral)
  // Score > 0.5 = boost, Score < 0.5 = penalty
  
  // Center the performance scores around 0 (subtract 0.5 to make neutral = 0)
  const overallAdjustment = (overallPerformanceScore - 0.5) * 2; // Range: -1 to +1
  const recentAdjustment = (recentFormScore - 0.5) * 2; // Range: -1 to +1
  
  // Apply weighted adjustments to base skill including momentum
  const finalRating = baseSkillRating * (1 + 
    (WEIGHT_OVERALL * overallAdjustment) + 
    (WEIGHT_RECENT * recentAdjustment) +
    (MOMENTUM_WEIGHT * momentumAdjustment)
  );
  
  return {
    threeLayerRating: finalRating,
    baseSkillRating,
    overallPerformanceScore,
    recentFormScore,
    momentumScore: momentum,
    momentumCategory,
    momentumAdjustment
  };
}

/**
 * Calculate tier sizes based on total number of players
 */
function calculateTierSizes(totalPlayers: number): number[] {
  if (totalPlayers <= 10) {
    // For small groups, use pairs
    const tiers = Math.floor(totalPlayers / 2);
    const sizes = new Array(tiers).fill(2);
    if (totalPlayers % 2 === 1) {
      sizes[sizes.length - 1] = 3; // Last tier gets the extra player
    }
    return sizes;
  } else if (totalPlayers <= 20) {
    // For medium groups, aim for 3-4 players per tier
    const baseTiers = Math.floor(totalPlayers / 4);
    const remainder = totalPlayers % 4;
    const sizes = new Array(baseTiers).fill(4);
    
    if (remainder > 0) {
      // Distribute remainder
      if (remainder === 1) {
        sizes[sizes.length - 1] = 5; // Add to last tier
      } else if (remainder === 2) {
        sizes.push(2); // New small tier
      } else if (remainder === 3) {
        sizes.push(3); // New tier of 3
      }
    }
    
    // Special case for 18 players: use the specified 4-4-3-4-3 distribution
    if (totalPlayers === 18) {
      return [4, 4, 3, 4, 3];
    }
    
    return sizes;
  } else {
    // For large groups, use 5-6 per tier
    const tiers = Math.ceil(totalPlayers / 5);
    const sizes = new Array(tiers).fill(5);
    const extra = (tiers * 5) - totalPlayers;
    
    // Remove extra slots from the last tiers
    for (let i = 0; i < extra; i++) {
      sizes[sizes.length - 1 - i]--;
    }
    
    return sizes;
  }
}

/**
 * Apply snake draft within tiers
 */
function applySnakeDraft(tiers: TierInfo[], debugLog?: { value: string }): { blueTeam: PlayerWithRating[]; orangeTeam: PlayerWithRating[] } {
  const blueTeam: PlayerWithRating[] = [];
  const orangeTeam: PlayerWithRating[] = [];
  
  // Calculate total players to determine target team sizes
  const totalPlayers = tiers.reduce((sum, tier) => sum + tier.players.length, 0);
  const targetTeamSize = Math.floor(totalPlayers / 2);
  
  // Randomly determine which team picks first in Tier 1
  let bluePicksFirst = Math.random() < 0.5;
  const initialFirstPicker = bluePicksFirst ? 'Blue' : 'Orange';
  
  if (debugLog) {
    debugLog.value += '\nSTEP 4: SNAKE DRAFT PROCESS\n';
    debugLog.value += '===========================\n';
    debugLog.value += `Randomly selected ${initialFirstPicker} team to pick first\n`;
    debugLog.value += `Target team size: ${targetTeamSize} players each (${totalPlayers} total)\n\n`;
  }
  
  // Pre-calculate how the standard snake draft would distribute players
  let simulatedBlueCount = 0;
  let simulatedOrangeCount = 0;
  let simulatedBlueFirst = bluePicksFirst;
  
  tiers.forEach((tier) => {
    const tierSize = tier.players.length;
    if (simulatedBlueFirst) {
      simulatedBlueCount += Math.ceil(tierSize / 2);
      simulatedOrangeCount += Math.floor(tierSize / 2);
    } else {
      simulatedOrangeCount += Math.ceil(tierSize / 2);
      simulatedBlueCount += Math.floor(tierSize / 2);
    }
    simulatedBlueFirst = !simulatedBlueFirst;
  });
  
  // Check if standard snake draft would create imbalance
  const wouldBeImbalanced = Math.abs(simulatedBlueCount - simulatedOrangeCount) > 1;
  
  if (wouldBeImbalanced && debugLog) {
    debugLog.value += `Warning: Standard snake draft would create imbalance (Blue: ${simulatedBlueCount}, Orange: ${simulatedOrangeCount})\n`;
    debugLog.value += `Adjusting draft pattern to ensure balanced teams...\n\n`;
  }
  
  // Track actual picks for balance
  let currentTierIndex = 0;
  
  tiers.forEach((tier, tierIndex) => {
    const tierPlayers = [...tier.players]; // Copy to avoid mutation
    currentTierIndex = tierIndex;
    
    if (debugLog) {
      debugLog.value += `Tier ${tier.tierNumber} Draft:\n`;
      debugLog.value += `  ${bluePicksFirst ? 'Blue' : 'Orange'} picks first\n`;
    }
    
    // Check if we need to adjust the pattern to maintain balance
    let adjustedPattern = false;
    const remainingTiers = tiers.length - tierIndex - 1;
    const currentBlueTotal = blueTeam.length;
    const currentOrangeTotal = orangeTeam.length;
    
    // If we're in the last few tiers and teams are getting imbalanced, adjust
    if (remainingTiers <= 2 && Math.abs(currentBlueTotal - currentOrangeTotal) >= 2) {
      // Give more picks to the team that's behind
      if (currentBlueTotal > currentOrangeTotal && bluePicksFirst) {
        bluePicksFirst = false;
        adjustedPattern = true;
        if (debugLog) debugLog.value += `  [Adjusted to Orange first to balance teams]\n`;
      } else if (currentOrangeTotal > currentBlueTotal && !bluePicksFirst) {
        bluePicksFirst = true;
        adjustedPattern = true;
        if (debugLog) debugLog.value += `  [Adjusted to Blue first to balance teams]\n`;
      }
    }
    
    // Distribute players in this tier
    tierPlayers.forEach((player, index) => {
      // Check if either team has reached the target size
      if (blueTeam.length >= targetTeamSize && orangeTeam.length < targetTeamSize) {
        orangeTeam.push(player);
        if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Orange (Blue team full)\n`;
      } else if (orangeTeam.length >= targetTeamSize && blueTeam.length < targetTeamSize) {
        blueTeam.push(player);
        if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Blue (Orange team full)\n`;
      } else {
        // Normal snake draft distribution
        if (bluePicksFirst) {
          // Blue picks on even indices (0, 2, 4...)
          if (index % 2 === 0) {
            blueTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Blue\n`;
          } else {
            orangeTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Orange\n`;
          }
        } else {
          // Orange picks on even indices (0, 2, 4...)
          if (index % 2 === 0) {
            orangeTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Orange\n`;
          } else {
            blueTeam.push(player);
            if (debugLog) debugLog.value += `  Pick ${index + 1}: ${player.friendly_name} → Blue\n`;
          }
        }
      }
    });
    
    // Always alternate which team picks first in the next tier (unless we adjusted)
    if (!adjustedPattern) {
      bluePicksFirst = !bluePicksFirst;
    }
    
    if (debugLog && tier !== tiers[tiers.length - 1]) {
      debugLog.value += `  → Next tier: ${bluePicksFirst ? 'Blue' : 'Orange'} will pick first\n`;
    }
    
    if (debugLog) {
      debugLog.value += `  Current totals: Blue ${blueTeam.length}, Orange ${orangeTeam.length}\n\n`;
    }
  });
  
  // Final balance check - if teams are uneven, move last picked player
  if (Math.abs(blueTeam.length - orangeTeam.length) > 1) {
    if (debugLog) {
      debugLog.value += 'TEAM BALANCE ADJUSTMENT:\n';
      debugLog.value += `Teams are unbalanced (Blue: ${blueTeam.length}, Orange: ${orangeTeam.length})\n`;
    }
    
    if (blueTeam.length > orangeTeam.length) {
      // Move last blue player to orange
      const playerToMove = blueTeam.pop();
      if (playerToMove) {
        orangeTeam.push(playerToMove);
        if (debugLog) debugLog.value += `Moving ${playerToMove.friendly_name} from Blue to Orange\n`;
      }
    } else {
      // Move last orange player to blue
      const playerToMove = orangeTeam.pop();
      if (playerToMove) {
        blueTeam.push(playerToMove);
        if (debugLog) debugLog.value += `Moving ${playerToMove.friendly_name} from Orange to Blue\n`;
      }
    }
    
    if (debugLog) {
      debugLog.value += `Final totals: Blue ${blueTeam.length}, Orange ${orangeTeam.length}\n\n`;
    }
  }
  
  return { blueTeam, orangeTeam };
}

/**
 * Calculate balance score for tier-based teams
 * Uses only Attack, Defense, and Game IQ for balance calculation
 */
function calculateTierBalanceScore(blueTeam: PlayerWithRating[], orangeTeam: PlayerWithRating[]): number {
  if (blueTeam.length === 0 || orangeTeam.length === 0) {
    return 1000; // Very high score for empty teams
  }
  
  // Calculate average ratings
  const blueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
  const orangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;
  
  const blueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
  const orangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;
  
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;
  
  // Calculate the maximum difference
  const attackDiff = Math.abs(blueAttack - orangeAttack);
  const defenseDiff = Math.abs(blueDefense - orangeDefense);
  const gameIqDiff = Math.abs(blueGameIq - orangeGameIq);
  
  return Math.max(attackDiff, defenseDiff, gameIqDiff);
}

/**
 * Optimize teams by trying same-tier swaps only, starting from lowest tier upwards
 */
function optimizeTeams(
  initialBlueTeam: PlayerWithRating[], 
  initialOrangeTeam: PlayerWithRating[],
  debugLog?: { value: string }
): {
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
  finalScore: number;
  wasOptimized: boolean;
  swapCount: number;
  swapDetails: Array<{ bluePlayer: string; orangePlayer: string; improvement: number; tier: number }>;
} {
  let blueTeam = [...initialBlueTeam];
  let orangeTeam = [...initialOrangeTeam];
  let currentBalance = calculateTierBalanceScore(blueTeam, orangeTeam);
  let wasOptimized = false;
  let swapCount = 0;
  const swapDetails: Array<{ bluePlayer: string; orangePlayer: string; improvement: number; tier: number }> = [];
  
  if (debugLog) {
    debugLog.value += 'STEP 6: TIER-CONSTRAINED OPTIMIZATION PHASE\n';
    debugLog.value += '==========================================\n';
    debugLog.value += `Current Balance: ${currentBalance.toFixed(3)}\n`;
    debugLog.value += `Threshold: ${BALANCE_THRESHOLD}\n`;
    debugLog.value += 'Only same-tier swaps allowed, starting from lowest tier\n\n';
  }
  
  // Only optimize if balance exceeds threshold
  if (currentBalance <= BALANCE_THRESHOLD) {
    if (debugLog) {
      debugLog.value += 'No optimization needed - balance is within threshold\n\n';
    }
    return {
      blueTeam,
      orangeTeam,
      finalScore: currentBalance,
      wasOptimized: false,
      swapCount: 0,
      swapDetails: []
    };
  }
  
  // Group players by tier
  const blueTiers = new Map<number, PlayerWithRating[]>();
  const orangeTiers = new Map<number, PlayerWithRating[]>();
  
  blueTeam.forEach(player => {
    const tier = player.tier ?? 1;
    if (!blueTiers.has(tier)) blueTiers.set(tier, []);
    blueTiers.get(tier)!.push(player);
  });
  
  orangeTeam.forEach(player => {
    const tier = player.tier ?? 1;
    if (!orangeTiers.has(tier)) orangeTiers.set(tier, []);
    orangeTiers.get(tier)!.push(player);
  });
  
  // Get all tiers and sort from lowest to highest (Tier 5 → Tier 1)
  const allTiers = Array.from(new Set([...blueTiers.keys(), ...orangeTiers.keys()])).sort((a, b) => b - a);
  
  let totalIterations = 0;
  const MAX_ITERATIONS = 100;
  
  // Start optimization from lowest tier upwards (Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1)
  // allTiers is sorted [5, 4, 3, 2, 1], so we iterate from index 0 to length-1
  for (let tierIndex = 0; tierIndex < allTiers.length; tierIndex++) {
    const currentTier = allTiers[tierIndex];
    
    // Stop if we've reached acceptable balance
    if (currentBalance <= BALANCE_THRESHOLD) {
      if (debugLog) {
        debugLog.value += `Balance threshold reached (${currentBalance.toFixed(3)} ≤ ${BALANCE_THRESHOLD}), stopping optimization\n\n`;
      }
      break;
    }
    const blueTierPlayers = blueTiers.get(currentTier) || [];
    const orangeTierPlayers = orangeTiers.get(currentTier) || [];
    
    if (blueTierPlayers.length === 0 || orangeTierPlayers.length === 0) {
      continue; // Skip if no players in this tier on one team
    }
    
    if (debugLog) {
      debugLog.value += `Optimizing Tier ${currentTier}:\n`;
      debugLog.value += `  Blue: ${blueTierPlayers.map(p => p.friendly_name).join(', ')}\n`;
      debugLog.value += `  Orange: ${orangeTierPlayers.map(p => p.friendly_name).join(', ')}\n`;
    }
    
    let tierImproved = true;
    let tierIterations = 0;
    
    while (tierImproved && totalIterations < MAX_ITERATIONS) {
      tierImproved = false;
      tierIterations++;
      totalIterations++;
      
      let bestSwap: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating } | null = null;
      let bestScore = currentBalance;
      
      // Try all possible swaps within this tier only
      for (const bluePlayer of blueTierPlayers) {
        for (const orangePlayer of orangeTierPlayers) {
          // Create temporary teams with this swap
          const tempBlue = [...blueTeam];
          const tempOrange = [...orangeTeam];
          
          const blueIndex = tempBlue.findIndex(p => p.player_id === bluePlayer.player_id);
          const orangeIndex = tempOrange.findIndex(p => p.player_id === orangePlayer.player_id);
          
          if (blueIndex === -1 || orangeIndex === -1) continue;
          
          tempBlue[blueIndex] = orangePlayer;
          tempOrange[orangeIndex] = bluePlayer;
          
          const newBalance = calculateTierBalanceScore(tempBlue, tempOrange);
          
          if (newBalance < bestScore) {
            bestScore = newBalance;
            bestSwap = { bluePlayer, orangePlayer };
            tierImproved = true;
          }
        }
      }
      
      // Execute the best swap if found
      if (bestSwap) {
        const blueIndex = blueTeam.findIndex(p => p.player_id === bestSwap.bluePlayer.player_id);
        const orangeIndex = orangeTeam.findIndex(p => p.player_id === bestSwap.orangePlayer.player_id);
        
        if (debugLog) {
          debugLog.value += `  Iteration ${tierIterations}: Swapping ${bestSwap.bluePlayer.friendly_name} ↔ ${bestSwap.orangePlayer.friendly_name}\n`;
          debugLog.value += `    New balance: ${bestScore.toFixed(3)} (improved by ${(currentBalance - bestScore).toFixed(3)})\n`;
        }
        
        blueTeam[blueIndex] = bestSwap.orangePlayer;
        orangeTeam[orangeIndex] = bestSwap.bluePlayer;
        swapCount++;
        
        // Track swap details
        swapDetails.push({
          bluePlayer: bestSwap.bluePlayer.friendly_name,
          orangePlayer: bestSwap.orangePlayer.friendly_name,
          improvement: currentBalance - bestScore,
          tier: currentTier
        });
        
        // Update tier groups
        const bluePlayerIndex = blueTierPlayers.findIndex(p => p.player_id === bestSwap.bluePlayer.player_id);
        const orangePlayerIndex = orangeTierPlayers.findIndex(p => p.player_id === bestSwap.orangePlayer.player_id);
        
        if (bluePlayerIndex !== -1) blueTierPlayers[bluePlayerIndex] = bestSwap.orangePlayer;
        if (orangePlayerIndex !== -1) orangeTierPlayers[orangePlayerIndex] = bestSwap.bluePlayer;
        
        currentBalance = bestScore;
        wasOptimized = true;
        
        // Check if we've reached the threshold after this swap
        if (currentBalance <= BALANCE_THRESHOLD) {
          if (debugLog) {
            debugLog.value += `    Balance threshold reached (${currentBalance.toFixed(3)} ≤ ${BALANCE_THRESHOLD}), stopping tier optimization\n`;
          }
          break;
        }
      }
    }
    
    if (debugLog && tierIterations > 1) {
      debugLog.value += `  Tier ${currentTier} optimization complete after ${tierIterations - 1} iterations\n`;
    }
    debugLog.value += '\n';
  }
  
  if (debugLog && wasOptimized) {
    debugLog.value += `Tier-constrained optimization complete after ${totalIterations} total iterations\n`;
    debugLog.value += `Final balance: ${currentBalance.toFixed(3)}\n\n`;
  } else if (debugLog) {
    debugLog.value += 'No beneficial swaps found within tier constraints\n\n';
  }
  
  return {
    blueTeam,
    orangeTeam,
    finalScore: currentBalance,
    wasOptimized,
    swapCount,
    swapDetails
  };
}

/**
 * Calculate confidence level based on percentage of unknown players
 */
function calculateConfidence(players: PlayerWithRating[]): {
  level: 'high' | 'medium' | 'low';
  message: string;
  unknownCount: number;
  totalCount: number;
} {
  const unknownCount = players.filter(p => !p.total_games || p.total_games < MIN_GAMES_FOR_STATS).length;
  const totalCount = players.length;
  const unknownPercentage = (unknownCount / totalCount) * 100;
  
  if (unknownPercentage > 50) {
    return {
      level: 'low',
      message: 'Low confidence - many new players without performance history',
      unknownCount,
      totalCount
    };
  } else if (unknownPercentage > 25) {
    return {
      level: 'medium',
      message: 'Medium confidence - some new players without performance history',
      unknownCount,
      totalCount
    };
  } else {
    return {
      level: 'high',
      message: 'High confidence - most players have performance history',
      unknownCount,
      totalCount
    };
  }
}

/**
 * Format performance description for debug log
 */
function formatPerformanceDescription(winRate: number, goalDiff: number, isOverall: boolean = true): string {
  const winRatePercent = winRate > 1 ? winRate : winRate * 100;
  
  if (isOverall) {
    // Overall performance categorization
    if (winRatePercent >= 55 && goalDiff >= 15) return `Strong (${winRatePercent.toFixed(0)}%/+${goalDiff})`;
    if (winRatePercent >= 50 && goalDiff >= 5) return `Good (${winRatePercent.toFixed(0)}%/+${goalDiff})`;
    if (winRatePercent >= 45 && goalDiff >= -5) return `Average (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
    return `Poor (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
  } else {
    // Recent form categorization
    if (winRatePercent >= 60 && goalDiff >= 10) return `Excellent (${winRatePercent.toFixed(0)}%/+${goalDiff})`;
    if (winRatePercent >= 50 && goalDiff >= 0) return `Good (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
    if (winRatePercent >= 40 && goalDiff >= -5) return `Average (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
    if (winRatePercent <= 30 && goalDiff <= -10) return `Terrible (${winRatePercent.toFixed(0)}%/${goalDiff})`;
    return `Poor (${winRatePercent.toFixed(0)}%/${goalDiff >= 0 ? '+' : ''}${goalDiff})`;
  }
}

/**
 * Main function: Find optimal team balance using tier-based snake draft
 */
export function findTierBasedTeamBalance(players: TeamAssignment[]): TierBasedResult {
  let debugLog = '=== TIER-BASED SNAKE DRAFT DEBUG LOG ===\n\n';
  
  // Add Executive Summary placeholder - will be filled after processing
  let executiveSummaryData = {
    totalPlayers: players.length,
    ratedPlayers: 0,
    newPlayers: 0,
    tierCount: 0,
    tierSizes: '',
    finalBalance: 0,
    balanceQuality: '',
    optimizationSwaps: 0,
    teamStrengthAdvantage: ''
  };
  
  // We'll insert the executive summary here after we have all the data
  const executiveSummaryPlaceholder = '[[EXECUTIVE_SUMMARY]]';
  debugLog += executiveSummaryPlaceholder + '\n\n';
  
  // Add performance categories legend
  debugLog += 'PERFORMANCE CATEGORIES\n';
  debugLog += '=====================\n';
  debugLog += 'Overall Performance:\n';
  debugLog += '  Excellent: 55%+ win rate AND positive goal diff\n';
  debugLog += '  Strong: 55%+ win rate OR +15 goal diff\n';
  debugLog += '  Good: 50-54% win rate OR positive goal diff\n';
  debugLog += '  Average: 45-49% win rate, small goal diff (±5)\n';
  debugLog += '  Poor: 40-44% win rate OR negative goal diff\n';
  debugLog += '  Terrible: <40% win rate AND negative goal diff\n';
  debugLog += '\nRecent Form:\n';
  debugLog += '  Excellent: 60%+ win rate AND +10 goal diff\n';
  debugLog += '  Good: 50%+ win rate OR positive goal diff\n';
  debugLog += '  Average: 40-49% win rate, small goal diff (±5)\n';
  debugLog += '  Poor: 30-39% win rate OR negative goal diff\n';
  debugLog += '  Terrible: <30% win rate AND -10 goal diff\n';
  debugLog += '\nMomentum Indicators:\n';
  debugLog += '  🔥 Hot Streak: Recent form significantly better than overall\n';
  debugLog += '  ❄️ Cold Streak: Recent form significantly worse than overall\n';
  debugLog += '  ● Steady: Recent form similar to overall performance\n\n';
  
  // Step 1: Calculate three-layer ratings for all players
  debugLog += 'STEP 1: CALCULATING THREE-LAYER RATINGS\n';
  debugLog += '=====================================\n\n';
  
  const playersWithRatings: PlayerWithRating[] = players.map(player => {
    const ratingInfo = calculateThreeLayerRating(player);
    
    // Track rated vs new players for executive summary
    if (player.total_games && player.total_games >= MIN_GAMES_FOR_STATS) {
      executiveSummaryData.ratedPlayers++;
    } else {
      executiveSummaryData.newPlayers++;
    }
    
    debugLog += `Player: ${player.friendly_name}\n`;
    debugLog += `  Base Skill: Attack=${player.attack_rating ?? 5}, Defense=${player.defense_rating ?? 5}, Game IQ=${player.game_iq_rating ?? 5}\n`;
    debugLog += `  Base Skill Rating: ${ratingInfo.baseSkillRating.toFixed(2)}\n`;
    debugLog += `  Total Games: ${player.total_games ?? 0}\n`;
    
    if (player.total_games && player.total_games >= 10) {
      // Format win rates consistently as percentages
      const overallWR = player.overall_win_rate ?? 0;
      const recentWR = player.win_rate ?? 0;
      const overallWRDisplay = (overallWR > 1 ? overallWR : overallWR * 100).toFixed(2);
      const recentWRDisplay = (recentWR > 1 ? recentWR : recentWR * 100).toFixed(2);
      
      debugLog += `  Overall Stats: Win Rate=${overallWRDisplay}%, Goal Diff=${player.overall_goal_differential ?? 0}\n`;
      debugLog += `  Recent Stats: Win Rate=${recentWRDisplay}%, Goal Diff=${player.goal_differential ?? 0}\n`;
      debugLog += `  Overall Performance Score: ${ratingInfo.overallPerformanceScore?.toFixed(3) ?? 'N/A'}\n`;
      debugLog += `  Recent Form Score: ${ratingInfo.recentFormScore?.toFixed(3) ?? 'N/A'}\n`;
      debugLog += `  Momentum: ${ratingInfo.momentumScore?.toFixed(3) ?? 'N/A'} (${ratingInfo.momentumCategory ?? 'steady'})\n`;
      debugLog += `  Momentum Adjustment: ${ratingInfo.momentumAdjustment?.toFixed(3) ?? 'N/A'}\n`;
      debugLog += `  Three-Layer Rating: ${ratingInfo.threeLayerRating.toFixed(2)} (adjusted from ${ratingInfo.baseSkillRating.toFixed(2)})\n`;
    } else {
      debugLog += `  Three-Layer Rating: ${ratingInfo.threeLayerRating.toFixed(2)} (skill only - less than 10 games)\n`;
    }
    debugLog += '\n';
    
    return {
      ...player,
      ...ratingInfo
    };
  });
  
  // Create player transformation table
  debugLog += '\nPLAYER TRANSFORMATION TABLE\n';
  debugLog += '==========================\n';
  debugLog += 'Shows how three-layer system transforms player ratings based on performance\n\n';
  
  // Sort by base skill for transformation comparison
  const transformationData = [...playersWithRatings].sort((a, b) => b.baseSkillRating - a.baseSkillRating);
  
  // Option 1: Detailed Table Format
  debugLog += 'Player       | Base  | Overall Performance    | Recent Form        | Momentum | Final | Change\n';
  debugLog += '-------------|-------|----------------------|-------------------|----------|-------|--------\n';
  
  transformationData.forEach(player => {
    const change = player.threeLayerRating - player.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    if (player.total_games && player.total_games >= 10) {
      const overallWR = player.overall_win_rate ?? 50;
      const overallGD = player.overall_goal_differential ?? 0;
      const recentWR = player.win_rate ?? 50;
      const recentGD = player.goal_differential ?? 0;
      
      const overallPerf = formatPerformanceDescription(overallWR, overallGD, true);
      const recentPerf = formatPerformanceDescription(recentWR, recentGD, false);
      
      // Format momentum indicator
      const momentumScore = player.momentumScore ?? 0;
      const momentumCategory = player.momentumCategory ?? 'steady';
      const momentumDisplay = `${momentumScore.toFixed(2)} (${momentumCategory})`;
      
      debugLog += `${player.friendly_name.padEnd(12)} | ${player.baseSkillRating.toFixed(2).padStart(5)} | ${overallPerf.padEnd(20)} | ${recentPerf.padEnd(17)} | ${momentumDisplay.padEnd(8)} | ${player.threeLayerRating.toFixed(2).padStart(5)} | ${changeStr}\n`;
    } else {
      debugLog += `${player.friendly_name.padEnd(12)} | ${player.baseSkillRating.toFixed(2).padStart(5)} | N/A (<10 games)      | N/A               | N/A      | ${player.threeLayerRating.toFixed(2).padStart(5)} | ${changeStr}\n`;
    }
  });
  
  // Option 2: Compact Summary Format (as requested)
  debugLog += '\n\nCOMPACT TRANSFORMATION SUMMARY\n';
  debugLog += '==============================\n';
  debugLog += 'Player | Base Skill | Overall W% | Overall GD | Recent W% | Recent GD | Momentum | Final Rating | Change\n';
  debugLog += '-------|------------|------------|------------|-----------|-----------|----------|--------------|--------\n';
  
  transformationData.forEach(player => {
    const change = player.threeLayerRating - player.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    if (player.total_games && player.total_games >= 10) {
      const overallWR = player.overall_win_rate ?? 50;
      const overallGD = player.overall_goal_differential ?? 0;
      const recentWR = player.win_rate ?? 50;
      const recentGD = player.goal_differential ?? 0;
      
      const owrStr = (overallWR > 1 ? overallWR : overallWR * 100).toFixed(0) + '%';
      const rwrStr = (recentWR > 1 ? recentWR : recentWR * 100).toFixed(0) + '%';
      const ogdStr = overallGD >= 0 ? `+${overallGD}` : `${overallGD}`;
      const rgdStr = recentGD >= 0 ? `+${recentGD}` : `${recentGD}`;
      
      // Format momentum for compact display
      const momentumScore = player.momentumScore ?? 0;
      const momentumCategory = player.momentumCategory ?? 'steady';
      const momentumStr = `${momentumScore.toFixed(2)}${momentumCategory === 'hot' ? '🔥' : momentumCategory === 'cold' ? '❄️' : '●'}`;
      
      debugLog += `${player.friendly_name.padEnd(7)}| ${player.baseSkillRating.toFixed(2).padStart(10)} | ${owrStr.padStart(10)} | ${ogdStr.padStart(10)} | ${rwrStr.padStart(9)} | ${rgdStr.padStart(9)} | ${momentumStr.padStart(8)} | ${player.threeLayerRating.toFixed(2).padStart(12)} | ${changeStr}\n`;
    } else {
      debugLog += `${player.friendly_name.padEnd(7)}| ${player.baseSkillRating.toFixed(2).padStart(10)} | N/A        | N/A        | N/A       | N/A       | N/A      | ${player.threeLayerRating.toFixed(2).padStart(12)} | ${changeStr}\n`;
    }
  });
  
  // Add key insights
  debugLog += '\nKEY INSIGHTS:\n';
  debugLog += '============\n';
  
  // Performance Transformation Analysis
  debugLog += '\nPERFORMANCE-BASED TRANSFORMATIONS:\n';
  
  // Find players with significant drops (> 0.5 points with conservative weights)
  const majorDrops = transformationData.filter(p => p.baseSkillRating - p.threeLayerRating > 0.5);
  if (majorDrops.length > 0) {
    debugLog += 'Major Rating Drops:\n';
    majorDrops.forEach(p => {
      const drop = p.baseSkillRating - p.threeLayerRating;
      let reason = 'poor performance';
      
      if (p.total_games && p.total_games >= 10) {
        const overallWR = p.overall_win_rate ?? 50;
        const recentWR = p.win_rate ?? 50;
        const overallGD = p.overall_goal_differential ?? 0;
        const recentGD = p.goal_differential ?? 0;
        
        if ((overallWR < 0.40 || overallWR < 40) && (recentWR < 0.30 || recentWR < 30)) {
          reason = 'consistently poor performance (overall & recent)';
        } else if (recentWR < 0.30 || recentWR < 30) {
          reason = `terrible recent form (${(recentWR > 1 ? recentWR : recentWR * 100).toFixed(0)}% win rate)`;
        } else if (overallWR < 0.40 || overallWR < 40) {
          reason = `weak career record (${(overallWR > 1 ? overallWR : overallWR * 100).toFixed(0)}% win rate)`;
        } else if (overallGD < -10 && recentGD < -10) {
          reason = `persistent goal differential issues (${overallGD}/${recentGD})`;
        }
      }
      
      debugLog += `  - ${p.friendly_name}: ${p.baseSkillRating.toFixed(2)} → ${p.threeLayerRating.toFixed(2)} (-${drop.toFixed(2)}) - ${reason}\n`;
    });
  }
  
  // Find players with significant gains (> 0.3 points with conservative weights)
  const majorGains = transformationData.filter(p => p.threeLayerRating - p.baseSkillRating > 0.3);
  if (majorGains.length > 0) {
    debugLog += '\nMajor Rating Boosts:\n';
    majorGains.forEach(p => {
      const gain = p.threeLayerRating - p.baseSkillRating;
      let reason = 'strong performance';
      
      if (p.total_games && p.total_games >= 10) {
        const overallWR = p.overall_win_rate ?? 50;
        const recentWR = p.win_rate ?? 50;
        const overallGD = p.overall_goal_differential ?? 0;
        const recentGD = p.goal_differential ?? 0;
        
        if ((overallWR > 0.55 || overallWR > 55) && (recentWR > 0.60 || recentWR > 60)) {
          reason = `consistently excellent (${(overallWR > 1 ? overallWR : overallWR * 100).toFixed(0)}%/${(recentWR > 1 ? recentWR : recentWR * 100).toFixed(0)}% win rates)`;
        } else if (recentWR > 0.60 || recentWR > 60) {
          reason = `hot streak (${(recentWR > 1 ? recentWR : recentWR * 100).toFixed(0)}% recent win rate)`;
        } else if (overallWR > 0.55 || overallWR > 55) {
          reason = `proven winner (${(overallWR > 1 ? overallWR : overallWR * 100).toFixed(0)}% career win rate)`;
        } else if (overallGD > 20 || recentGD > 15) {
          reason = `dominant goal differential (+${Math.max(overallGD, recentGD)})`;
        }
      }
      
      debugLog += `  - ${p.friendly_name}: ${p.baseSkillRating.toFixed(2)} → ${p.threeLayerRating.toFixed(2)} (+${gain.toFixed(2)}) - ${reason}\n`;
    });
  }
  
  // Momentum Analysis
  debugLog += '\nMOMENTUM ANALYSIS:\n';
  const hotStreaks = transformationData.filter(p => p.momentumCategory === 'hot');
  const coldStreaks = transformationData.filter(p => p.momentumCategory === 'cold');
  const steadyPlayers = transformationData.filter(p => p.momentumCategory === 'steady' && p.total_games && p.total_games >= 10);
  
  if (hotStreaks.length > 0) {
    debugLog += 'Hot Streaks 🔥:\n';
    hotStreaks.forEach(p => {
      const recentWR = p.win_rate ?? 50;
      const overallWR = p.overall_win_rate ?? 50;
      const improvement = (recentWR > 1 ? recentWR : recentWR * 100) - (overallWR > 1 ? overallWR : overallWR * 100);
      debugLog += `  - ${p.friendly_name}: +${improvement.toFixed(0)}% win rate improvement (momentum: ${p.momentumScore?.toFixed(2)})\n`;
    });
  }
  
  if (coldStreaks.length > 0) {
    debugLog += 'Cold Streaks ❄️:\n';
    coldStreaks.forEach(p => {
      const recentWR = p.win_rate ?? 50;
      const overallWR = p.overall_win_rate ?? 50;
      const decline = (overallWR > 1 ? overallWR : overallWR * 100) - (recentWR > 1 ? recentWR : recentWR * 100);
      debugLog += `  - ${p.friendly_name}: -${decline.toFixed(0)}% win rate decline (momentum: ${p.momentumScore?.toFixed(2)})\n`;
    });
  }
  
  // Tier Movement Analysis
  debugLog += '\nTIER PLACEMENT ANALYSIS:\n';
  
  // Find players who moved tiers due to transformation
  const originalTiers = [...playersWithRatings].sort((a, b) => b.baseSkillRating - a.baseSkillRating);
  const finalTiers = [...playersWithRatings].sort((a, b) => b.threeLayerRating - a.threeLayerRating);
  
  const tierChanges: Array<{player: PlayerWithRating, originalPos: number, finalPos: number}> = [];
  originalTiers.forEach((player, originalIndex) => {
    const finalIndex = finalTiers.findIndex(p => p.friendly_name === player.friendly_name);
    if (Math.abs(finalIndex - originalIndex) >= 3) {
      tierChanges.push({ player, originalPos: originalIndex + 1, finalPos: finalIndex + 1 });
    }
  });
  
  if (tierChanges.length > 0) {
    debugLog += 'Significant Position Changes:\n';
    tierChanges.forEach(({ player, originalPos, finalPos }) => {
      const movement = originalPos - finalPos;
      const direction = movement > 0 ? '↑' : '↓';
      debugLog += `  - ${player.friendly_name}: ${originalPos} → ${finalPos} (${direction}${Math.abs(movement)} positions)\n`;
    });
  }
  
  // Elite vs Performance Mismatch
  debugLog += '\nSKILL VS PERFORMANCE MISMATCHES:\n';
  const eliteSkillPoorForm = transformationData.filter(p => 
    p.baseSkillRating > 7.5 && p.threeLayerRating - p.baseSkillRating < -0.3
  );
  if (eliteSkillPoorForm.length > 0) {
    eliteSkillPoorForm.forEach(p => {
      const perf = p.overall_win_rate ?? 50;
      const perfStr = (perf > 1 ? perf : perf * 100).toFixed(0);
      debugLog += `  - ${p.friendly_name}: Elite skills (${p.baseSkillRating.toFixed(2)}) but only ${perfStr}% win rate\n`;
    });
  }
  
  const lowSkillGoodForm = transformationData.filter(p => 
    p.baseSkillRating < 5.5 && p.threeLayerRating - p.baseSkillRating > 0.2
  );
  if (lowSkillGoodForm.length > 0) {
    lowSkillGoodForm.forEach(p => {
      const perf = p.overall_win_rate ?? 50;
      const perfStr = (perf > 1 ? perf : perf * 100).toFixed(0);
      debugLog += `  - ${p.friendly_name}: Modest skills (${p.baseSkillRating.toFixed(2)}) but ${perfStr}% win rate performance\n`;
    });
  }
  
  // Final Rankings Summary
  debugLog += '\nFINAL RANKINGS SUMMARY:\n';
  // Use the already sorted finalTiers array to get correct top/bottom players
  const topThree = finalTiers.slice(0, 3);
  const bottomThree = finalTiers.slice(-3);
  
  debugLog += 'Top 3 After Transformation:\n';
  topThree.forEach((p, i) => {
    const change = p.threeLayerRating - p.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    debugLog += `  ${i + 1}. ${p.friendly_name}: ${p.threeLayerRating.toFixed(2)} (base: ${p.baseSkillRating.toFixed(2)}, ${changeStr})\n`;
  });
  
  debugLog += 'Bottom 3 After Transformation:\n';
  bottomThree.forEach((p, i) => {
    const change = p.threeLayerRating - p.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    debugLog += `  ${players.length - 2 + i}. ${p.friendly_name}: ${p.threeLayerRating.toFixed(2)} (base: ${p.baseSkillRating.toFixed(2)}, ${changeStr})\n`;
  });
  
  // Algorithm Configuration
  debugLog += '\nALGORITHM CONFIGURATION:\n';
  debugLog += `  - Skill Weight: ${(WEIGHT_SKILL * 100).toFixed(0)}%\n`;
  debugLog += `  - Overall Performance: ${(WEIGHT_OVERALL * 100).toFixed(0)}%\n`;
  debugLog += `  - Recent Form: ${(WEIGHT_RECENT * 100).toFixed(0)}%\n`;
  debugLog += `  - Momentum Bonus/Penalty: ${(MOMENTUM_WEIGHT_HOT * 100).toFixed(0)}%/${(MOMENTUM_WEIGHT_COLD * 100).toFixed(0)}%\n`;
  
  debugLog += '\n';
  
  // Add condensed rating calculations summary
  debugLog += '\n\nRATING CALCULATIONS SUMMARY (Skill → Performance → Final)\n';
  debugLog += '=========================================================\n';
  
  // Sort by base skill for condensed display
  const sortedForCondensed = [...playersWithRatings].sort((a, b) => b.baseSkillRating - a.baseSkillRating);
  
  sortedForCondensed.forEach(player => {
    const change = player.threeLayerRating - player.baseSkillRating;
    const changeStr = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    if (player.total_games && player.total_games >= MIN_GAMES_FOR_STATS) {
      const overallWR = player.overall_win_rate ?? 50;
      const overallGD = player.overall_goal_differential ?? 0;
      const recentWR = player.win_rate ?? 50;
      
      // Performance description
      let perfDesc = '';
      const wrDisplay = (overallWR > 1 ? overallWR : overallWR * 100).toFixed(0);
      const gdDisplay = overallGD >= 0 ? `+${overallGD}` : `${overallGD}`;
      
      if ((overallWR > 0.55 || overallWR > 55) && overallGD > 10) {
        perfDesc = `Strong (${wrDisplay}%/${gdDisplay})`;
      } else if ((overallWR > 0.50 || overallWR > 50) || overallGD > 0) {
        perfDesc = `Good (${wrDisplay}%/${gdDisplay})`;
      } else if ((overallWR > 0.45 || overallWR > 45) && overallGD >= -5) {
        perfDesc = `Average (${wrDisplay}%/${gdDisplay})`;
      } else {
        perfDesc = `Poor (${wrDisplay}%/${gdDisplay})`;
      }
      
      // Momentum indicator
      let momentum = '';
      if (player.momentumCategory === 'hot') momentum = ' 🔥';
      else if (player.momentumCategory === 'cold') momentum = ' ❄️';
      
      debugLog += `${player.friendly_name.padEnd(12)}: ${player.baseSkillRating.toFixed(2)} → ${perfDesc.padEnd(22)}${momentum} → ${player.threeLayerRating.toFixed(2)} (${changeStr})\n`;
    } else {
      debugLog += `${player.friendly_name.padEnd(12)}: ${player.baseSkillRating.toFixed(2)} → New player (<10 games)     → ${player.threeLayerRating.toFixed(2)} (${changeStr})\n`;
    }
  });
  
  debugLog += '\n';
  
  // Step 2: Sort players by three-layer rating (descending)
  playersWithRatings.sort((a, b) => b.threeLayerRating - a.threeLayerRating);
  
  debugLog += '\nSTEP 2: SORTED BY THREE-LAYER RATING\n';
  debugLog += '=====================================\n';
  playersWithRatings.forEach((player, index) => {
    debugLog += `${index + 1}. ${player.friendly_name}: ${player.threeLayerRating.toFixed(2)}\n`;
  });
  
  // Step 3: Create tiers
  const tierSizes = calculateTierSizes(players.length);
  executiveSummaryData.tierCount = tierSizes.length;
  executiveSummaryData.tierSizes = tierSizes.join('-');
  
  debugLog += `\nSTEP 3: CREATING TIERS\n`;
  debugLog += '====================\n';
  debugLog += `Total Players: ${players.length}\n`;
  debugLog += `Tier Sizes: ${tierSizes.join(', ')}\n\n`;
  
  const tiers: TierInfo[] = [];
  let playerIndex = 0;
  
  tierSizes.forEach((size, tierIndex) => {
    const tierPlayers = playersWithRatings.slice(playerIndex, playerIndex + size);
    
    // Assign tier number to each player
    tierPlayers.forEach(p => p.tier = tierIndex + 1);
    
    const skillRange = {
      min: Math.min(...tierPlayers.map(p => p.threeLayerRating)),
      max: Math.max(...tierPlayers.map(p => p.threeLayerRating))
    };
    
    tiers.push({
      tierNumber: tierIndex + 1,
      players: tierPlayers,
      skillRange
    });
    
    debugLog += `Tier ${tierIndex + 1} (${size} players, range: ${skillRange.min.toFixed(2)}-${skillRange.max.toFixed(2)}):\n`;
    tierPlayers.forEach(player => {
      debugLog += `  - ${player.friendly_name} (${player.threeLayerRating.toFixed(2)})\n`;
    });
    debugLog += '\n';
    
    playerIndex += size;
  });
  
  // Step 4: Apply snake draft
  const debugLogRef = { value: debugLog };
  const { blueTeam: initialBlueTeam, orangeTeam: initialOrangeTeam } = applySnakeDraft(tiers, debugLogRef);
  debugLog = debugLogRef.value;
  
  // Add visual snake draft representation
  debugLog += '\nSNAKE DRAFT VISUALIZATION\n';
  debugLog += '========================\n';
  
  let pickNumber = 0;
  // Determine which team picked first based on the actual draft results
  let bluePicksFirstInVisualization = initialBlueTeam.some(p => p.tier === 1 && tiers[0]?.players[0]?.player_id === p.player_id);
  tiers.forEach((tier, tierIndex) => {
    const players = tier.players;
    
    // Create the visual representation for this tier
    const picks: string[] = [];
    for (let i = 0; i < players.length; i++) {
      pickNumber++;
      const player = players[i];
      const team = bluePicksFirstInVisualization ? (i % 2 === 0 ? 'B' : 'O') : (i % 2 === 0 ? 'O' : 'B');
      picks.push(`${player.friendly_name}(${team})`);
    }
    
    // Format the round with proper arrows and flow
    if (tierIndex === 0) {
      // First round
      debugLog += `Tier ${tierIndex + 1}: → ${picks.join(' → ')}`;
    } else if (tierIndex % 2 === 0) {
      // Even tiers (after first) - left to right with turn indicator
      debugLog += `        ↓\n`;
      debugLog += `Tier ${tierIndex + 1}: → ${picks.join(' → ')}`;
    } else {
      // Odd tiers - right to left with turn indicator
      debugLog += ` ↘\n`;
      debugLog += `Tier ${tierIndex + 1}: ${picks.reverse().join(' ← ')} ←`;
    }
    
    // Always alternate which team picks first for next tier (true snake draft)
    bluePicksFirstInVisualization = !bluePicksFirstInVisualization;
  });
  debugLog += '\n\n';
  
  // Step 5: Calculate initial balance score
  const initialScore = calculateTierBalanceScore(initialBlueTeam, initialOrangeTeam);
  
  debugLog += 'STEP 5: INITIAL BALANCE SCORE\n';
  debugLog += '============================\n';
  debugLog += `Balance Score: ${initialScore.toFixed(3)}\n`;
  debugLog += `Blue Team Averages:\n`;
  debugLog += `  Attack: ${(initialBlueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialBlueTeam.length).toFixed(2)}\n`;
  debugLog += `  Defense: ${(initialBlueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialBlueTeam.length).toFixed(2)}\n`;
  debugLog += `  Game IQ: ${(initialBlueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialBlueTeam.length).toFixed(2)}\n`;
  debugLog += `Orange Team Averages:\n`;
  debugLog += `  Attack: ${(initialOrangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialOrangeTeam.length).toFixed(2)}\n`;
  debugLog += `  Defense: ${(initialOrangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialOrangeTeam.length).toFixed(2)}\n`;
  debugLog += `  Game IQ: ${(initialOrangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialOrangeTeam.length).toFixed(2)}\n\n`;
  
  // Step 6: Optimize if needed
  const { blueTeam, orangeTeam, finalScore, wasOptimized, swapCount, swapDetails } = optimizeTeams(
    initialBlueTeam,
    initialOrangeTeam,
    debugLogRef
  );
  debugLog = debugLogRef.value;
  executiveSummaryData.optimizationSwaps = swapCount;
  executiveSummaryData.finalBalance = finalScore;
  
  // Step 7: Calculate confidence
  const confidence = calculateConfidence(playersWithRatings);
  
  debugLog += 'FINAL TEAMS\n';
  debugLog += '===========\n';
  debugLog += `\nBlue Team (${blueTeam.length} players):\n`;
  blueTeam.forEach(player => {
    debugLog += `  ${player.friendly_name} (Rating: ${player.threeLayerRating.toFixed(2)}, Tier ${player.tier})\n`;
  });
  
  debugLog += `\nOrange Team (${orangeTeam.length} players):\n`;
  orangeTeam.forEach(player => {
    debugLog += `  ${player.friendly_name} (Rating: ${player.threeLayerRating.toFixed(2)}, Tier ${player.tier})\n`;
  });
  
  debugLog += `\nConfidence: ${confidence.level} (${confidence.unknownCount}/${confidence.totalCount} players have <10 games)\n`;
  
  // Calculate team averages for all metrics (needed for multiple sections)
  const blueAvgRating = blueTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueTeam.length;
  const orangeAvgRating = orangeTeam.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeTeam.length;
  const blueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
  const orangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;
  const blueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
  const orangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;
  const blueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
  const orangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;
  
  // Add Team Balance Breakdown
  debugLog += '\nTEAM BALANCE BREAKDOWN\n';
  debugLog += '======================\n';
  
  // Calculate team statistics including performance metrics
  const blueWinRate = blueTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.win_rate ?? 50) / arr.length, 0);
  const orangeWinRate = orangeTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.win_rate ?? 50) / arr.length, 0);
    
  const blueGoalDiff = blueTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.goal_differential ?? 0) / arr.length, 0);
  const orangeGoalDiff = orangeTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS)
    .reduce((sum, p, _, arr) => sum + (p.goal_differential ?? 0) / arr.length, 0);
  
  // Format the breakdown table
  debugLog += '                Blue    Orange   Difference\n';
  debugLog += `Attack:         ${blueAttack.toFixed(2)}    ${orangeAttack.toFixed(2)}     ${Math.abs(blueAttack - orangeAttack).toFixed(2)}\n`;
  debugLog += `Defense:        ${blueDefense.toFixed(2)}    ${orangeDefense.toFixed(2)}     ${Math.abs(blueDefense - orangeDefense).toFixed(2)}\n`;
  debugLog += `Game IQ:        ${blueGameIq.toFixed(2)}    ${orangeGameIq.toFixed(2)}     ${Math.abs(blueGameIq - orangeGameIq).toFixed(2)}\n`;
  
  // Add performance metrics if we have enough rated players
  const blueRatedCount = blueTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS).length;
  const orangeRatedCount = orangeTeam.filter(p => p.total_games && p.total_games >= MIN_GAMES_FOR_STATS).length;
  
  if (blueRatedCount > 0 && orangeRatedCount > 0) {
    const blueWRDisplay = blueWinRate > 1 ? blueWinRate.toFixed(1) : (blueWinRate * 100).toFixed(1);
    const orangeWRDisplay = orangeWinRate > 1 ? orangeWinRate.toFixed(1) : (orangeWinRate * 100).toFixed(1);
    const wrDiff = Math.abs((blueWinRate > 1 ? blueWinRate : blueWinRate * 100) - (orangeWinRate > 1 ? orangeWinRate : orangeWinRate * 100));
    
    debugLog += `Win Rate:       ${blueWRDisplay}%   ${orangeWRDisplay}%    ${wrDiff.toFixed(1)}%\n`;
    debugLog += `Goal Diff:      ${blueGoalDiff >= 0 ? '+' : ''}${blueGoalDiff.toFixed(0)}     ${orangeGoalDiff >= 0 ? '+' : ''}${orangeGoalDiff.toFixed(0)}      ${Math.abs(blueGoalDiff - orangeGoalDiff).toFixed(0)}\n`;
  }
  
  // Balance quality description
  let balanceDescription = '';
  if (finalScore <= 0.2) {
    balanceDescription = 'Excellent balance across all metrics';
  } else if (finalScore <= 0.5) {
    balanceDescription = 'Good balance with minor differences';
  } else if (finalScore <= 1.0) {
    balanceDescription = 'Fair balance with noticeable differences';
  } else {
    balanceDescription = 'Poor balance - consider manual adjustments';
  }
  
  debugLog += `\nOverall Balance Score: ${finalScore.toFixed(3)} (${balanceDescription})\n`;
  
  // Count which team has advantages for later use
  let blueAdvantages = 0;
  let orangeAdvantages = 0;
  if (blueAvgRating > orangeAvgRating) blueAdvantages++;
  else if (orangeAvgRating > blueAvgRating) orangeAdvantages++;
  if (blueAttack > orangeAttack) blueAdvantages++;
  else if (orangeAttack > blueAttack) orangeAdvantages++;
  if (blueDefense > orangeDefense) blueAdvantages++;
  else if (orangeDefense > blueDefense) orangeAdvantages++;
  if (blueGameIq > orangeGameIq) blueAdvantages++;
  else if (orangeGameIq > blueGameIq) orangeAdvantages++;
  
  // Add Team Strength Comparison
  debugLog += '\nTEAM STRENGTH COMPARISON\n';
  debugLog += '=======================\n';
  debugLog += '             Blue    Orange  Winner\n';
  debugLog += `Avg Rating:  ${blueAvgRating.toFixed(2)}    ${orangeAvgRating.toFixed(2)}    ${blueAvgRating > orangeAvgRating ? 'Blue ↑' : orangeAvgRating > blueAvgRating ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `Attack:      ${blueAttack.toFixed(2)}    ${orangeAttack.toFixed(2)}    ${blueAttack > orangeAttack ? 'Blue ↑' : orangeAttack > blueAttack ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `Defense:     ${blueDefense.toFixed(2)}    ${orangeDefense.toFixed(2)}    ${blueDefense > orangeDefense ? 'Blue ↑' : orangeDefense > blueDefense ? 'Orange ↑' : 'Tie'}\n`;
  debugLog += `Game IQ:     ${blueGameIq.toFixed(2)}    ${orangeGameIq.toFixed(2)}    ${blueGameIq > orangeGameIq ? 'Blue ↑' : orangeGameIq > blueGameIq ? 'Orange ↑' : 'Tie'}\n`;
  
  const blueExperiencePercent = (blueRatedCount / blueTeam.length * 100).toFixed(0);
  const orangeExperiencePercent = (orangeRatedCount / orangeTeam.length * 100).toFixed(0);
  debugLog += `Experience:  ${blueExperiencePercent}%     ${orangeExperiencePercent}%      ${blueRatedCount > orangeRatedCount ? 'Blue ↑' : orangeRatedCount > blueRatedCount ? 'Orange ↑' : 'Tie'}\n`;
  
  // Calculate overall advantage
  let teamAdvantageDescription = '';
  if (blueAdvantages > orangeAdvantages) {
    teamAdvantageDescription = `Slight advantage to Blue (${blueAdvantages}-${orangeAdvantages} in metrics)`;
  } else if (orangeAdvantages > blueAdvantages) {
    teamAdvantageDescription = `Slight advantage to Orange (${orangeAdvantages}-${blueAdvantages} in metrics)`;
  } else {
    teamAdvantageDescription = 'Teams are evenly matched';
  }
  
  debugLog += `\nOverall: ${teamAdvantageDescription}\n`;
  
  // Add Optimization Impact Summary
  if (wasOptimized && swapCount > 0) {
    debugLog += '\nOPTIMIZATION IMPACT\n';
    debugLog += '==================\n';
    debugLog += `Swaps Made: ${swapCount}\n`;
    debugLog += `Balance Improvement: ${(initialScore - finalScore).toFixed(3)} (${((1 - finalScore/initialScore) * 100).toFixed(0)}% better)\n`;
    debugLog += '\nSwap Details:\n';
    
    swapDetails.forEach((swap, index) => {
      debugLog += `${index + 1}. ${swap.bluePlayer} (Blue) ↔ ${swap.orangePlayer} (Orange)\n`;
      debugLog += `   Tier: ${swap.tier}, Improvement: ${swap.improvement.toFixed(3)}\n`;
    });
    
    // Identify what was improved
    const skillsImproved: string[] = [];
    const newBlueAttack = blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / blueTeam.length;
    const newOrangeAttack = orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / orangeTeam.length;
    const newBlueDefense = blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / blueTeam.length;
    const newOrangeDefense = orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / orangeTeam.length;
    const newBlueGameIq = blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / blueTeam.length;
    const newOrangeGameIq = orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / orangeTeam.length;
    
    const initialBlueAttack = initialBlueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialBlueTeam.length;
    const initialOrangeAttack = initialOrangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 5), 0) / initialOrangeTeam.length;
    const initialAttackDiff = Math.abs(initialBlueAttack - initialOrangeAttack);
    const newAttackDiff = Math.abs(newBlueAttack - newOrangeAttack);
    if (newAttackDiff < initialAttackDiff) skillsImproved.push('Attack');
    
    const initialBlueDefense = initialBlueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialBlueTeam.length;
    const initialOrangeDefense = initialOrangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 5), 0) / initialOrangeTeam.length;
    const initialDefenseDiff = Math.abs(initialBlueDefense - initialOrangeDefense);
    const newDefenseDiff = Math.abs(newBlueDefense - newOrangeDefense);
    if (newDefenseDiff < initialDefenseDiff) skillsImproved.push('Defense');
    
    const initialBlueGameIq = initialBlueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialBlueTeam.length;
    const initialOrangeGameIq = initialOrangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 5), 0) / initialOrangeTeam.length;
    const initialGameIqDiff = Math.abs(initialBlueGameIq - initialOrangeGameIq);
    const newGameIqDiff = Math.abs(newBlueGameIq - newOrangeGameIq);
    if (newGameIqDiff < initialGameIqDiff) skillsImproved.push('Game IQ');
    
    if (skillsImproved.length > 0) {
      debugLog += `\nReason: Better distribution of ${skillsImproved.join(', ')} skills\n`;
    }
    
    // Add Key Decisions section
    debugLog += '\nKEY DECISIONS\n';
    debugLog += '=============\n';
    
    swapDetails.forEach((swap, index) => {
      // Find the swapped players
      const bluePlayer = blueTeam.find(p => p.friendly_name === swap.orangePlayer);
      const orangePlayer = orangeTeam.find(p => p.friendly_name === swap.bluePlayer);
      
      if (bluePlayer && orangePlayer) {
        debugLog += `Swap ${index + 1}: ${swap.bluePlayer} ↔ ${swap.orangePlayer}\n`;
        
        // Analyze why this swap improved balance
        const reasons: string[] = [];
        
        // Compare attack ratings
        if (bluePlayer.attack_rating && orangePlayer.attack_rating) {
          const attackDiff = Math.abs((bluePlayer.attack_rating ?? 5) - (orangePlayer.attack_rating ?? 5));
          if (attackDiff > 1) {
            reasons.push(`Attack balance (${orangePlayer.friendly_name}: ${orangePlayer.attack_rating?.toFixed(1)} vs ${bluePlayer.friendly_name}: ${bluePlayer.attack_rating?.toFixed(1)})`);
          }
        }
        
        // Compare defense ratings
        if (bluePlayer.defense_rating && orangePlayer.defense_rating) {
          const defenseDiff = Math.abs((bluePlayer.defense_rating ?? 5) - (orangePlayer.defense_rating ?? 5));
          if (defenseDiff > 1) {
            reasons.push(`Defense balance (${orangePlayer.friendly_name}: ${orangePlayer.defense_rating?.toFixed(1)} vs ${bluePlayer.friendly_name}: ${bluePlayer.defense_rating?.toFixed(1)})`);
          }
        }
        
        // Compare Game IQ ratings
        if (bluePlayer.game_iq_rating && orangePlayer.game_iq_rating) {
          const gameIqDiff = Math.abs((bluePlayer.game_iq_rating ?? 5) - (orangePlayer.game_iq_rating ?? 5));
          if (gameIqDiff > 1) {
            reasons.push(`Game IQ balance (${orangePlayer.friendly_name}: ${orangePlayer.game_iq_rating?.toFixed(1)} vs ${bluePlayer.friendly_name}: ${bluePlayer.game_iq_rating?.toFixed(1)})`);
          }
        }
        
        // Compare overall ratings
        const ratingDiff = Math.abs(bluePlayer.threeLayerRating - orangePlayer.threeLayerRating);
        if (ratingDiff < 0.5) {
          reasons.push('Similar overall ratings maintain tier integrity');
        }
        
        if (reasons.length > 0) {
          debugLog += `  Why: ${reasons.join('; ')}\n`;
        }
        
        debugLog += `  Impact: Balance improved by ${swap.improvement.toFixed(3)}\n`;
      }
    });
  } else if (!wasOptimized) {
    debugLog += '\nOPTIMIZATION IMPACT\n';
    debugLog += '==================\n';
    debugLog += 'No optimization needed - initial draft was already well-balanced\n';
  }
  
  // Add Draft Value Analysis
  debugLog += '\nDRAFT VALUE ANALYSIS\n';
  debugLog += '===================\n';
  
  // Analyze draft values
  const draftValueInsights: string[] = [];
  
  // Find players who might have been picked too early or too late
  tiers.forEach((tier, tierIndex) => {
    const tierAvgRating = tier.players.reduce((sum, p) => sum + p.threeLayerRating, 0) / tier.players.length;
    
    tier.players.forEach(player => {
      const ratingDiff = player.threeLayerRating - tierAvgRating;
      
      // Players significantly above tier average (potential steals)
      if (ratingDiff > 0.3) {
        const position = tier.players.indexOf(player) + 1;
        draftValueInsights.push(`${player.friendly_name} (Tier ${tierIndex + 1}, Pick ${position}) - Rating ${player.threeLayerRating.toFixed(2)} vs Tier avg ${tierAvgRating.toFixed(2)} (+${ratingDiff.toFixed(2)})`);
      }
    });
  });
  
  if (draftValueInsights.length > 0) {
    debugLog += 'Best Value Picks:\n';
    draftValueInsights.forEach(insight => {
      debugLog += `- ${insight}\n`;
    });
  }
  
  // Find players without performance data in high tiers
  const highTierUnknowns: string[] = [];
  tiers.slice(0, 2).forEach((tier, tierIndex) => {
    tier.players.forEach(player => {
      if (!player.total_games || player.total_games < MIN_GAMES_FOR_STATS) {
        highTierUnknowns.push(`${player.friendly_name} (Tier ${tierIndex + 1}) - No performance data to justify tier`);
      }
    });
  });
  
  if (highTierUnknowns.length > 0) {
    debugLog += '\nPotential Reaches:\n';
    highTierUnknowns.forEach(reach => {
      debugLog += `- ${reach}\n`;
    });
  }
  
  // Analyze tier movement due to performance adjustment
  const bigMovers = playersWithRatings.filter(p => Math.abs(p.threeLayerRating - p.baseSkillRating) > 0.5);
  if (bigMovers.length > 0) {
    debugLog += '\nSignificant Performance Adjustments:\n';
    bigMovers.sort((a, b) => Math.abs(b.threeLayerRating - b.baseSkillRating) - Math.abs(a.threeLayerRating - a.baseSkillRating))
      .slice(0, 3)
      .forEach(player => {
        const change = player.threeLayerRating - player.baseSkillRating;
        const direction = change > 0 ? 'boosted' : 'dropped';
        debugLog += `- ${player.friendly_name}: ${direction} ${Math.abs(change).toFixed(2)} points due to ${direction === 'boosted' ? 'strong' : 'poor'} performance\n`;
      });
  }
  
  // Add Team Composition by Tier
  debugLog += '\nTEAM COMPOSITION BY TIER\n';
  debugLog += '========================\n';
  debugLog += '       Tier 1  Tier 2  Tier 3  Tier 4  Tier 5\n';
  
  // Count players by tier for each team
  const blueTierCounts = new Array(5).fill(0);
  const orangeTierCounts = new Array(5).fill(0);
  
  blueTeam.forEach(player => {
    if (player.tier && player.tier >= 1 && player.tier <= 5) {
      blueTierCounts[player.tier - 1]++;
    }
  });
  
  orangeTeam.forEach(player => {
    if (player.tier && player.tier >= 1 && player.tier <= 5) {
      orangeTierCounts[player.tier - 1]++;
    }
  });
  
  // Display the counts
  debugLog += 'Blue:  ';
  blueTierCounts.forEach(count => {
    debugLog += `   ${count}    `;
  });
  debugLog += '\n';
  
  debugLog += 'Orange:';
  orangeTierCounts.forEach(count => {
    debugLog += `   ${count}    `;
  });
  debugLog += '\n';
  
  // Add visual representation
  debugLog += '\nVisual Distribution:\n';
  for (let i = 0; i < 5; i++) {
    if (tierSizes[i]) {
      debugLog += `Tier ${i + 1}: `;
      debugLog += '🔵'.repeat(blueTierCounts[i]);
      debugLog += '🟠'.repeat(orangeTierCounts[i]);
      debugLog += ` (${blueTierCounts[i]}B/${orangeTierCounts[i]}O)\n`;
    }
  }
  
  // Calculate balance quality description
  if (finalScore <= 0.2) {
    executiveSummaryData.balanceQuality = 'Excellent';
  } else if (finalScore <= 0.5) {
    executiveSummaryData.balanceQuality = 'Good';
  } else if (finalScore <= 1.0) {
    executiveSummaryData.balanceQuality = 'Fair';
  } else {
    executiveSummaryData.balanceQuality = 'Poor';
  }
  
  if (blueAdvantages > orangeAdvantages) {
    executiveSummaryData.teamStrengthAdvantage = `Blue (${blueAdvantages}-${orangeAdvantages} in metrics)`;
  } else if (orangeAdvantages > blueAdvantages) {
    executiveSummaryData.teamStrengthAdvantage = `Orange (${orangeAdvantages}-${blueAdvantages} in metrics)`;
  } else {
    executiveSummaryData.teamStrengthAdvantage = 'Even';
  }
  
  // Create the executive summary
  const executiveSummary = `EXECUTIVE SUMMARY
================
Algorithm: Tier-Based Snake Draft
Players: ${executiveSummaryData.totalPlayers} (${executiveSummaryData.ratedPlayers} rated, ${executiveSummaryData.newPlayers} new)
Tiers: ${executiveSummaryData.tierCount} (sizes: ${executiveSummaryData.tierSizes})
Final Balance: ${executiveSummaryData.finalBalance.toFixed(3)} (${executiveSummaryData.balanceQuality} - all skills within ${executiveSummaryData.finalBalance.toFixed(2)})
Optimization: ${executiveSummaryData.optimizationSwaps} swap${executiveSummaryData.optimizationSwaps !== 1 ? 's' : ''} made${executiveSummaryData.optimizationSwaps > 0 ? ` (${wasOptimized ? 'improved balance' : 'no improvement'})` : ''}
Result: Well-balanced teams with fair tier distribution
Advantage: ${executiveSummaryData.teamStrengthAdvantage}`;
  
  // Replace the placeholder with the actual summary
  debugLog = debugLog.replace(executiveSummaryPlaceholder, executiveSummary);
  
  return {
    blueTeam,
    orangeTeam,
    tiers,
    initialScore,
    optimizedScore: finalScore,
    wasOptimized,
    confidenceLevel: confidence.level,
    confidenceMessage: confidence.message,
    debugLog
  };
}