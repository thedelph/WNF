import {
  TeamAssignment,
  PositionType,
  PositionWeights,
  PlayerPositionAssignment,
  FormationTemplate,
  FormationSuggestion,
  FormationResult,
  FormationDebugLog
} from '../../components/admin/team-balancing/types';

/**
 * Position weight configurations for each position type
 * These weights determine how important each attribute is for a given position
 */
const POSITION_WEIGHTS: Record<PositionType, PositionWeights> = {
  DEF: { defense: 0.75, gameIq: 0.15, attack: 0.10 },  // Increased defense importance
  W: { defense: 0.30, gameIq: 0.30, attack: 0.40 },    // Balanced for wingers
  CDM: { defense: 0.50, gameIq: 0.30, attack: 0.20 },
  CM: { defense: 0.33, gameIq: 0.34, attack: 0.33 },
  CAM: { defense: 0.20, gameIq: 0.35, attack: 0.45 },
  ST: { defense: 0.10, gameIq: 0.15, attack: 0.75 }    // Increased attack importance
};

// Support index for positions - currently unused but kept for future reference
// const POSITION_SUPPORT: Record<PositionType, number> = {
//   DEF: 3,  // Lots of nearby teammates
//   W: 2,    // Some isolation but manageable
//   CDM: 1,  // Critical position, less support
//   CM: 3,   // Surrounded by teammates
//   CAM: 2,  // Some support
//   ST: 1    // Most isolated position
// };

/**
 * Position criticality - how important it is to have strong players here
 */
const POSITION_CRITICALITY: Record<PositionType, number> = {
  ST: 3,   // Most critical - needs to score goals
  CDM: 3,  // Most critical - defensive anchor
  CAM: 2,  // Important - creates chances
  DEF: 2,  // Important but has support from others
  CM: 1,   // Flexible, can accommodate various skill levels
  W: 0     // Least critical - good for weaker players
};

/**
 * Relative position requirements - what percentile a player should be in
 * to be considered suitable for a position
 * These adapt to the actual player pool
 */
const RELATIVE_REQUIREMENTS: Partial<Record<PositionType, { 
  attack?: number;   // Required percentile for attack (0-100)
  defense?: number;  // Required percentile for defense (0-100)
  gameIq?: number;   // Required percentile for game IQ (0-100)
}>> = {
  ST: { attack: 50 },        // Striker should be in top 50% for attack (stricter)
  DEF: { defense: 50 },       // Defender should be in top 50% for defense (stricter)
  CDM: { defense: 40, gameIq: 30 }, // CDM needs defense AND game IQ
  CAM: { attack: 40, gameIq: 40 }, // CAM needs decent attack and IQ
  // W and CM have no strict requirements - most flexible
};

/**
 * Available formation templates based on team size
 * Note: These are for OUTFIELD players (total team size - 1 for rotating keeper)
 */
const FORMATION_TEMPLATES: FormationTemplate[] = [
  // 7 outfield (8 total with keeper)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 1 },  // 3-3-1 defensive
    minPlayers: 7,
    maxPlayers: 7
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 2, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 1 },  // 2-2W-2-1 balanced
    minPlayers: 7,
    maxPlayers: 7
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 0, CM: 2, CAM: 1, ST: 1 },  // 3-2-1-1 attacking
    minPlayers: 7,
    maxPlayers: 7
  },
  
  // 8 outfield (9 total with keeper)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 1 },  // 4-3-1 defensive
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 1 },  // 3-4-1 balanced
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 1 },  // 3-2W-2-1 with width
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2 },  // 3-3-2 attacking (only if strong)
    minPlayers: 8,
    maxPlayers: 8
  },
  
  // 9 outfield (10 total with keeper)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 1 },  // 4-4-1 defensive
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 5, W: 0, CDM: 0, CM: 3, CAM: 0, ST: 1 },  // 5-3-1 ultra defensive
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 1, CM: 4, CAM: 0, ST: 1 },  // 3-5-1 midfield heavy
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 1 },  // 3-2W-3-1 balanced width
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2 },  // 4-3-2 (only if quality allows)
    minPlayers: 9,
    maxPlayers: 9
  },
  
  // 10 outfield (11 total with keeper)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 4, CAM: 0, ST: 1 },  // 4-5-1 defensive
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 1 },  // 4-2W-3-1 balanced
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 2 },  // 4-4-2 classic
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 2 },  // 3-2W-3-2 attacking
    minPlayers: 10,
    maxPlayers: 10
  },
  
  // 11 outfield (12 total with keeper)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 2, CM: 3, CAM: 0, ST: 2 },  // 4-5-2 balanced
    minPlayers: 11,
    maxPlayers: 11
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 2, CDM: 1, CM: 2, CAM: 1, ST: 1 },  // 4-2W-3-1-1
    minPlayers: 11,
    maxPlayers: 11
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 5, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 2 },  // 5-4-2 defensive
    minPlayers: 11,
    maxPlayers: 11
  }
];

/**
 * Calculate a player's score for a specific position
 */
function calculatePositionScore(
  player: TeamAssignment,
  position: PositionType
): number {
  const weights = POSITION_WEIGHTS[position];
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;
  
  return (
    attack * weights.attack +
    defense * weights.defense +
    gameIq * weights.gameIq
  );
}

/**
 * Player classification types
 */
enum PlayerType {
  ELITE = 'ELITE',                       // > 1.5 std dev above mean OR top 10%
  SPECIALIST_ATK = 'SPECIALIST_ATK',     // Strong attack focus
  SPECIALIST_DEF = 'SPECIALIST_DEF',     // Strong defense focus
  PLAYMAKER = 'PLAYMAKER',               // High game IQ focus
  BALANCED_STRONG = 'BALANCED_STRONG',   // Top 25% with balanced stats
  BALANCED_AVERAGE = 'BALANCED_AVERAGE', // Middle 50% with balanced stats
  BELOW_AVERAGE = 'BELOW_AVERAGE',       // Bottom 50% to bottom 25%
  WEAK_PLAYER = 'WEAK_PLAYER',           // Bottom 25% to -1.5 std dev
  VERY_WEAK_PLAYER = 'VERY_WEAK_PLAYER', // -1.5 to -2.5 std dev
  UNPLAYABLE = 'UNPLAYABLE'              // More than -2.5 std dev below mean
}

/**
 * Calculate statistical distribution of player ratings
 */
interface StatDistribution {
  mean: number;
  median: number;
  stdDev: number;
  percentiles: {
    p10: number;  // Bottom 10%
    p25: number;  // Bottom 25%
    p50: number;  // Median
    p75: number;  // Top 25%
    p90: number;  // Top 10%
  };
}

function calculateDistribution(values: number[]): StatDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Calculate mean
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  
  // Calculate median
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  // Calculate standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Calculate percentiles
  const getPercentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  
  return {
    mean,
    median,
    stdDev,
    percentiles: {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90)
    }
  };
}

/**
 * Calculate dynamic thresholds based on player pool distribution
 */
interface DynamicThresholds {
  attackDist: StatDistribution;
  defenseDist: StatDistribution;
  gameIqDist: StatDistribution;
  overallDist: StatDistribution;
  allPlayers: TeamAssignment[]; // Keep reference to all players for ranking
}

function calculateDynamicThresholds(players: TeamAssignment[]): DynamicThresholds {
  const attacks = players.map(p => p.attack_rating ?? 5);
  const defenses = players.map(p => p.defense_rating ?? 5);
  const gameIqs = players.map(p => p.game_iq_rating ?? 5);
  const overalls = players.map(p => {
    const a = p.attack_rating ?? 5;
    const d = p.defense_rating ?? 5;
    const iq = p.game_iq_rating ?? 5;
    return (a + d + iq) / 3;
  });
  
  return {
    attackDist: calculateDistribution(attacks),
    defenseDist: calculateDistribution(defenses),
    gameIqDist: calculateDistribution(gameIqs),
    overallDist: calculateDistribution(overalls),
    allPlayers: players
  };
}

/**
 * Classify a player based on their rating pattern using dynamic thresholds
 */
