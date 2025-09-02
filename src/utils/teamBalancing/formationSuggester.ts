import {
  TeamAssignment,
  PositionType,
  PositionWeights,
  PlayerPositionAssignment,
  FormationTemplate,
  FormationSuggestion,
  FormationResult
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

/**
 * Support index for positions (higher = more support from teammates)
 */
const POSITION_SUPPORT: Record<PositionType, number> = {
  DEF: 3,  // Lots of nearby teammates
  W: 2,    // Some isolation but manageable
  CDM: 1,  // Critical position, less support
  CM: 3,   // Surrounded by teammates
  CAM: 2,  // Some support
  ST: 1    // Most isolated position
};

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
  ST: { attack: 40 },        // Striker should be in top 60% for attack
  DEF: { defense: 40 },       // Defender should be in top 60% for defense  
  CDM: { defense: 30 },       // CDM should be in top 70% for defense
  CAM: { attack: 30, gameIq: 40 }, // CAM needs decent attack and IQ
  // W and CM have no strict requirements - most flexible
};

/**
 * Available formation templates based on team size
 */
const FORMATION_TEMPLATES: FormationTemplate[] = [
  // 8v8 formations (all outfield players)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 2, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 2 },
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 0, CM: 3, CAM: 0, ST: 2 },
    minPlayers: 8,
    maxPlayers: 8
  },
  // 9v9 formations (all outfield players) - balanced and realistic
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 2 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 2 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 2, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 9,
    maxPlayers: 9
  },
  // 10v10 formations (all outfield players)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 2 },
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 2 },
    minPlayers: 10,
    maxPlayers: 10
  },
  // 11v11 formations (all outfield players)
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 11,
    maxPlayers: 11
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 4, W: 2, CDM: 2, CM: 1, CAM: 0, ST: 2 },
    minPlayers: 11,
    maxPlayers: 11
  },
  {
    name: '',  // Will be generated dynamically
    positions: { DEF: 3, W: 2, CDM: 2, CM: 2, CAM: 0, ST: 2 },
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
  SPECIALIST_ATK = 'SPECIALIST_ATK',
  SPECIALIST_DEF = 'SPECIALIST_DEF',
  PLAYMAKER = 'PLAYMAKER',
  BALANCED_STRONG = 'BALANCED_STRONG',
  BALANCED_AVERAGE = 'BALANCED_AVERAGE',
  WEAK_PLAYER = 'WEAK_PLAYER',
  TWEENER = 'TWEENER'
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
): PlayerType {
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;
  const overall = (attack + defense + gameIq) / 3;
  
  // Check for weak player - bottom 25% overall
  if (overall <= thresholds.overallDist.percentiles.p25) {
    return PlayerType.WEAK_PLAYER;
  }
  
  // Calculate player ranks (0 = best player)
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
  
  // Calculate relative strengths (z-scores)
  const attackZ = (attack - thresholds.attackDist.mean) / (thresholds.attackDist.stdDev || 1);
  const defenseZ = (defense - thresholds.defenseDist.mean) / (thresholds.defenseDist.stdDev || 1);
  const iqZ = (gameIq - thresholds.gameIqDist.mean) / (thresholds.gameIqDist.stdDev || 1);
  
  // Use BOTH rank and z-score for specialist detection
  // If top ranked, require smaller gap (0.75); if not top ranked, require larger gap (1.0)
  const requiredGap = (stat: 'attack' | 'defense' | 'iq') => {
    if (stat === 'attack' && isTopRankAttack) return 0.75;
    if (stat === 'defense' && isTopRankDefense) return 0.75;
    if (stat === 'iq' && isTopRankIq) return 0.75;
    return 1.0;
  };
  
  // Specialist if one stat is significantly higher than others
  if ((isTopAttack || isTopRankAttack) && 
      attackZ > defenseZ + requiredGap('attack') && 
      attackZ > iqZ + requiredGap('attack')) {
    return PlayerType.SPECIALIST_ATK;
  }
  if ((isTopDefense || isTopRankDefense) && 
      defenseZ > attackZ + requiredGap('defense') && 
      defenseZ > iqZ + requiredGap('defense')) {
    return PlayerType.SPECIALIST_DEF;
  }
  if ((isTopIq || isTopRankIq) && 
      iqZ > attackZ + requiredGap('iq') && 
      iqZ > defenseZ + requiredGap('iq')) {
    return PlayerType.PLAYMAKER;
  }
  
  // Check for balanced players - low variance in z-scores
  const maxZ = Math.max(attackZ, defenseZ, iqZ);
  const minZ = Math.min(attackZ, defenseZ, iqZ);
  const varianceZ = maxZ - minZ;
  
  if (varianceZ <= 0.75) {  // Balanced if z-scores are within 0.75 std dev
    if (overall >= thresholds.overallDist.percentiles.p75) {
      return PlayerType.BALANCED_STRONG;
    } else if (overall >= thresholds.overallDist.percentiles.p50) {
      return PlayerType.BALANCED_AVERAGE;
    }
  }
  
  // Default to tweener
  return PlayerType.TWEENER;
}