function classifyPlayer(
  player: TeamAssignment, 
  thresholds: DynamicThresholds
): { type: PlayerType; reason: string } {
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;
  const overall = (attack + defense + gameIq) / 3;
  
  // Calculate z-scores for dynamic classification
  const overallZ = (overall - thresholds.overallDist.mean) / (thresholds.overallDist.stdDev || 1);
  const attackZ = (attack - thresholds.attackDist.mean) / (thresholds.attackDist.stdDev || 1);
  const defenseZ = (defense - thresholds.defenseDist.mean) / (thresholds.defenseDist.stdDev || 1);
  const iqZ = (gameIq - thresholds.gameIqDist.mean) / (thresholds.gameIqDist.stdDev || 1);
  
  // PRIORITY CHECK: Extreme specialists regardless of overall rating
  // This catches players like Alex E (2.9 ATK, 7.3 DEF) and Jimmy (8.0 ATK, 4.0 DEF)
  const attackDefenseDiff = attack - defense;
  const defenseAttackDiff = defense - attack;
  
  // Check for extreme defensive specialist (like Alex E)
  if (defense >= thresholds.defenseDist.percentiles.p75 && attack <= thresholds.attackDist.percentiles.p25) {
    return {
      type: PlayerType.SPECIALIST_DEF,
      reason: `Extreme defensive specialist (DEF: ${defense.toFixed(1)}, ATK: ${attack.toFixed(1)})`
    };
  }
  
  // Check for extreme attacking specialist (like Jimmy)  
  if (attack >= thresholds.attackDist.percentiles.p75 && defense <= thresholds.defenseDist.percentiles.p25) {
    return {
      type: PlayerType.SPECIALIST_ATK,
      reason: `Extreme attacking specialist (ATK: ${attack.toFixed(1)}, DEF: ${defense.toFixed(1)})`
    };
  }
  
  // Check for extreme stat imbalance (3+ point difference)
  if (defenseAttackDiff >= 3 && defense >= thresholds.defenseDist.percentiles.p50) {
    return {
      type: PlayerType.SPECIALIST_DEF,
      reason: `Strong defensive imbalance (${defenseAttackDiff.toFixed(1)} point gap)`
    };
  }
  
  if (attackDefenseDiff >= 3 && attack >= thresholds.attackDist.percentiles.p50) {
    return {
      type: PlayerType.SPECIALIST_ATK,
      reason: `Strong attacking imbalance (${attackDefenseDiff.toFixed(1)} point gap)`
    };
  }
  
  // Check for UNPLAYABLE (more than 2.5 std dev below mean)
  if (overallZ < -2.5) {
    return {
      type: PlayerType.UNPLAYABLE,
      reason: `Extreme outlier: ${overallZ.toFixed(2)} std dev below mean (${overall.toFixed(1)})`
    };
  }
  
  // Check for VERY_WEAK_PLAYER (-1.5 to -2.5 std dev)
  if (overallZ < -1.5) {
    return {
      type: PlayerType.VERY_WEAK_PLAYER,
      reason: `Very weak: ${overallZ.toFixed(2)} std dev below mean (${overall.toFixed(1)})`
    };
  }
  
  // Check for WEAK_PLAYER (bottom 25% but above -1.5 std dev)
  if (overall <= thresholds.overallDist.percentiles.p25 && overallZ >= -1.5) {
    return {
      type: PlayerType.WEAK_PLAYER,
      reason: `Bottom 25% (${overall.toFixed(1)}) but within normal range`
    };
  }
  
  // Check for ELITE (> 1.5 std dev above mean OR top 10%)
  const overallRank = thresholds.allPlayers.filter(p => {
    const pOverall = ((p.attack_rating ?? 5) + (p.defense_rating ?? 5) + (p.game_iq_rating ?? 5)) / 3;
    return pOverall > overall;
  }).length;
  const isTop10Percent = overallRank < Math.ceil(thresholds.allPlayers.length * 0.1);
  
  if (overallZ > 1.5 || isTop10Percent) {
    return {
      type: PlayerType.ELITE,
      reason: `Elite player: ${overallZ > 1.5 ? `${overallZ.toFixed(2)} std dev above mean` : `Top 10% (rank #${overallRank + 1})`}`
    };
  }
  
  // Calculate player ranks for specialist detection
  const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
  const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
  const iqRank = thresholds.allPlayers.filter(p => (p.game_iq_rating ?? 5) > gameIq).length;
  const totalPlayers = thresholds.allPlayers.length;
  
  // Top 3 in any stat can be specialists if they have clear specialization
  const isTopRankAttack = attackRank < Math.min(3, totalPlayers * 0.15); // Top 3 or top 15%
  const isTopRankDefense = defenseRank < Math.min(3, totalPlayers * 0.15);
  const isTopRankIq = iqRank < Math.min(3, totalPlayers * 0.15);
  
  // Check for specialists - top 25% in one stat and significantly better than other stats
  const isTopAttack = attack >= thresholds.attackDist.percentiles.p75;
  const isTopDefense = defense >= thresholds.defenseDist.percentiles.p75;
  const isTopIq = gameIq >= thresholds.gameIqDist.percentiles.p75;
  
  // Z-scores already calculated above
  
  // Enhanced gap requirements for specialists - stronger bonuses
  const requiredGap = (stat: 'attack' | 'defense' | 'iq') => {
    if (stat === 'attack' && isTopRankAttack) return 0.5;  // Lower threshold for top attackers
    if (stat === 'defense' && isTopRankDefense) return 0.5;
    if (stat === 'iq' && isTopRankIq) return 0.5;
    return 0.75; // Still achievable for clear specialists
  };
  
  // Specialist if one stat is significantly higher than others
  if ((isTopAttack || isTopRankAttack) && 
      attackZ > defenseZ + requiredGap('attack') && 
      attackZ > iqZ + requiredGap('attack')) {
    return {
      type: PlayerType.SPECIALIST_ATK,
      reason: `Attack specialist (rank #${attackRank + 1}, z-score gap: ${(attackZ - Math.max(defenseZ, iqZ)).toFixed(2)})`
    };
  }
  if ((isTopDefense || isTopRankDefense) && 
      defenseZ > attackZ + requiredGap('defense') && 
      defenseZ > iqZ + requiredGap('defense')) {
    return {
      type: PlayerType.SPECIALIST_DEF,
      reason: `Defense specialist (rank #${defenseRank + 1}, z-score gap: ${(defenseZ - Math.max(attackZ, iqZ)).toFixed(2)})`
    };
  }
  if ((isTopIq || isTopRankIq) && 
      iqZ > attackZ + requiredGap('iq') && 
      iqZ > defenseZ + requiredGap('iq')) {
    return {
      type: PlayerType.PLAYMAKER,
      reason: `High Game IQ playmaker (rank #${iqRank + 1}, z-score gap: ${(iqZ - Math.max(attackZ, defenseZ)).toFixed(2)})`
    };
  }
  
  // Check for balanced players - low variance in z-scores
  const maxZ = Math.max(attackZ, defenseZ, iqZ);
  const minZ = Math.min(attackZ, defenseZ, iqZ);
  const varianceZ = maxZ - minZ;
  
  if (varianceZ <= 0.75) {  // Balanced if z-scores are within 0.75 std dev
    if (overall >= thresholds.overallDist.percentiles.p75) {
      return {
        type: PlayerType.BALANCED_STRONG,
        reason: `Balanced strong player (top 25%, variance: ${varianceZ.toFixed(2)})`
      };
    } else if (overall >= thresholds.overallDist.percentiles.p50) {
      return {
        type: PlayerType.BALANCED_AVERAGE,
        reason: `Balanced average player (variance: ${varianceZ.toFixed(2)})`
      };
    }
  }
  
  // Check for BELOW_AVERAGE (bottom 50% to bottom 25%)
  if (overall < thresholds.overallDist.percentiles.p50 && overall > thresholds.overallDist.percentiles.p25) {
    return {
      type: PlayerType.BELOW_AVERAGE,
      reason: `Below average (${overall.toFixed(1)}), ${(thresholds.overallDist.percentiles.p50 - overall).toFixed(1)} below median`
    };
  }
  
  // Default to BALANCED_AVERAGE for unclassified middle players
  return {
    type: PlayerType.BALANCED_AVERAGE,
    reason: `Average player (${overall.toFixed(1)}) with no clear specialization`
  };
}

/**
 * Check if a player is suitable for a position based on dynamic requirements
 */
function isPositionSuitable(
  player: TeamAssignment, 
  position: PositionType,
  thresholds: DynamicThresholds
): { suitable: boolean; reason: string } {
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;
  
  // HARD BLOCKS: Extreme mismatches that should NEVER happen
  // Like Jimmy (8.0 ATK, 4.0 DEF) in defense or Alex E (2.9 ATK, 7.3 DEF) as striker
  if (position === 'DEF' && attack > defense + 2.5) {
    return {
      suitable: false,
      reason: `Attacking player forced into defense (ATK ${attack.toFixed(1)} > DEF ${defense.toFixed(1)} by 2.5+)`
    };
  }
  
  if (position === 'ST' && defense > attack + 2.5) {
    return {
      suitable: false,
      reason: `Defensive player forced into attack (DEF ${defense.toFixed(1)} > ATK ${attack.toFixed(1)} by 2.5+)`
    };
  }
  
  if (position === 'CDM' && attack > defense + 2 && defense < 6) {
    return {
      suitable: false,
      reason: `Attacking player unsuitable for CDM (needs defensive capability)`
    };
  }
  
  // Get player's percentile ranks
  const attackPercentile = (thresholds.allPlayers.filter(p => 
    (p.attack_rating ?? 5) < attack).length / thresholds.allPlayers.length) * 100;
  const defensePercentile = (thresholds.allPlayers.filter(p => 
    (p.defense_rating ?? 5) < defense).length / thresholds.allPlayers.length) * 100;
  const iqPercentile = (thresholds.allPlayers.filter(p => 
    (p.game_iq_rating ?? 5) < gameIq).length / thresholds.allPlayers.length) * 100;
  
  // Check relative requirements
  const requirements = RELATIVE_REQUIREMENTS[position];
  if (requirements) {
    if (requirements.attack !== undefined && attackPercentile < requirements.attack) {
      // Exception: If this is one of the best attackers available (top 3), allow for ST
      const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
      if (position === 'ST' && attackRank < 3) {
        // One of top 3 attackers, allow it
      } else {
        return {
          suitable: false,
          reason: `Attack percentile ${attackPercentile.toFixed(0)}% below required ${requirements.attack}% for ${position}`
        };
      }
    }
    if (requirements.defense !== undefined && defensePercentile < requirements.defense) {
      // Exception: If this is one of the best defenders available (top 3), allow for DEF
      const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
      if (position === 'DEF' && defenseRank < 3) {
        // One of top 3 defenders, allow it
      } else {
        return {
          suitable: false,
          reason: `Defense percentile ${defensePercentile.toFixed(0)}% below required ${requirements.defense}% for ${position}`
        };
      }
    }
    if (requirements.gameIq !== undefined && iqPercentile < requirements.gameIq) {
      return {
        suitable: false,
        reason: `Game IQ percentile ${iqPercentile.toFixed(0)}% below required ${requirements.gameIq}% for ${position}`
      };
    }
  }
  
  // Special check: Is this player better suited for attack or defense?
  // This helps prevent Phil R (6.3 ATK, 5.2 DEF) from playing defense
  if (position === 'DEF' && attack > defense + 0.5) {
    // Player is notably better at attacking than defending
    // Only allow if they're one of the best defenders available
    const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
    if (defenseRank >= 5) { // Not in top 5 defenders
      return {
        suitable: false,
        reason: `Better at attack (${attack.toFixed(1)}) than defense (${defense.toFixed(1)}), not in top 5 defenders`
      };
    }
  }
  
  if (position === 'ST' && defense > attack + 0.5) {
    // Player is notably better at defending than attacking
    // Only allow if they're one of the best attackers available
    const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
    if (attackRank >= 5) { // Not in top 5 attackers
      return {
        suitable: false,
        reason: `Better at defense (${defense.toFixed(1)}) than attack (${attack.toFixed(1)}), not in top 5 attackers`
      };
    }
  }
  
  // Flexible positions (W, CM) accept anyone
  return {
    suitable: true,
    reason: position === 'W' || position === 'CM' ? 'Flexible position' : 'Meets all requirements'
  };
}

// Function removed - not currently used
// Winger suitability is handled through the main classification system

/**
 * Generate formation name based on actual positions
 */
function generateFormationName(positions: FormationTemplate['positions']): string {
  const { DEF, W, CDM, CM, CAM, ST } = positions;
  const centralMidfield = CDM + CM + CAM;
  
  // Include wingers in the formation name
  if (W > 0) {
    // With wingers: Defense-Wingers-CentralMidfield-Attack
    return `${DEF}-${W}W-${centralMidfield}-${ST}`;
  } else if (CAM > 0 && CDM > 0) {
    // If we have both CDM and CAM, show the split
    return `${DEF}-${CDM}-${CM}-${CAM}-${ST}`;
  } else {
    // Simple formation name
    return `${DEF}-${centralMidfield}-${ST}`;
  }
}

/**
 * Analyze team composition for formation selection
 */
interface TeamComposition {
  elite: number;
  specialists: { attack: number; defense: number; playmaker: number };
  strong: number;
  average: number;
  belowAverage: number;
  weak: number;
  veryWeak: number;
  unplayable: number;
  totalPlayers: number;
  attackStrength: number;  // Average attack rating of non-weak players
  defenseStrength: number; // Average defense rating of non-weak players
}

function analyzeTeamComposition(team: TeamAssignment[], thresholds: DynamicThresholds): TeamComposition {
  const composition: TeamComposition = {
    elite: 0,
    specialists: { attack: 0, defense: 0, playmaker: 0 },
    strong: 0,
    average: 0,
    belowAverage: 0,
    weak: 0,
    veryWeak: 0,
    unplayable: 0,
    totalPlayers: team.length,
    attackStrength: 0,
    defenseStrength: 0
  };
  
  let attackSum = 0, defenseSum = 0, strongPlayerCount = 0;
  
  team.forEach(player => {
    const classification = classifyPlayer(player, thresholds);
    
    switch(classification.type) {
      case PlayerType.ELITE:
        composition.elite++;
        break;
      case PlayerType.SPECIALIST_ATK:
        composition.specialists.attack++;
        break;
      case PlayerType.SPECIALIST_DEF:
        composition.specialists.defense++;
        break;
      case PlayerType.PLAYMAKER:
        composition.specialists.playmaker++;
        break;
      case PlayerType.BALANCED_STRONG:
        composition.strong++;
        break;
      case PlayerType.BALANCED_AVERAGE:
        composition.average++;
        break;
      case PlayerType.BELOW_AVERAGE:
        composition.belowAverage++;
        break;
      case PlayerType.WEAK_PLAYER:
        composition.weak++;
        break;
      case PlayerType.VERY_WEAK_PLAYER:
        composition.veryWeak++;
        break;
      case PlayerType.UNPLAYABLE:
        composition.unplayable++;
        break;
    }
    
    // Calculate strength for non-weak players
    if (classification.type !== PlayerType.WEAK_PLAYER && 
        classification.type !== PlayerType.VERY_WEAK_PLAYER && 
        classification.type !== PlayerType.UNPLAYABLE) {
      attackSum += player.attack_rating ?? 5;
      defenseSum += player.defense_rating ?? 5;
      strongPlayerCount++;
    }
  });
  
  if (strongPlayerCount > 0) {
    composition.attackStrength = attackSum / strongPlayerCount;
    composition.defenseStrength = defenseSum / strongPlayerCount;
  }
  
  return composition;
}

/**
 * Select the best formation based on team quality and composition
 */
function selectAdaptiveFormation(
  team: TeamAssignment[], 
  thresholds: DynamicThresholds
): { formation: FormationTemplate; reasoning: string } {
  const outfieldCount = team.length - 1; // Account for rotating keeper
  const composition = analyzeTeamComposition(team, thresholds);
  
  const validFormations = FORMATION_TEMPLATES.filter(
    f => outfieldCount >= f.minPlayers && outfieldCount <= f.maxPlayers
  );
  
  if (validFormations.length === 0) {
    // Fallback for unusual team sizes
    return {
      formation: createDefaultFormation(outfieldCount),
      reasoning: `Custom formation for ${outfieldCount} outfield players`
    };
  }
  
  // Decision logic based on team composition
  let selectedFormation: FormationTemplate | null = null;
  let reasoning = '';
  
  // PRIORITY 1: Handle very weak teams
  if (composition.unplayable >= 2) {
    // Ultra-defensive with single striker
    selectedFormation = validFormations.find(f => 
      f.positions.DEF >= 4 && f.positions.ST === 1
    ) || validFormations.find(f => f.positions.ST === 1) || null;
    reasoning = `Ultra-defensive: ${composition.unplayable} unplayable players require maximum defensive cover`;
  }
  else if (composition.veryWeak >= 3 || (composition.veryWeak + composition.unplayable) >= 3) {
    // Force single striker, prioritize defense
    selectedFormation = validFormations.find(f => 
      f.positions.ST === 1 && f.positions.DEF >= 3
    ) || null;
    reasoning = `Defensive formation: ${composition.veryWeak} very weak players, single striker only`;
  }
  // PRIORITY 2: Leverage specialists
  else if (composition.specialists.attack >= 2 && composition.weak <= 1) {
    // Can afford 2 strikers if we have 2+ attack specialists
    selectedFormation = validFormations.find(f => 
      f.positions.ST === 2 && f.positions.DEF >= 3
    ) || null;
    reasoning = `Attacking formation: ${composition.specialists.attack} attack specialists support 2 strikers`;
  }
  else if (composition.specialists.defense >= 2 && composition.attackStrength < 6.5) {
    // Strong defense, weak attack = defensive formation
    selectedFormation = validFormations.find(f => 
      f.positions.DEF >= 4 && f.positions.ST === 1
    ) || null;
    reasoning = `Defensive specialists: ${composition.specialists.defense} defensive specialists, weak attack (${composition.attackStrength.toFixed(1)})`;
  }
  // PRIORITY 3: Balanced approach based on overall quality
  else if (composition.weak >= 2 || composition.attackStrength < 6.0) {
    // Weak attack = single striker
    selectedFormation = validFormations.find(f => 
      f.positions.ST === 1 && f.positions.CM >= 2
    ) || null;
    reasoning = `Conservative: Weak attack strength (${composition.attackStrength.toFixed(1)}), prioritizing midfield control`;
  }
  else if (composition.strong + composition.elite >= team.length * 0.5) {
    // Strong team can be more aggressive
    selectedFormation = validFormations.find(f => 
      f.positions.ST === 2 || (f.positions.ST === 1 && f.positions.CAM >= 1)
    ) || null;
    reasoning = `Strong team: ${composition.strong + composition.elite} strong players allow attacking formation`;
  }
  
  // FALLBACK: Choose most balanced formation
  if (!selectedFormation) {
    // Prefer formations with good midfield presence
    selectedFormation = validFormations.find(f => 
      f.positions.CM + f.positions.CDM >= 3 && f.positions.ST === 1
    ) || validFormations[0];
    reasoning = reasoning || `Balanced formation for mixed ability team`;
  }
  
  // Generate formation name
  selectedFormation.name = generateFormationName(selectedFormation.positions);
  
  return { formation: selectedFormation, reasoning };
}

/**
 * Create a default formation for unusual team sizes
 */
function createDefaultFormation(outfieldCount: number): FormationTemplate {
  const positions = {
    DEF: Math.max(2, Math.floor(outfieldCount * 0.35)),
    W: 0, // Keep it simple for default
    CDM: outfieldCount >= 6 ? 1 : 0,
    CM: Math.max(1, Math.floor(outfieldCount * 0.35)),
    CAM: 0,
    ST: 1 // Always single striker for safety
  };
  
  // Adjust to match exact count
  const total = positions.DEF + positions.CDM + positions.CM + positions.ST;
  if (total < outfieldCount) {
    positions.CM += outfieldCount - total;
  } else if (total > outfieldCount) {
    positions.CM = Math.max(1, positions.CM - (total - outfieldCount));
  }
  
  return {
    name: generateFormationName(positions),
    positions,
    minPlayers: outfieldCount,
    maxPlayers: outfieldCount
  };
}

/**
 * Position restrictions based on player tier
 */
interface PositionRestrictions {
  forbidden: PlayerType[];  // Types that cannot play this position
  maxWeak: number;          // Max number of weak players allowed
  maxVeryWeak: number;      // Max number of very weak players allowed
  preferred?: PlayerType[]; // Types that are preferred for this position
}

/**
 * Get dynamic position restrictions based on team composition
 */
function getPositionRestrictions(composition: TeamComposition): Record<PositionType, PositionRestrictions> {
  const unplayableCount = composition.unplayable;
  const veryWeakCount = composition.veryWeak;
  // weakCount variable removed - not currently used in restrictions
  
  return {
    ST: {
      forbidden: [PlayerType.UNPLAYABLE, PlayerType.VERY_WEAK_PLAYER],
      maxWeak: unplayableCount > 0 ? 0 : (veryWeakCount > 1 ? 0 : 1),
      maxVeryWeak: 0,
      preferred: [PlayerType.SPECIALIST_ATK, PlayerType.ELITE]
    },
    CDM: {
      forbidden: [PlayerType.UNPLAYABLE, PlayerType.VERY_WEAK_PLAYER],
      maxWeak: veryWeakCount > 2 ? 0 : 1,
      maxVeryWeak: 0,
      preferred: [PlayerType.SPECIALIST_DEF, PlayerType.BALANCED_STRONG]
    },
    DEF: {
      forbidden: [PlayerType.UNPLAYABLE],
      maxWeak: Math.floor(3 / 2), // Half of defenders max
      maxVeryWeak: 1,
      preferred: [PlayerType.SPECIALIST_DEF]
    },
    CAM: {
      forbidden: [PlayerType.UNPLAYABLE, PlayerType.VERY_WEAK_PLAYER],
      maxWeak: 1,
      maxVeryWeak: 0,
      preferred: [PlayerType.PLAYMAKER, PlayerType.ELITE]
    },
    CM: {
      forbidden: [PlayerType.UNPLAYABLE],
      maxWeak: 2,
      maxVeryWeak: unplayableCount > 0 ? 1 : 2,
      preferred: [PlayerType.BALANCED_STRONG, PlayerType.BALANCED_AVERAGE]
    },
    W: {
      forbidden: [], // Most flexible position - accepts anyone
      maxWeak: 999, // No limit
      maxVeryWeak: 999, // No limit
      preferred: [PlayerType.WEAK_PLAYER, PlayerType.VERY_WEAK_PLAYER, PlayerType.UNPLAYABLE]
    }
  };
}

/**
 * Check if a player type is allowed in a position based on restrictions
 */
function isPlayerTypeAllowedInPosition(
  playerType: PlayerType,
  position: PositionType,
  restrictions: Record<PositionType, PositionRestrictions>,
  currentCounts: Record<PositionType, { weak: number; veryWeak: number; unplayable: number }>
): boolean {
  const posRestrictions = restrictions[position];
  
  // Check if type is forbidden
  if (posRestrictions.forbidden.includes(playerType)) {
    return false;
  }
  
  // Check count limits
  if (playerType === PlayerType.WEAK_PLAYER) {
    return currentCounts[position].weak < posRestrictions.maxWeak;
  }
  if (playerType === PlayerType.VERY_WEAK_PLAYER) {
    return currentCounts[position].veryWeak < posRestrictions.maxVeryWeak;
  }
  
  return true;
}

/**
 * Detect natural position for a player based on their stat distribution
 */
function detectNaturalPosition(
  player: TeamAssignment,
  thresholds: DynamicThresholds
): PositionType | null {
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;
  
  // Calculate relative strengths
  const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
  const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
  const totalPlayers = thresholds.allPlayers.length;
  
  // Extreme defensive specialist (like Alex E: 2.9 ATK, 7.3 DEF)
  if (defense > 7 && attack < 4) return 'DEF';
  if (defense > attack + 3) return 'DEF';
  if (defenseRank < 3 && attackRank > totalPlayers * 0.7) return 'DEF';
  
  // Extreme attacking specialist (like Jimmy: 8.0 ATK, 4.0 DEF)
  if (attack > 7 && defense < 4) return 'ST';
  if (attack > defense + 3) return 'ST';
  if (attackRank < 3 && defenseRank > totalPlayers * 0.7) return 'ST';
  
  // High IQ playmaker with balanced stats
  if (gameIq > 7 && Math.abs(attack - defense) < 1.5) return 'CM';
  
  // Strong defender who can also attack
  if (defense > 6.5 && attack > 5.5) return 'CDM';
  
  return null;
}

/**
 * Calculate alternative positions for a player
 */
function calculateAlternativePositions(
  player: TeamAssignment
): Array<{ position: PositionType; score: number }> {
  const positions: PositionType[] = ['DEF', 'W', 'CDM', 'CM', 'CAM', 'ST'];
  return positions
    .map(position => ({
      position,
      score: calculatePositionScore(player, position)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(1); // Remove the best position (that's the primary)
}

/**
 * PHASED ASSIGNMENT ALGORITHM
 * Phase 1: Lock specialists to their ideal positions
 * Phase 2: Fill critical positions with best available
 * Phase 3: Assign remaining players with restrictions
 */
function assignPlayersToPositions(
  team: TeamAssignment[],
  formation: FormationTemplate
): FormationSuggestion {
  const positions: FormationSuggestion['positions'] = {
    DEF: [],
    W: [],
    CDM: [],
    CM: [],
    CAM: [],
    ST: []
  };
  
  const rationale: string[] = [];
  
  // Initialize debug log
  const debugLog: FormationDebugLog = {
    timestamp: new Date().toISOString(),
    teamSize: team.length,
    playerClassifications: new Map(),
    thresholds: {
      attack: { mean: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
      defense: { mean: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
      gameIq: { mean: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
      overall: { mean: 0, p25: 0, p50: 0, p75: 0, p90: 0 }
    },
    positionMatrix: [],
    assignments: [],
    optimizations: [],
    finalBalance: { defense: 0, midfield: 0, attack: 0, overall: 0 },
    confidence: 'low',
    confidenceReason: ''
  };
  
  // Calculate dynamic thresholds based on current player pool
  const thresholds = calculateDynamicThresholds(team);
  
  // Analyze team composition for restrictions
  const composition = analyzeTeamComposition(team, thresholds);
  const restrictions = getPositionRestrictions(composition);
  
  // Store thresholds in debug log
  debugLog.thresholds = {
    attack: {
      mean: thresholds.attackDist.mean,
      p25: thresholds.attackDist.percentiles.p25,
      p50: thresholds.attackDist.percentiles.p50,
      p75: thresholds.attackDist.percentiles.p75,
      p90: thresholds.attackDist.percentiles.p90
    },
    defense: {
      mean: thresholds.defenseDist.mean,
      p25: thresholds.defenseDist.percentiles.p25,
      p50: thresholds.defenseDist.percentiles.p50,
      p75: thresholds.defenseDist.percentiles.p75,
      p90: thresholds.defenseDist.percentiles.p90
    },
    gameIq: {
      mean: thresholds.gameIqDist.mean,
      p25: thresholds.gameIqDist.percentiles.p25,
      p50: thresholds.gameIqDist.percentiles.p50,
      p75: thresholds.gameIqDist.percentiles.p75,
      p90: thresholds.gameIqDist.percentiles.p90
    },
    overall: {
      mean: thresholds.overallDist.mean,
      p25: thresholds.overallDist.percentiles.p25,
      p50: thresholds.overallDist.percentiles.p50,
      p75: thresholds.overallDist.percentiles.p75,
      p90: thresholds.overallDist.percentiles.p90
    }
  };
  
  // Classify all players
  const playerClassifications = new Map<string, PlayerType>();
  team.forEach(player => {
    const classification = classifyPlayer(player, thresholds);
    playerClassifications.set(player.player_id, classification.type);
    
    // Add to debug log
    debugLog.playerClassifications.set(player.player_id, {
      playerId: player.player_id,
      playerName: player.friendly_name,
      type: classification.type,
      ratings: {
        attack: player.attack_rating ?? 5,
        defense: player.defense_rating ?? 5,
        gameIq: player.game_iq_rating ?? 5,
        overall: ((player.attack_rating ?? 5) + (player.defense_rating ?? 5) + (player.game_iq_rating ?? 5)) / 3
      },
      reason: classification.reason
    });
  });
  
  // Track weak player counts per position
  const positionCounts: Record<PositionType, { 
    total: number; 
    weak: number; 
    veryWeak: number; 
    unplayable: number 
  }> = {
    DEF: { total: 0, weak: 0, veryWeak: 0, unplayable: 0 },
    W: { total: 0, weak: 0, veryWeak: 0, unplayable: 0 },
    CDM: { total: 0, weak: 0, veryWeak: 0, unplayable: 0 },
    CM: { total: 0, weak: 0, veryWeak: 0, unplayable: 0 },
    CAM: { total: 0, weak: 0, veryWeak: 0, unplayable: 0 },
    ST: { total: 0, weak: 0, veryWeak: 0, unplayable: 0 }
  };
  
  // PHASE 1: Lock in specialists
  const assignedPlayers = new Set<string>();
  const specialists: Array<{ player: TeamAssignment; type: PlayerType }> = [];
  
  team.forEach(player => {
    const classification = classifyPlayer(player, thresholds);
    if ([PlayerType.SPECIALIST_ATK, PlayerType.SPECIALIST_DEF, PlayerType.PLAYMAKER, PlayerType.ELITE].includes(classification.type)) {
      specialists.push({ player, type: classification.type });
    }
  });
  
  // Sort specialists by importance
  specialists.sort((a, b) => {
    const priorityA = a.type === PlayerType.ELITE ? 200 : 
                     a.type === PlayerType.SPECIALIST_ATK ? 150 :
                     a.type === PlayerType.SPECIALIST_DEF ? 150 : 100;
    const priorityB = b.type === PlayerType.ELITE ? 200 :
                     b.type === PlayerType.SPECIALIST_ATK ? 150 :
                     b.type === PlayerType.SPECIALIST_DEF ? 150 : 100;
    return priorityB - priorityA;
  });
  
  // Assign specialists first
  for (const { player, type } of specialists) {
    let targetPosition: PositionType | null = null;
    
    if (type === PlayerType.SPECIALIST_ATK) {
      if (positionCounts.ST.total < formation.positions.ST) {
        targetPosition = 'ST';
      } else if (formation.positions.CAM > 0 && positionCounts.CAM.total < formation.positions.CAM) {
        targetPosition = 'CAM';
      }
    } else if (type === PlayerType.SPECIALIST_DEF) {
      if (positionCounts.DEF.total < formation.positions.DEF) {
        targetPosition = 'DEF';
      } else if (positionCounts.CDM.total < formation.positions.CDM) {
        targetPosition = 'CDM';
      }
    } else if (type === PlayerType.PLAYMAKER) {
      if (formation.positions.CAM > 0 && positionCounts.CAM.total < formation.positions.CAM) {
        targetPosition = 'CAM';
      } else if (positionCounts.CM.total < formation.positions.CM) {
        targetPosition = 'CM';
      }
    } else if (type === PlayerType.ELITE) {
      // Elite players go to most critical open position
      const criticalPositions: PositionType[] = ['ST', 'CDM', 'CAM', 'DEF'];
      for (const pos of criticalPositions) {
        if (formation.positions[pos] > 0 && positionCounts[pos].total < formation.positions[pos]) {
          targetPosition = pos;
          break;
        }
      }
    }
    
    if (targetPosition) {
      positions[targetPosition].push({
        player,
        position: targetPosition,
        score: calculatePositionScore(player, targetPosition),
        isSpecialist: true,
        alternativePositions: calculateAlternativePositions(player)
      });
      assignedPlayers.add(player.player_id);
      positionCounts[targetPosition].total++;
      rationale.push(`${player.friendly_name} → ${targetPosition} (${type} - specialist locked)`);  
      
      debugLog.assignments.push({
        order: assignedPlayers.size,
        player: player.friendly_name,
        position: targetPosition,
        priority: 150,
        score: calculatePositionScore(player, targetPosition),
        reason: `${type} specialist - phase 1 lock`
      });
    }
  }
  
  // PRE-PHASE: Detect natural positions for remaining players
  const naturalPositions = new Map<string, PositionType>();
  team.forEach(player => {
    if (!assignedPlayers.has(player.player_id)) {
      const natural = detectNaturalPosition(player, thresholds);
      if (natural) {
        naturalPositions.set(player.player_id, natural);
      }
    }
  });
  
  // PHASE 2: Fill remaining positions with restrictions
  interface Assignment {
    player: TeamAssignment;
    position: PositionType;
    baseScore: number;
    adjustedScore: number;
    suitable: boolean;
    priority: number;
    playerType: PlayerType;
    allowed: boolean;
    isNaturalPosition: boolean;
  }
  
  const allAssignments: Assignment[] = [];
  const positionTypes: PositionType[] = ['ST', 'CDM', 'DEF', 'CAM', 'CM', 'W']; // Priority order
  
  // Calculate scores for all unassigned players
  for (const player of team) {
    if (assignedPlayers.has(player.player_id)) continue;
    
    const classification = classifyPlayer(player, thresholds);
    const playerType = classification.type;
    playerClassifications.set(player.player_id, playerType);
    
    // Add classification to debug log
    debugLog.playerClassifications.set(player.player_id, {
      playerId: player.player_id,
      playerName: player.friendly_name,
      type: classification.type,
      ratings: {
        attack: player.attack_rating ?? 5,
        defense: player.defense_rating ?? 5,
        gameIq: player.game_iq_rating ?? 5,
        overall: ((player.attack_rating ?? 5) + (player.defense_rating ?? 5) + (player.game_iq_rating ?? 5)) / 3
      },
      reason: classification.reason
    });
    
    for (const position of positionTypes) {
      // Skip if position is full
      if (positionCounts[position].total >= formation.positions[position]) continue;
      
      // Check if player type is allowed in this position
      const allowed = isPlayerTypeAllowedInPosition(
        playerType,
        position,
        restrictions,
        positionCounts
      );
      
      const baseScore = calculatePositionScore(player, position);
      const suitabilityCheck = isPositionSuitable(player, position, thresholds);
      const suitable = suitabilityCheck.suitable;
      const isNaturalPosition = naturalPositions.get(player.player_id) === position;
      
      let adjustedScore = baseScore;
      let priority = 0;
      
      // Huge bonus for natural position
      if (isNaturalPosition) {
        adjustedScore *= 2.0;
        priority += 100;
      }
      
      // Enhanced bonuses/penalties with stronger specialist bonuses
      if (!allowed) {
        adjustedScore *= 0.1; // Severe penalty for forbidden assignments
        priority = -200;
      } else if (playerType === PlayerType.ELITE) {
        adjustedScore *= 1.8;
        priority = 120;
      } else if (playerType === PlayerType.BALANCED_STRONG) {
        if (position === 'CM' || position === 'CDM') {
          adjustedScore *= 1.3;
          priority = 70;
        } else {
          adjustedScore *= 1.1;
          priority = 50;
        }
      } else if (playerType === PlayerType.BALANCED_AVERAGE) {
        priority = 30;
      } else if (playerType === PlayerType.BELOW_AVERAGE) {
        if (position === 'W' || position === 'CM') {
          priority = 20;
        } else {
          adjustedScore *= 0.8;
          priority = 10;
        }
      } else if (playerType === PlayerType.WEAK_PLAYER) {
        if (position === 'W') {
          priority = 15; // Preferred position for weak
        } else if (POSITION_CRITICALITY[position] >= 2) {
          adjustedScore *= 0.2;
          priority = -100;
        } else {
          adjustedScore *= 0.5;
          priority = -50;
        }
      } else if (playerType === PlayerType.VERY_WEAK_PLAYER) {
        if (position === 'W' || position === 'CM') {
          adjustedScore *= 0.7;
          priority = 5;
        } else {
          adjustedScore *= 0.1;
          priority = -150;
        }
      } else if (playerType === PlayerType.UNPLAYABLE) {
        // Should only go to W
        if (position === 'W') {
          adjustedScore *= 0.5;
          priority = 0;
        } else {
          adjustedScore *= 0.05;
          priority = -200;
        }
      }
      
      // Additional priority adjustments
      if (!suitable) {
        adjustedScore *= 0.5;
        priority -= 50;
      }
      
      // Critical positions get slight priority boost if player is suitable
      if (suitable && POSITION_CRITICALITY[position] >= 2) {
        priority += 10;
      }
      
      allAssignments.push({
        player,
        position,
        baseScore,
        adjustedScore,
        suitable,
        priority,
        playerType,
        allowed,
        isNaturalPosition
      });
      
      // Add to debug log position matrix
      debugLog.positionMatrix.push({
        player: player.friendly_name,
        position,
        baseScore,
        adjustedScore,
        priority,
        suitable,
        suitabilityReason: suitabilityCheck.reason
      });
    }
  }
  
  // Sort assignments with restrictions in mind
  allAssignments.sort((a, b) => {
    // Natural positions first (highest priority)
    if (a.isNaturalPosition && !b.isNaturalPosition) return -1;
    if (!a.isNaturalPosition && b.isNaturalPosition) return 1;
    
    // Forbidden assignments go last
    if (!a.allowed && b.allowed) return 1;
    if (a.allowed && !b.allowed) return -1;
    
    // Unsuitable assignments for critical positions go last
    const aCriticalUnsuitable = !a.suitable && POSITION_CRITICALITY[a.position] >= 2;
    const bCriticalUnsuitable = !b.suitable && POSITION_CRITICALITY[b.position] >= 2;
    if (aCriticalUnsuitable && !bCriticalUnsuitable) return 1;
    if (!aCriticalUnsuitable && bCriticalUnsuitable) return -1;
    
    // Critical positions for non-weak players first
    const aCritical = POSITION_CRITICALITY[a.position] >= 2 && 
                     ![PlayerType.WEAK_PLAYER, PlayerType.VERY_WEAK_PLAYER, PlayerType.UNPLAYABLE].includes(a.playerType);
    const bCritical = POSITION_CRITICALITY[b.position] >= 2 && 
                     ![PlayerType.WEAK_PLAYER, PlayerType.VERY_WEAK_PLAYER, PlayerType.UNPLAYABLE].includes(b.playerType);
    if (aCritical && !bCritical) return -1;
    if (!aCritical && bCritical) return 1;
    
    // Then by priority and score
    if (Math.abs(a.priority - b.priority) > 10) {
      return b.priority - a.priority;
    }
    return b.adjustedScore - a.adjustedScore;
  });
  
  // Assign remaining players
  // Note: We need to assign ALL players, even if it means overfilling flexible positions
  // since one player will always be rotating to keeper
  const flexiblePositions: PositionType[] = ['W', 'CM', 'DEF']; // Positions that can handle extra players
  
  for (const assignment of allAssignments) {
    // Skip if player already assigned
    if (assignedPlayers.has(assignment.player.player_id)) continue;
    
    // Check if position is full
    const positionFull = positionCounts[assignment.position].total >= formation.positions[assignment.position];
    
    // If position is full but it's a flexible position and we still have unassigned players
    // allow overfilling to ensure all players are assigned (for rotating keeper)
    if (positionFull) {
      const unassignedCount = team.length - assignedPlayers.size;
      if (unassignedCount > 0 && flexiblePositions.includes(assignment.position)) {
        // Allow one extra player in flexible positions for rotation
        if (positionCounts[assignment.position].total >= formation.positions[assignment.position] + 1) {
          continue;
        }
      } else {
        continue;
      }
    }
    
    // Skip if not allowed (restrictions)
    if (!assignment.allowed) continue;
    
    // CRITICAL: Block unsuitable assignments for critical positions
    // This prevents players like Jimmy (8 ATK, 4 DEF) from being assigned to defense
    if (!assignment.suitable && POSITION_CRITICALITY[assignment.position] >= 2) {
      // Don't assign unsuitable players to critical positions (ST, CDM, DEF)
      continue;
    }
    
    // Assign the player
    positions[assignment.position].push({
      player: assignment.player,
      position: assignment.position,
      score: assignment.baseScore,
      isSpecialist: false,
      alternativePositions: calculateAlternativePositions(assignment.player)
    });
    
    assignedPlayers.add(assignment.player.player_id);
    positionCounts[assignment.position].total++;
    
    // Update weak player counts
    if (assignment.playerType === PlayerType.WEAK_PLAYER) {
      positionCounts[assignment.position].weak++;
    } else if (assignment.playerType === PlayerType.VERY_WEAK_PLAYER) {
      positionCounts[assignment.position].veryWeak++;
    } else if (assignment.playerType === PlayerType.UNPLAYABLE) {
      positionCounts[assignment.position].unplayable++;
    }
    
    // Add to debug log
    debugLog.assignments.push({
      order: assignedPlayers.size,
      player: assignment.player.friendly_name,
      position: assignment.position,
      priority: assignment.priority,
      score: assignment.baseScore,
      reason: `${assignment.playerType} - phase 2${assignment.suitable ? '' : ' (compromise)'}`
    });
    
    // Add to rationale
    rationale.push(`${assignment.player.friendly_name} → ${assignment.position} (${assignment.playerType})`);
  }
  
  // PHASE 3: Smart assignment of remaining players based on their strengths
  // Use percentile rankings to determine best fit
  if (assignedPlayers.size < team.length) {
    const unassignedPlayers = team.filter(p => !assignedPlayers.has(p.player_id));
    
    for (const player of unassignedPlayers) {
      const classification = classifyPlayer(player, thresholds);
      const attack = player.attack_rating ?? 5;
      const defense = player.defense_rating ?? 5;
      
      // Calculate percentile rankings
      const attackPercentile = (thresholds.allPlayers.filter(p => 
        (p.attack_rating ?? 5) < attack).length / thresholds.allPlayers.length) * 100;
      const defensePercentile = (thresholds.allPlayers.filter(p => 
        (p.defense_rating ?? 5) < defense).length / thresholds.allPlayers.length) * 100;
      
      // Determine position preferences based on relative strengths
      let preferredPositions: PositionType[] = [];
      let avoidPositions: PositionType[] = [];
      
      // CRITICAL: Special handling for very weak players (like Mike M with 0% defense)
      // These players should NEVER go to critical positions
      if (attackPercentile < 20 && defensePercentile < 20) {
        // Extremely weak player - only safe positions
        if (attackPercentile > defensePercentile + 5) {
          // Slightly better at attack (but still terrible)
          preferredPositions = ['W', 'CM'];
          avoidPositions = ['DEF', 'CDM', 'ST']; // Not good enough for ST either
        } else if (defensePercentile > attackPercentile + 5) {
          // Slightly better at defense (but still terrible)
          preferredPositions = ['W', 'CM'];
          avoidPositions = ['ST', 'CAM', 'DEF', 'CDM']; // Not good enough for DEF either
        } else {
          // Equally terrible at everything - midfield/wing only
          preferredPositions = ['W', 'CM'];
          avoidPositions = ['DEF', 'CDM', 'ST', 'CAM'];
        }
      }
      // Respect specialist types
      else if (classification.type === PlayerType.SPECIALIST_ATK) {
        preferredPositions = ['ST', 'CAM', 'W', 'CM'];
        avoidPositions = ['DEF', 'CDM']; // Never put attacking specialists in defense
      } else if (classification.type === PlayerType.SPECIALIST_DEF) {
        preferredPositions = ['DEF', 'CDM', 'CM'];
        avoidPositions = ['ST', 'CAM']; // Never put defensive specialists in attack
      }
      // Use lower threshold (15 instead of 20) for better sensitivity
      else if (attackPercentile > defensePercentile + 15) {
        // Attack-minded player
        preferredPositions = ['ST', 'CAM', 'W', 'CM'];
        avoidPositions = ['DEF', 'CDM'];
      } else if (defensePercentile > attackPercentile + 15) {
        // Defense-minded player  
        preferredPositions = ['DEF', 'CDM', 'CM', 'W'];
        avoidPositions = ['ST', 'CAM'];
      }
      // Additional check for moderately weak players
      else if (Math.max(attackPercentile, defensePercentile) < 30) {
        // Both stats are weak (but not extremely weak) - avoid critical positions
        preferredPositions = ['W', 'CM', 'CAM'];
        avoidPositions = ['DEF', 'CDM', 'ST'];
      } else {
        // Truly balanced player - can go anywhere but prefer midfield
        preferredPositions = ['CM', 'W', 'CDM', 'CAM', 'DEF', 'ST'];
        avoidPositions = [];
      }
      
      // Find best available position from preferences
      let bestPosition: PositionType | null = null;
      let bestScore = -999;
      
      // Define absolute minimum percentiles for critical positions
      const ABSOLUTE_MINIMUM_PERCENTILES: Partial<Record<PositionType, { attack?: number; defense?: number }>> = {
        'DEF': { defense: 20 },  // Must be in top 80% defense minimum
        'CDM': { defense: 20 },  // Must be in top 80% defense minimum  
        'ST': { attack: 20 },    // Must be in top 80% attack minimum
      };
      
      // First try preferred positions
      for (const position of preferredPositions) {
        if (avoidPositions.includes(position)) continue;
        
        // HARD BLOCK: Check absolute minimum percentiles
        const minReqs = ABSOLUTE_MINIMUM_PERCENTILES[position];
        if (minReqs) {
          if (minReqs.defense && defensePercentile < minReqs.defense) {
            continue; // Skip this position - player doesn't meet minimum defense
          }
          if (minReqs.attack && attackPercentile < minReqs.attack) {
            continue; // Skip this position - player doesn't meet minimum attack
          }
        }
        
        const score = calculatePositionScore(player, position);
        // Check if position is available or flexible enough
        const isAvailable = positionCounts[position].total < formation.positions[position];
        const isFlexible = flexiblePositions.includes(position) && 
                          positionCounts[position].total < formation.positions[position] + 1;
        
        if (isAvailable || isFlexible) {
          const adjustedScore = score * (isAvailable ? 1.5 : 1); // Prefer truly available positions
          if (adjustedScore > bestScore) {
            bestScore = adjustedScore;
            bestPosition = position;
          }
        }
      }
      
      // If no preferred position is available, try any non-avoided position
      if (!bestPosition) {
        for (const position of positionTypes) {
          if (avoidPositions.includes(position)) continue;
          
          // HARD BLOCK: Check absolute minimum percentiles even in fallback
          const minReqs = ABSOLUTE_MINIMUM_PERCENTILES[position];
          if (minReqs) {
            if (minReqs.defense && defensePercentile < minReqs.defense) {
              continue; // Skip this position - player doesn't meet minimum defense
            }
            if (minReqs.attack && attackPercentile < minReqs.attack) {
              continue; // Skip this position - player doesn't meet minimum attack
            }
          }
          
          const score = calculatePositionScore(player, position);
          const overfillPenalty = positionCounts[position].total >= formation.positions[position] ? 0.3 : 1;
          const adjustedScore = score * overfillPenalty;
          
          if (adjustedScore > bestScore) {
            bestScore = adjustedScore;
            bestPosition = position;
          }
        }
      }
      
      // Special handling for very weak players who can't find a position
      // Allow overfilling flexible positions rather than forcing them into critical positions
      if (!bestPosition && classification.type === PlayerType.VERY_WEAK_PLAYER) {
        // Try to force into flexible positions even if overfilled
        const safePositions: PositionType[] = ['CM', 'W'];
        for (const safePos of safePositions) {
          // Allow up to 2 extra players in these positions
          if (positionCounts[safePos].total < formation.positions[safePos] + 2) {
            bestPosition = safePos;
            break;
          }
        }
      }
      
      // Last resort: assign to least filled position that's not avoided
      if (!bestPosition) {
        let minFill = 999;
        for (const position of positionTypes) {
          // For very weak players, still avoid critical positions even in last resort
          if (classification.type === PlayerType.VERY_WEAK_PLAYER) {
            if (['DEF', 'CDM', 'ST'].includes(position) && 
                (position === 'DEF' && defensePercentile < 20) ||
                (position === 'CDM' && defensePercentile < 20) ||
                (position === 'ST' && attackPercentile < 20)) {
              continue; // Skip critical positions for very weak players
            }
          }
          
          if (!avoidPositions.includes(position) && positionCounts[position].total < minFill) {
            minFill = positionCounts[position].total;
            bestPosition = position;
          }
        }
        // Ultimate fallback - force to midfield/wing
        if (!bestPosition) {
          // For very weak players, force to CM or W even if heavily overfilled
          if (classification.type === PlayerType.VERY_WEAK_PLAYER) {
            bestPosition = positionCounts['CM'].total <= positionCounts['W'].total ? 'CM' : 'W';
          } else {
            bestPosition = 'CM';
          }
        }
      }
      
      // Assign the player
      positions[bestPosition].push({
        player,
        position: bestPosition,
        score: calculatePositionScore(player, bestPosition),
        isSpecialist: classification.type === PlayerType.SPECIALIST_ATK || 
                       classification.type === PlayerType.SPECIALIST_DEF,
        alternativePositions: calculateAlternativePositions(player)
      });
      
      assignedPlayers.add(player.player_id);
      positionCounts[bestPosition].total++;
      
      // Update weak player counts
      if (classification.type === PlayerType.WEAK_PLAYER) {
        positionCounts[bestPosition].weak++;
      } else if (classification.type === PlayerType.VERY_WEAK_PLAYER) {
        positionCounts[bestPosition].veryWeak++;
      } else if (classification.type === PlayerType.UNPLAYABLE) {
        positionCounts[bestPosition].unplayable++;
      }
      
      const assignmentReason = avoidPositions.includes(bestPosition) ? 
        `${classification.type} - phase 3 (forced - no alternatives)` :
        `${classification.type} - phase 3 (based on ${attackPercentile > defensePercentile ? 'attack' : 'defense'} strength)`;
      
      debugLog.assignments.push({
        order: assignedPlayers.size,
        player: player.friendly_name,
        position: bestPosition,
        priority: -1,
        score: calculatePositionScore(player, bestPosition),
        reason: assignmentReason
      });
      
      rationale.push(`${player.friendly_name} → ${bestPosition} (${classification.type})`);
    }
  }
  
  // Apply multi-stage optimization
  const optimized = optimizeFormation(positions, team, formation, thresholds, composition, debugLog);
  if (optimized.changed) {
    rationale.push(...optimized.rationale);
  }
  
  // Calculate balance scores
  const balanceScore = calculateBalanceScore(positions);
  
  // Determine confidence level
  const confidence = determineConfidence(positions, formation, assignedPlayers.size, team.length);
  
  // Update debug log with final info
  debugLog.finalBalance = balanceScore;
  debugLog.confidence = confidence;
  if (confidence === 'high') {
    debugLog.confidenceReason = 'All positions filled, balanced team composition';
  } else if (confidence === 'medium') {
    debugLog.confidenceReason = 'Most positions filled adequately, some compromises made';
  } else {
    debugLog.confidenceReason = 'Limited player pool or skill distribution challenges';
  }
  
  return {
    formation: formation.name,
    positions,
    confidence,
    rationale,
    balanceScore,
    debugLog
  };
}


/**
 * Multi-stage optimization system
 */
interface OptimizationResult {
  changed: boolean;
  rationale: string[];
}

function optimizeFormation(
  positions: FormationSuggestion['positions'],
  _team: TeamAssignment[],
  formation: FormationTemplate,
  thresholds: DynamicThresholds,
  _composition: TeamComposition,
  debugLog?: FormationDebugLog
): OptimizationResult {
  const result: OptimizationResult = {
    changed: false,
    rationale: []
  };
  
  // STAGE 1: Emergency removal of unplayable/very weak from critical positions
  const criticalPositions: PositionType[] = ['ST', 'CDM'];
  
  for (const criticalPos of criticalPositions) {
    const playersInPosition = positions[criticalPos];
    
    for (let i = playersInPosition.length - 1; i >= 0; i--) {
      const player = playersInPosition[i];
      const classification = classifyPlayer(player.player, thresholds);
      
      if ([PlayerType.UNPLAYABLE, PlayerType.VERY_WEAK_PLAYER].includes(classification.type)) {
        // Find ANY better position for this player
        const safePositions: PositionType[] = ['W', 'CM'];
        
        for (const safePos of safePositions) {
          if (positions[safePos].length < formation.positions[safePos]) {
            // Move player to safer position
            positions[safePos].push(playersInPosition.splice(i, 1)[0]);
            result.changed = true;
            result.rationale.push(
              `EMERGENCY: Moved ${player.player.friendly_name} from ${criticalPos} to ${safePos} (${classification.type})`
            );
            
            if (debugLog) {
              debugLog.optimizations.push({
                type: 'EMERGENCY_REMOVAL',
                from: { player: player.player.friendly_name, position: criticalPos },
                to: { player: player.player.friendly_name, position: safePos },
                reason: `${classification.type} in critical position`
              });
            }
            break;
          }
        }
      }
    }
  }
  
  // STAGE 2: Swap weak players in critical positions with better players
  optimizeWeakPlayersInCritical(positions, thresholds, result, debugLog);
  
  // STAGE 3: Ensure no position is overloaded with weak players
  balanceWeakDistribution(positions, thresholds, formation, result, debugLog);
  
  return result;
}

/**
 * Helper: Check if a swap between two players would be beneficial
 */
function isSwapBeneficial(
  player1: TeamAssignment,
  position1: PositionType,
  player2: TeamAssignment, 
  position2: PositionType,
  thresholds: DynamicThresholds
): { beneficial: boolean; reason: string } {
  // Get percentile ranks for both players
  const p1Attack = player1.attack_rating ?? 5;
  const p1Defense = player1.defense_rating ?? 5;
  const p2Attack = player2.attack_rating ?? 5;
  const p2Defense = player2.defense_rating ?? 5;
  
  const totalPlayers = thresholds.allPlayers.length;
  
  // Calculate percentiles (0-100, higher is better)
  const p1AttackPercentile = ((thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) < p1Attack).length) / totalPlayers) * 100;
  const p1DefensePercentile = ((thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) < p1Defense).length) / totalPlayers) * 100;
  const p2AttackPercentile = ((thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) < p2Attack).length) / totalPlayers) * 100;
  const p2DefensePercentile = ((thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) < p2Defense).length) / totalPlayers) * 100;
  
  // Check position requirements using dynamic thresholds
  const position1Requirements: Record<string, number> = {
    'ST': 50,   // Need top 50% attack
    'CDM': 40,  // Need top 60% defense (40th percentile)
    'DEF': 50,  // Need top 50% defense
  };
  
  const position2Requirements: Record<string, number> = {
    'ST': 50,
    'CDM': 40, 
    'DEF': 50,
  };
  
  // Check if player2 meets requirements for position1
  let p2MeetsPos1 = true;
  if (position1 === 'ST' && p2AttackPercentile < position1Requirements['ST']) {
    p2MeetsPos1 = false;
  } else if (position1 === 'CDM' && p2DefensePercentile < position1Requirements['CDM']) {
    p2MeetsPos1 = false;
  } else if (position1 === 'DEF' && p2DefensePercentile < position1Requirements['DEF']) {
    p2MeetsPos1 = false;
  }
  
  // Check if player1 meets requirements for position2
  let p1MeetsPos2 = true;
  if (position2 === 'ST' && p1AttackPercentile < position2Requirements['ST']) {
    p1MeetsPos2 = false;
  } else if (position2 === 'CDM' && p1DefensePercentile < position2Requirements['CDM']) {
    p1MeetsPos2 = false;
  } else if (position2 === 'DEF' && p1DefensePercentile < position2Requirements['DEF']) {
    p1MeetsPos2 = false;
  }
  
  // Don't swap if either player fails requirements
  if (!p2MeetsPos1) {
    return { 
      beneficial: false, 
      reason: `Player2 doesn't meet ${position1} requirements (ATK:${p2AttackPercentile.toFixed(0)}%, DEF:${p2DefensePercentile.toFixed(0)}%)`
    };
  }
  
  if (!p1MeetsPos2) {
    return { 
      beneficial: false, 
      reason: `Player1 doesn't meet ${position2} requirements (ATK:${p1AttackPercentile.toFixed(0)}%, DEF:${p1DefensePercentile.toFixed(0)}%)`
    };
  }
  
  // Check if swap improves fit (player2 better for position1 than player1, and vice versa)
  const p1ScoreInPos1 = calculatePositionScore(player1, position1);
  const p2ScoreInPos1 = calculatePositionScore(player2, position1);
  const p1ScoreInPos2 = calculatePositionScore(player1, position2);
  const p2ScoreInPos2 = calculatePositionScore(player2, position2);
  
  const improvement = (p2ScoreInPos1 - p1ScoreInPos1) + (p1ScoreInPos2 - p2ScoreInPos2);
  
  if (improvement > 0.5) { // Require meaningful improvement
    return { 
      beneficial: true, 
      reason: `Swap improves total fit by ${improvement.toFixed(1)}`
    };
  }
  
  return { 
    beneficial: false, 
    reason: `Insufficient improvement (${improvement.toFixed(1)})`
  };
}

/**
 * Helper: Optimize weak players and fix obvious mismatches in critical positions
 */
function optimizeWeakPlayersInCritical(
  positions: FormationSuggestion['positions'],
  thresholds: DynamicThresholds,
  result: OptimizationResult,
  debugLog?: FormationDebugLog
): void {
  // Critical positions that shouldn't have weak or mismatched players
  const criticalPositions: PositionType[] = ['ST', 'CDM', 'DEF'];
  const safePlaces: PositionType[] = ['W', 'CM'];
  
  for (const criticalPos of criticalPositions) {
    const playersInPosition = positions[criticalPos];
    
    for (let i = 0; i < playersInPosition.length; i++) {
      const player = playersInPosition[i];
      const playerClassification = classifyPlayer(player.player, thresholds);
      const playerType = playerClassification.type;
      
      // Check if this is a weak/below average player in critical position
      const isProblematic = [PlayerType.WEAK_PLAYER, PlayerType.BELOW_AVERAGE].includes(playerType);
      const attack = player.player.attack_rating ?? 5;
      const defense = player.player.defense_rating ?? 5;
      const overall = (attack + defense + (player.player.game_iq_rating ?? 5)) / 3;
      
      // Check for mismatches using relative rankings
      const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
      const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
      const totalPlayers = thresholds.allPlayers.length;
      
      // Enhanced mismatch detection - catches players like Jimmy (8 ATK, 4 DEF) in defense
      const isMismatched = 
        (criticalPos === 'ST' && attackRank > totalPlayers * 0.5) || // Striker in bottom 50% for attack
        (criticalPos === 'CDM' && defenseRank > totalPlayers * 0.6) || // CDM in bottom 40% for defense
        (criticalPos === 'DEF' && defenseRank > totalPlayers * 0.5) || // Defender in bottom 50% for defense
        (criticalPos === 'DEF' && attack > defense + 2.0) || // Defender much better at attacking (like Jimmy)
        (criticalPos === 'ST' && defense > attack + 2.0) || // Striker much better at defending (like Alex E)
        (criticalPos === 'DEF' && attack > 7 && defense < 5) || // High attack, low defense in DEF position
        (criticalPos === 'ST' && defense > 7 && attack < 5) || // High defense, low attack in ST position
        (overall <= thresholds.overallDist.percentiles.p10); // Bottom 10% player overall
      
      if (isProblematic || isMismatched) {
        // Try to find a better replacement from safer positions
        for (const safePos of safePlaces) {
          const safePositionPlayers = positions[safePos];
          
          for (let j = 0; j < safePositionPlayers.length; j++) {
            const candidate = safePositionPlayers[j];
            const candidateClassification = classifyPlayer(candidate.player, thresholds);
            const candidateType = candidateClassification.type;
            
            // Use the new validation function to check both sides of the swap
            const swapCheck = isSwapBeneficial(
              player.player, 
              criticalPos,
              candidate.player, 
              safePos,
              thresholds
            );
            
            if (swapCheck.beneficial && 
                ![PlayerType.WEAK_PLAYER, PlayerType.VERY_WEAK_PLAYER, PlayerType.UNPLAYABLE].includes(candidateType)) {
              // Perform the swap
              const tempPlayer = playersInPosition[i].player;
              playersInPosition[i] = {
                ...playersInPosition[i],
                player: candidate.player,
                score: calculatePositionScore(candidate.player, criticalPos)
              };
              safePositionPlayers[j] = {
                ...safePositionPlayers[j],
                player: tempPlayer,
                score: calculatePositionScore(tempPlayer, safePos)
              };
              
              result.changed = true;
              result.rationale.push(
                `SWAP: ${tempPlayer.friendly_name} (${criticalPos}) ↔ ${candidate.player.friendly_name} (${safePos}) - ${swapCheck.reason}`
              );
              
              if (debugLog) {
                debugLog.optimizations.push({
                  type: 'CRITICAL_POSITION_SWAP',
                  from: { player: tempPlayer.friendly_name, position: criticalPos },
                  to: { player: candidate.player.friendly_name, position: safePos },
                  reason: swapCheck.reason
                });
              }
              
              // Only do one swap per position to avoid over-optimization
              break;
            }
          }
        }
      }
    }
  }
}