/**
 * Check if a player is suitable for a position based on dynamic requirements
 */
function isPositionSuitable(
  player: TeamAssignment, 
  position: PositionType,
  thresholds: DynamicThresholds
): boolean {
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;
  
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
        return false;
      }
    }
    if (requirements.defense !== undefined && defensePercentile < requirements.defense) {
      // Exception: If this is one of the best defenders available (top 3), allow for DEF
      const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
      if (position === 'DEF' && defenseRank < 3) {
        // One of top 3 defenders, allow it
      } else {
        return false;
      }
    }
    if (requirements.gameIq !== undefined && iqPercentile < requirements.gameIq) {
      return false;
    }
  }
  
  // Special check: Is this player better suited for attack or defense?
  // This helps prevent Phil R (6.3 ATK, 5.2 DEF) from playing defense
  if (position === 'DEF' && attack > defense + 0.5) {
    // Player is notably better at attacking than defending
    // Only allow if they're one of the best defenders available
    const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
    if (defenseRank >= 5) { // Not in top 5 defenders
      return false;
    }
  }
  
  if (position === 'ST' && defense > attack + 0.5) {
    // Player is notably better at defending than attacking
    // Only allow if they're one of the best attackers available
    const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
    if (attackRank >= 5) { // Not in top 5 attackers
      return false;
    }
  }
  
  // Flexible positions (W, CM) accept anyone
  return true;
}

/**
 * Check if a player is suitable for wingers using dynamic thresholds
 */
function isGoodWinger(
  player: TeamAssignment,
  type: PlayerType,
  thresholds: DynamicThresholds
): boolean {
  // Good wingers are balanced average players or tweeners
  if (type === PlayerType.BALANCED_AVERAGE || type === PlayerType.TWEENER) {
    const attack = player.attack_rating ?? 5;
    const defense = player.defense_rating ?? 5;
    const gameIq = player.game_iq_rating ?? 5;
    
    // Not too high IQ (save for central positions) - below 75th percentile
    // Reasonable attack and defense - between 25th and 75th percentiles
    return gameIq <= thresholds.gameIqDist.percentiles.p75 && 
           attack >= thresholds.attackDist.percentiles.p25 && 
           attack <= thresholds.attackDist.percentiles.p75 && 
           defense >= thresholds.defenseDist.percentiles.p10;
  }
  
  return false;
}

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
 * Select the best formation template for the team size
 */