/**
 * Helper: Balance weak player distribution across positions
 */
function balanceWeakDistribution(
  positions: FormationSuggestion['positions'],
  thresholds: DynamicThresholds,
  _formation: FormationTemplate,
  result: OptimizationResult,
  _debugLog?: FormationDebugLog
): void {
  // Count weak players per position
  const weakCounts: Record<PositionType, number> = {
    DEF: 0, W: 0, CDM: 0, CM: 0, CAM: 0, ST: 0
  };
  
  Object.entries(positions).forEach(([pos, players]) => {
    const position = pos as PositionType;
    players.forEach(p => {
      const classification = classifyPlayer(p.player, thresholds);
      if ([PlayerType.WEAK_PLAYER, PlayerType.VERY_WEAK_PLAYER, PlayerType.UNPLAYABLE].includes(classification.type)) {
        weakCounts[position]++;
      }
    });
  });
  
  // If any position has too many weak players, try to redistribute
  Object.entries(weakCounts).forEach(([pos, count]) => {
    const position = pos as PositionType;
    const maxWeak = position === 'W' ? 999 : (position === 'CM' ? 2 : 1);
    
    if (count > maxWeak) {
      result.rationale.push(`WARNING: ${position} has ${count} weak players (max: ${maxWeak})`);
    }
  });
}