function selectFormation(teamSize: number): FormationTemplate {
  const validFormations = FORMATION_TEMPLATES.filter(
    f => teamSize >= f.minPlayers && teamSize <= f.maxPlayers
  );
  
  if (validFormations.length === 0) {
    // Default to a balanced formation if no exact match
    const positions = {
      DEF: Math.floor(teamSize * 0.35),
      W: Math.floor(teamSize * 0.15),
      CDM: 1,
      CM: Math.floor(teamSize * 0.2),
      CAM: 0,
      ST: 0
    };
    positions.ST = teamSize - positions.DEF - positions.W - positions.CDM - positions.CM - positions.CAM;
    
    return {
      name: generateFormationName(positions),
      positions,
      minPlayers: teamSize,
      maxPlayers: teamSize
    };
  }
  
  // Update formation names to be accurate
  const formation = validFormations[0];
  formation.name = generateFormationName(formation.positions);
  return formation;
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
 * GLOBAL OPTIMIZATION ASSIGNMENT ALGORITHM
 * Considers all players for all positions before making assignments
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
  
  // Calculate dynamic thresholds based on current player pool
  const thresholds = calculateDynamicThresholds(team);
  
  // Classify all players
  const playerClassifications = new Map<string, PlayerType>();
  team.forEach(player => {
    playerClassifications.set(player.player_id, classifyPlayer(player, thresholds));
  });
  
  // Create a priority score matrix for ALL players and ALL positions
  interface Assignment {
    player: TeamAssignment;
    position: PositionType;
    baseScore: number;
    adjustedScore: number;
    suitable: boolean;
    priority: number; // Higher = should be assigned first
  }
  
  const allAssignments: Assignment[] = [];
  const positionTypes: PositionType[] = ['DEF', 'W', 'CDM', 'CM', 'CAM', 'ST'];
  
  // Calculate scores for all player-position combinations
  for (const player of team) {
    const playerType = playerClassifications.get(player.player_id)!;
    
    for (const position of positionTypes) {
      const baseScore = calculatePositionScore(player, position);
      const suitable = isPositionSuitable(player, position, thresholds);
      
      let adjustedScore = baseScore;
      let priority = 0;
      
      // Apply bonuses/penalties based on player type and position match
      if (playerType === PlayerType.SPECIALIST_ATK) {
        if (position === 'ST') {
          adjustedScore *= 1.5;  // Big bonus for specialists in right position
          priority = 100;        // Highest priority
        } else if (position === 'CAM' || position === 'W') {
          adjustedScore *= 1.2;
          priority = 80;
        } else if (position === 'DEF' || position === 'CDM') {
          adjustedScore *= 0.5;  // Penalty for wrong position
          priority = -50;
        }
      } else if (playerType === PlayerType.SPECIALIST_DEF) {
        if (position === 'DEF') {
          adjustedScore *= 1.5;
          priority = 100;
        } else if (position === 'CDM') {
          adjustedScore *= 1.2;
          priority = 80;
        } else if (position === 'ST' || position === 'CAM') {
          adjustedScore *= 0.5;
          priority = -50;
        }
      } else if (playerType === PlayerType.PLAYMAKER) {
        if (position === 'CAM' || position === 'CM') {
          adjustedScore *= 1.3;
          priority = 90;
        } else if (position === 'CDM') {
          adjustedScore *= 1.1;
          priority = 70;
        }
      } else if (playerType === PlayerType.BALANCED_STRONG) {
        if (position === 'CM' || position === 'CDM') {
          adjustedScore *= 1.2;
          priority = 60;
        }
      } else if (playerType === PlayerType.WEAK_PLAYER) {
        // Weak players get penalties for critical positions
        if (POSITION_CRITICALITY[position] >= 2) {
          adjustedScore *= 0.3;
          priority = -100;
        } else if (position === 'W' || position === 'CM') {
          priority = 10; // Acceptable positions for weak players
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
        priority
      });
    }
  }
  
  // Sort assignments by priority (highest first), then by adjusted score
  allAssignments.sort((a, b) => {
    if (Math.abs(a.priority - b.priority) > 10) {
      return b.priority - a.priority;
    }
    return b.adjustedScore - a.adjustedScore;
  });
  
  // Assign players using the sorted priority list
  const assignedPlayers = new Set<string>();
  const positionCounts: Record<PositionType, number> = {
    DEF: 0, W: 0, CDM: 0, CM: 0, CAM: 0, ST: 0
  };
  
  for (const assignment of allAssignments) {
    // Skip if player already assigned
    if (assignedPlayers.has(assignment.player.player_id)) continue;
    
    // Skip if position is full
    if (positionCounts[assignment.position] >= formation.positions[assignment.position]) continue;
    
    // Assign the player
    positions[assignment.position].push({
      player: assignment.player,
      position: assignment.position,
      score: assignment.baseScore,
      isSpecialist: assignment.priority >= 80,
      alternativePositions: calculateAlternativePositions(assignment.player)
    });
    
    assignedPlayers.add(assignment.player.player_id);
    positionCounts[assignment.position]++;
    
    // Add to rationale
    const playerType = playerClassifications.get(assignment.player.player_id)!;
    if (assignment.priority >= 80) {
      rationale.push(`${assignment.player.friendly_name} → ${assignment.position} (${playerType}, priority: ${assignment.priority})`);
    } else {
      rationale.push(`${assignment.player.friendly_name} → ${assignment.position}`);
    }
  }
  
  // Apply post-assignment optimization
  optimizeAssignments(positions, thresholds, rationale);
  
  // Calculate balance scores
  const balanceScore = calculateBalanceScore(positions);
  
  // Determine confidence level
  const confidence = determineConfidence(positions, formation, assignedPlayers.size, team.length);
  
  return {
    formation: formation.name,
    positions,
    confidence,
    rationale,
    balanceScore
  };
}


/**
 * Optimize assignments by swapping weak players out of critical positions
 */
function optimizeAssignments(
  positions: FormationSuggestion['positions'],
  thresholds: DynamicThresholds,
  rationale: string[]
): void {
  // Critical positions that shouldn't have weak players
  const criticalPositions: PositionType[] = ['ST', 'CDM', 'DEF']; // Added DEF to check for bad defenders
  const safePlaces: PositionType[] = ['W', 'CM'];
  
  for (const criticalPos of criticalPositions) {
    const playersInPosition = positions[criticalPos];
    
    for (let i = 0; i < playersInPosition.length; i++) {
      const player = playersInPosition[i];
      const playerType = classifyPlayer(player.player, thresholds);
      
      // Check if this is a weak player or inappropriate for the position
      const isWeak = playerType === PlayerType.WEAK_PLAYER;
      const attack = player.player.attack_rating ?? 5;
      const defense = player.player.defense_rating ?? 5;
      const overall = (attack + defense + (player.player.game_iq_rating ?? 5)) / 3;
      
      // Check for mismatches using relative rankings
      const attackRank = thresholds.allPlayers.filter(p => (p.attack_rating ?? 5) > attack).length;
      const defenseRank = thresholds.allPlayers.filter(p => (p.defense_rating ?? 5) > defense).length;
      const totalPlayers = thresholds.allPlayers.length;
      
      // A player is mismatched if they're in the wrong half of the distribution for their position
      const isMismatched = 
        (criticalPos === 'ST' && attackRank > totalPlayers * 0.6) || // Striker in bottom 40% for attack
        (criticalPos === 'CDM' && defenseRank > totalPlayers * 0.7) || // CDM in bottom 30% for defense
        (criticalPos === 'DEF' && defenseRank > totalPlayers * 0.6) || // Defender in bottom 40% for defense
        (criticalPos === 'DEF' && attack > defense + 1.0) || // Defender who's much better at attacking
        (criticalPos === 'ST' && defense > attack + 1.0) || // Striker who's much better at defending
        (overall <= thresholds.overallDist.percentiles.p10); // Bottom 10% player overall
      
      if (isWeak || isMismatched) {
        // Try to find a better replacement from safer positions
        for (const safePos of safePlaces) {
          const safePositionPlayers = positions[safePos];
          
          for (let j = 0; j < safePositionPlayers.length; j++) {
            const candidate = safePositionPlayers[j];
            const candidateType = classifyPlayer(candidate.player, thresholds);
            const candidateAttack = candidate.player.attack_rating ?? 5;
            const candidateDefense = candidate.player.defense_rating ?? 5;
            
            // Check if candidate is better for critical position
            const candidateBetterForCritical = 
              (criticalPos === 'ST' && candidateAttack > attack + 1.0) ||
              (criticalPos === 'CDM' && candidateDefense > defense + 1.0) ||
              (criticalPos === 'DEF' && candidateDefense > defense + 1.0);
            
            // Ensure candidate meets relative requirements (top half for their position)
            const candidateAttackRank = thresholds.allPlayers.filter(p => 
              (p.attack_rating ?? 5) > candidateAttack).length;
            const candidateDefenseRank = thresholds.allPlayers.filter(p => 
              (p.defense_rating ?? 5) > candidateDefense).length;
            
            const candidateMeetsRequirements = 
              (criticalPos === 'ST' && candidateAttackRank < totalPlayers * 0.5) || // Top 50% attacker
              (criticalPos === 'CDM' && candidateDefenseRank < totalPlayers * 0.5) || // Top 50% defender
              (criticalPos === 'DEF' && candidateDefenseRank < totalPlayers * 0.5); // Top 50% defender
            
            if (candidateBetterForCritical && candidateMeetsRequirements && 
                candidateType !== PlayerType.WEAK_PLAYER) {
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
              
              rationale.push(
                `OPTIMIZATION: Swapped ${tempPlayer.friendly_name} (${criticalPos}) with ` +
                `${candidate.player.friendly_name} (${safePos}) to improve critical position`
              );
              
              // Only do one swap per position to avoid over-optimization
              break;
            }
          }
        }
      }
    }
  }
  
  // Special check: Never allow the absolute weakest player at striker
  const strikers = positions.ST;
  if (strikers.length > 0) {
    // Find the weakest striker
    let weakestStriker = strikers[0];
    let weakestIndex = 0;
    let weakestOverall = Number.MAX_VALUE;
    
    for (let i = 0; i < strikers.length; i++) {
      const overall = (
        (strikers[i].player.attack_rating ?? 5) +
        (strikers[i].player.defense_rating ?? 5) +
        (strikers[i].player.game_iq_rating ?? 5)
      ) / 3;
      
      if (overall < weakestOverall) {
        weakestOverall = overall;
        weakestStriker = strikers[i];
        weakestIndex = i;
      }
    }
    
    // Check if this is the weakest player in the entire team
    const allPlayers = Object.values(positions).flat();
    const isWeakestOverall = !allPlayers.some(p => {
      const pOverall = (
        (p.player.attack_rating ?? 5) +
        (p.player.defense_rating ?? 5) +
        (p.player.game_iq_rating ?? 5)
      ) / 3;
      return pOverall < weakestOverall;
    });
    
    if (isWeakestOverall && strikers.length > 0) {
      // Find ANY better player from non-critical positions
      const nonCriticalPositions: PositionType[] = ['W', 'CM', 'DEF'];
      let swapped = false;
      
      for (const pos of nonCriticalPositions) {
        if (swapped) break;
        
        for (let i = 0; i < positions[pos].length; i++) {
          const candidate = positions[pos][i];
          const candidateAttack = candidate.player.attack_rating ?? 5;
          
          if (candidateAttack > (weakestStriker.player.attack_rating ?? 5) + 0.5) {
            // Perform emergency swap
            const temp = strikers[weakestIndex].player;
            strikers[weakestIndex] = {
              ...strikers[weakestIndex],
              player: candidate.player,
              score: calculatePositionScore(candidate.player, 'ST')
            };
            positions[pos][i] = {
              ...positions[pos][i],
              player: temp,
              score: calculatePositionScore(temp, pos)
            };
            
            rationale.push(
              `EMERGENCY: Removed weakest player ${temp.friendly_name} from ST, ` +
              `replaced with ${candidate.player.friendly_name}`
            );
            swapped = true;
            break;
          }
        }
      }
    }
  }
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
  const allPlayers = Object.values(positions).flat();
  const specialistsInPosition = allPlayers.filter(p => p.isSpecialist).length;
  const totalSpecialists = allPlayers.length > 0 ? specialistsInPosition / allPlayers.length : 0;
  
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
  const blueFormation = selectFormation(blueTeam.length);
  const orangeFormation = selectFormation(orangeTeam.length);
  
  const blueResult = assignPlayersToPositions(blueTeam, blueFormation);
  const orangeResult = assignPlayersToPositions(orangeTeam, orangeFormation);
  
  const formationNotes: string[] = [];
  
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
    formationNotes
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