/**
 * Calculate balance score for the formation
 */
function calculateBalanceScore(
  positions: FormationSuggestion['positions']
): FormationSuggestion['balanceScore'] {
  const calculateAreaScore = (players: PlayerPositionAssignment[]) => {
    if (players.length === 0) return 0;
    return players.reduce((sum, p) => sum + p.score, 0) / players.length;
  };
  
  const defense = calculateAreaScore([...positions.DEF, ...positions.W]);
  const midfield = calculateAreaScore([...positions.CDM, ...positions.CM, ...positions.CAM]);
  const attack = calculateAreaScore(positions.ST);
  const overall = (defense + midfield + attack) / 3;
  
  return { defense, midfield, attack, overall };
}

/**
 * Determine confidence level of the formation suggestion
 */
function determineConfidence(
  positions: FormationSuggestion['positions'],
  formation: FormationTemplate,
  assignedCount: number,
  totalCount: number
): 'high' | 'medium' | 'low' {
  // Check if all positions are filled
  const allPositionsFilled = 
    positions.DEF.length === formation.positions.DEF &&
    positions.W.length === formation.positions.W &&
    positions.CDM.length === formation.positions.CDM &&
    positions.CM.length === formation.positions.CM &&
    positions.CAM.length === formation.positions.CAM &&
    positions.ST.length === formation.positions.ST;
  
  // Check assignment rate
  const assignmentRate = assignedCount / totalCount;
  
  // Check balance
  const balanceScore = calculateBalanceScore(positions);
  const balanceAverage = balanceScore.overall;
  
  // Count specialists and high Game IQ players assigned to appropriate positions
  // const allPlayers = Object.values(positions).flat();
  // const specialistsInPosition = allPlayers.filter(p => p.isSpecialist).length;
  // const totalSpecialists = allPlayers.length > 0 ? specialistsInPosition / allPlayers.length : 0; // For future use
  
  // More lenient confidence scoring
  if (allPositionsFilled && assignmentRate === 1 && balanceAverage >= 5.5) {
    return 'high';
  } else if (allPositionsFilled && assignmentRate === 1 && balanceAverage >= 4.5) {
    return 'medium';
  } else if (assignmentRate >= 0.8 && balanceAverage >= 4) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Main function to suggest formations for both teams
 */
export function suggestFormations(
  blueTeam: TeamAssignment[],
  orangeTeam: TeamAssignment[]
): FormationResult {
  // Calculate thresholds for both teams combined for consistency
  const allPlayers = [...blueTeam, ...orangeTeam];
  const thresholds = calculateDynamicThresholds(allPlayers);
  
  // Select adaptive formations based on team composition
  const blueFormationResult = selectAdaptiveFormation(blueTeam, thresholds);
  const orangeFormationResult = selectAdaptiveFormation(orangeTeam, thresholds);
  
  const blueResult = assignPlayersToPositions(blueTeam, blueFormationResult.formation);
  const orangeResult = assignPlayersToPositions(orangeTeam, orangeFormationResult.formation);
  
  const formationNotes: string[] = [];
  
  // Add note about rotating keeper
  formationNotes.push(`Note: Teams have ${blueTeam.length} players with rotating keeper. Formations show ${blueTeam.length - 1} outfield positions.`);
  formationNotes.push(`One player rotates to goal every few minutes, so positions may show extra players.`);
  
  // Add formation selection reasoning
  formationNotes.push(`Blue: ${blueFormationResult.reasoning}`);
  formationNotes.push(`Orange: ${orangeFormationResult.reasoning}`);
  
  // Add notes about team sizes
  if (blueTeam.length !== orangeTeam.length) {
    formationNotes.push(`Teams have different sizes: Blue (${blueTeam.length}) vs Orange (${orangeTeam.length})`);
  }
  
  // Add notes about confidence
  if (blueResult.confidence === 'low' || orangeResult.confidence === 'low') {
    formationNotes.push('Formation confidence may be lower due to skill distribution across positions');
  } else if (blueResult.confidence === 'high' && orangeResult.confidence === 'high') {
    formationNotes.push('High confidence in formation suggestions based on player skills');
  }
  
  // Add notes about specialists
  const blueSpecialists = Object.values(blueResult.positions)
    .flat()
    .filter(p => p.isSpecialist).length;
  const orangeSpecialists = Object.values(orangeResult.positions)
    .flat()
    .filter(p => p.isSpecialist).length;
  
  if (blueSpecialists > 0 || orangeSpecialists > 0) {
    formationNotes.push(`Identified specialists: Blue (${blueSpecialists}), Orange (${orangeSpecialists})`);
  }
  
  return {
    blueFormation: blueResult,
    orangeFormation: orangeResult,
    formationNotes,
    debugLog: (blueResult.debugLog || orangeResult.debugLog) ? {
      blue: blueResult.debugLog!,
      orange: orangeResult.debugLog!
    } : undefined
  };
}

/**
 * Export position display names for UI
 */
export const POSITION_DISPLAY_NAMES: Record<PositionType, string> = {
  DEF: 'Defense',
  W: 'Winger',
  CDM: 'Defensive Midfield',
  CM: 'Central Midfield',
  CAM: 'Attacking Midfield',
  ST: 'Striker/Forward'
};

/**
 * Export position colors for UI (Tailwind classes)
 */
export const POSITION_COLORS: Record<PositionType, string> = {
  DEF: 'bg-red-100 text-red-800 border-red-300',
  W: 'bg-purple-100 text-purple-800 border-purple-300',
  CDM: 'bg-orange-100 text-orange-800 border-orange-300',
  CM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CAM: 'bg-green-100 text-green-800 border-green-300',
  ST: 'bg-blue-100 text-blue-800 border-blue-300'
};