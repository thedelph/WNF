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
 * Enhanced position weight configurations using all 6 attributes
 * These weights determine how important each attribute is for a given position
 */
interface EnhancedPositionWeights extends PositionWeights {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

const ENHANCED_POSITION_WEIGHTS: Record<PositionType, EnhancedPositionWeights> = {
  ST: {
    attack: 0.10,
    defense: 0.02,
    gameIq: 0.08,
    shooting: 0.35,
    pace: 0.25,
    dribbling: 0.20,
    physical: 0.10,
    passing: 0.00,
    defending: 0.00
  },
  W: {
    attack: 0.08,
    defense: 0.05,
    gameIq: 0.07,
    pace: 0.35,
    dribbling: 0.30,
    passing: 0.20,
    shooting: 0.15,
    defending: 0.00,
    physical: 0.00
  },
  CAM: {
    attack: 0.08,
    defense: 0.02,
    gameIq: 0.10,
    passing: 0.35,
    dribbling: 0.25,
    shooting: 0.20,
    pace: 0.10,
    defending: 0.00,
    physical: 0.00
  },
  CM: {
    attack: 0.06,
    defense: 0.06,
    gameIq: 0.08,
    passing: 0.30,
    physical: 0.25,
    defending: 0.25,
    dribbling: 0.10,
    pace: 0.05,
    shooting: 0.05
  },
  CDM: {
    attack: 0.03,
    defense: 0.09,
    gameIq: 0.08,
    defending: 0.35,
    physical: 0.30,
    passing: 0.20,
    pace: 0.10,
    dribbling: 0.05,
    shooting: 0.00
  },
  DEF: {
    attack: 0.02,
    defense: 0.10,
    gameIq: 0.08,
    defending: 0.40,
    physical: 0.30,
    pace: 0.20,
    passing: 0.10,
    dribbling: 0.00,
    shooting: 0.00
  }
};

/**
 * Playstyle to ideal positions mapping
 */
const PLAYSTYLE_IDEAL_POSITIONS: Record<string, PositionType[]> = {
  // Attacking styles
  'Complete Forward': ['ST'],
  'Hunter': ['ST', 'W'],
  'Hawk': ['ST'],
  'Marksman': ['ST', 'CAM'],
  'Finisher': ['ST'],
  'Sniper': ['CAM', 'ST'],
  'Deadeye': ['CAM', 'CM'],
  'Speedster': ['W', 'ST'],

  // Midfield styles
  'Box-to-Box': ['CM', 'CDM'],
  'Engine': ['CM', 'W', 'CAM'],
  'Artist': ['CAM', 'CM'],
  'Architect': ['CDM', 'CM'],
  'Powerhouse': ['CDM', 'CM'],
  'Maestro': ['CAM'],
  'Catalyst': ['CM', 'W'],
  'Locomotive': ['CM', 'CDM'],
  'Enforcer': ['CDM', 'CM'],

  // Defensive styles
  'Complete Defender': ['DEF'],
  'Shadow': ['DEF', 'CDM'],
  'Anchor': ['DEF', 'CDM'],
  'Gladiator': ['DEF', 'W'],
  'Guardian': ['DEF', 'W'],
  'Sentinel': ['DEF', 'CDM'],
  'Backbone': ['CDM', 'DEF'],

  // Balanced/Versatile styles
  'Versatile': ['CM', 'W', 'CDM'] // Multiple high attributes - adaptable player
};

/**
 * Calculate statistics for player attributes
 */
interface AttributeStats {
  mean: number;
  stdDev: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

function calculateAttributeStats(values: number[]): AttributeStats {
  if (values.length === 0) {
    return {
      mean: 0.5,
      stdDev: 0.2,
      percentiles: { p25: 0.25, p50: 0.5, p75: 0.75, p90: 0.9 }
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;

  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    mean,
    stdDev: stdDev || 0.2, // Prevent zero std dev
    percentiles: {
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90)
    }
  };
}

/**
 * Calculate relative position requirements based on player pool
 */
interface RelativeRequirements {
  pace: AttributeStats;
  shooting: AttributeStats;
  passing: AttributeStats;
  dribbling: AttributeStats;
  defending: AttributeStats;
  physical: AttributeStats;
}

function calculateRelativeRequirements(players: TeamAssignment[]): RelativeRequirements {
  const attributes = {
    pace: [] as number[],
    shooting: [] as number[],
    passing: [] as number[],
    dribbling: [] as number[],
    defending: [] as number[],
    physical: [] as number[]
  };

  players.forEach(player => {
    if (player.derived_attributes) {
      attributes.pace.push(player.derived_attributes.pace);
      attributes.shooting.push(player.derived_attributes.shooting);
      attributes.passing.push(player.derived_attributes.passing);
      attributes.dribbling.push(player.derived_attributes.dribbling);
      attributes.defending.push(player.derived_attributes.defending);
      attributes.physical.push(player.derived_attributes.physical);
    }
  });

  return {
    pace: calculateAttributeStats(attributes.pace),
    shooting: calculateAttributeStats(attributes.shooting),
    passing: calculateAttributeStats(attributes.passing),
    dribbling: calculateAttributeStats(attributes.dribbling),
    defending: calculateAttributeStats(attributes.defending),
    physical: calculateAttributeStats(attributes.physical)
  };
}

/**
 * Check if a player meets relative requirements for a position
 */
function meetsRelativeRequirements(
  player: TeamAssignment,
  position: PositionType,
  requirements: RelativeRequirements
): { meets: boolean; penalty: number; reasons: string[] } {
  if (!player.derived_attributes) {
    return { meets: true, penalty: 0, reasons: [] }; // No penalty if no attributes
  }

  const attrs = player.derived_attributes;
  const weights = ENHANCED_POSITION_WEIGHTS[position];
  let penalty = 0;
  const reasons: string[] = [];

  // Check critical attributes for each position (those with weight > 0.25)
  const criticalChecks: Array<{ attr: keyof typeof attrs; weight: number; name: string }> = [];

  if (weights.pace > 0.25) criticalChecks.push({ attr: 'pace', weight: weights.pace, name: 'Pace' });
  if (weights.shooting > 0.25) criticalChecks.push({ attr: 'shooting', weight: weights.shooting, name: 'Shooting' });
  if (weights.passing > 0.25) criticalChecks.push({ attr: 'passing', weight: weights.passing, name: 'Passing' });
  if (weights.dribbling > 0.25) criticalChecks.push({ attr: 'dribbling', weight: weights.dribbling, name: 'Dribbling' });
  if (weights.defending > 0.25) criticalChecks.push({ attr: 'defending', weight: weights.defending, name: 'Defending' });
  if (weights.physical > 0.25) criticalChecks.push({ attr: 'physical', weight: weights.physical, name: 'Physical' });

  for (const check of criticalChecks) {
    const value = attrs[check.attr];
    const stats = requirements[check.attr];

    // If player is more than 1 std dev below mean in a critical attribute
    if (value < stats.mean - stats.stdDev) {
      penalty += check.weight * 2; // Double the weight as penalty
      reasons.push(`${check.name} too low (${value.toFixed(2)} vs avg ${stats.mean.toFixed(2)})`);
    }
    // If player is below 25th percentile in a critical attribute
    else if (value < stats.percentiles.p25) {
      penalty += check.weight;
      reasons.push(`Below average ${check.name}`);
    }
  }

  return {
    meets: penalty < 0.5, // Allow some flexibility
    penalty,
    reasons
  };
}

/**
 * Classify an attribute value as 'high', 'medium', or 'low' relative to the player pool
 */
function getRelativeClassification(value: number, stats: AttributeStats): 'high' | 'medium' | 'low' {
  // High: Above 75th percentile (top 25% of players)
  if (value >= stats.percentiles.p75) {
    return 'high';
  }

  // Low: Below 25th percentile (bottom 25% of players)
  if (value <= stats.percentiles.p25) {
    return 'low';
  }

  // Medium: Middle 50% of players
  return 'medium';
}

/**
 * Detect playstyle from attributes using relative comparisons to player pool
 */
function detectPlaystyleFromAttributes(
  attrs: NonNullable<TeamAssignment['derived_attributes']>,
  requirements: RelativeRequirements
): string | null {
  // Calculate relative classifications for this player
  const classifications = {
    pace: getRelativeClassification(attrs.pace, requirements.pace),
    shooting: getRelativeClassification(attrs.shooting, requirements.shooting),
    passing: getRelativeClassification(attrs.passing, requirements.passing),
    dribbling: getRelativeClassification(attrs.dribbling, requirements.dribbling),
    defending: getRelativeClassification(attrs.defending, requirements.defending),
    physical: getRelativeClassification(attrs.physical, requirements.physical)
  };

  // Complete players (most attributes are high relative to pool)
  const highCount = Object.values(classifications).filter(c => c === 'high').length;
  if (highCount >= 5) {
    return 'Complete Player';
  }

  // Extract boolean flags for readability
  const pace = classifications.pace !== 'low';
  const shooting = classifications.shooting !== 'low';
  const passing = classifications.passing !== 'low';
  const dribbling = classifications.dribbling !== 'low';
  const defending = classifications.defending !== 'low';
  const physical = classifications.physical !== 'low';

  const highPace = classifications.pace === 'high';
  const highShooting = classifications.shooting === 'high';
  const highPassing = classifications.passing === 'high';
  const highDribbling = classifications.dribbling === 'high';
  const highDefending = classifications.defending === 'high';
  const highPhysical = classifications.physical === 'high';

  // Attacking playstyles (prioritize high attributes)
  if (highPace && highShooting) return 'Hunter';
  if (pace && shooting && physical) return 'Hawk';
  if (highShooting && dribbling && physical) return 'Marksman';
  if (highShooting && physical && !pace) return 'Finisher';
  if (shooting && highDribbling && !physical) return 'Sniper';
  if (shooting && highPassing && !dribbling) return 'Deadeye';
  if (highPace && highDribbling && !shooting) return 'Speedster';

  // Midfield playstyles
  if (highPassing && highDribbling && !shooting) return 'Artist';
  if (pace && passing && dribbling && !defending) return 'Engine';
  if (highPassing && physical && !shooting) return 'Architect';
  if (highPassing && defending) return 'Powerhouse';
  if (shooting && passing && dribbling) return 'Maestro';
  if (highPace && passing && !dribbling) return 'Catalyst';
  if (pace && highPhysical && !passing) return 'Locomotive';
  if (dribbling && highPhysical && !pace) return 'Enforcer';

  // Defensive playstyles
  if (pace && highDefending && !shooting) return 'Shadow';
  if (pace && highDefending && physical) return 'Anchor';
  if (shooting && defending) return 'Gladiator';
  if (dribbling && highDefending && !shooting) return 'Guardian';
  if (highDefending && highPhysical && !pace) return 'Sentinel';
  if (passing && highDefending && physical) return 'Backbone';

  // Check for dominant single attribute (must be 'high' relative to pool)
  const highAttributes = Object.entries(classifications)
    .filter(([_, classification]) => classification === 'high')
    .map(([attr, _]) => attr);

  if (highAttributes.length === 1) {
    // Single dominant attribute
    const dominantAttr = highAttributes[0];
    switch (dominantAttr) {
      case 'pace': return 'Speedster';
      case 'shooting': return 'Finisher';
      case 'passing': return 'Artist';
      case 'dribbling': return 'Artist';
      case 'defending': return 'Sentinel';
      case 'physical': return 'Enforcer';
    }
  }

  // Multiple balanced high attributes - create a compound classification
  if (highAttributes.length >= 2) {
    if (highAttributes.includes('pace') && highAttributes.includes('physical')) {
      return 'Locomotive';
    }
    if (highAttributes.includes('passing') && highAttributes.includes('defending')) {
      return 'Powerhouse';
    }
    if (highAttributes.includes('pace') && highAttributes.includes('dribbling')) {
      return 'Speedster';
    }
    // Default for multiple high attributes
    return 'Versatile';
  }

  return null;
}

/**
 * Score formations based on how many natural fits they would have
 */
function scoreFormationFit(
  team: TeamAssignment[],
  formation: FormationTemplate,
  requirements: RelativeRequirements
): { score: number; naturalFits: number; details: string } {
  // Track which players naturally fit which positions
  const playerPositionFits = new Map<string, { natural: PositionType[], adequate: PositionType[] }>();
  const positionCandidates: Record<PositionType, { natural: string[], adequate: string[] }> = {
    DEF: { natural: [], adequate: [] },
    W: { natural: [], adequate: [] },
    CDM: { natural: [], adequate: [] },
    CM: { natural: [], adequate: [] },
    CAM: { natural: [], adequate: [] },
    ST: { natural: [], adequate: [] }
  };

  // Analyze each player's position suitability
  team.forEach(player => {
    const natural: PositionType[] = [];
    const adequate: PositionType[] = [];

    // Check playstyle-based natural positions
    const playstyle = player.derived_attributes ?
      detectPlaystyleFromAttributes(player.derived_attributes, requirements) : null;
    const idealPositions = playstyle ? PLAYSTYLE_IDEAL_POSITIONS[playstyle] || [] : [];

    // Check each position
    for (const position of Object.keys(ENHANCED_POSITION_WEIGHTS) as PositionType[]) {
      const check = meetsRelativeRequirements(player, position, requirements);

      if (idealPositions.includes(position)) {
        natural.push(position);
        positionCandidates[position].natural.push(player.player_id);
      } else if (check.meets) {
        adequate.push(position);
        positionCandidates[position].adequate.push(player.player_id);
      }
    }

    playerPositionFits.set(player.player_id, { natural, adequate });
  });

  // Score the formation
  let naturalFits = 0;
  let adequateFits = 0;
  let forcedFits = 0;
  let totalScore = 0;
  const positionBreakdown: string[] = [];

  for (const [position, requiredCount] of Object.entries(formation.positions) as [PositionType, number][]) {
    if (requiredCount === 0) continue;

    const candidates = positionCandidates[position];
    const naturalCount = candidates.natural.length;
    const adequateCount = candidates.adequate.length;
    const totalAvailable = naturalCount + adequateCount;

    if (naturalCount >= requiredCount) {
      // All positions can be filled naturally
      naturalFits += requiredCount;
      totalScore += requiredCount * 10;
      positionBreakdown.push(`${position}:✓${requiredCount}`);
    } else if (totalAvailable >= requiredCount) {
      // Mix of natural and adequate fits
      naturalFits += naturalCount;
      adequateFits += (requiredCount - naturalCount);
      totalScore += naturalCount * 10 + (requiredCount - naturalCount) * 5;
      positionBreakdown.push(`${position}:⚠${naturalCount}+${requiredCount - naturalCount}`);
    } else {
      // Some positions will need forced assignments
      naturalFits += naturalCount;
      adequateFits += adequateCount;
      forcedFits += (requiredCount - totalAvailable);
      totalScore += naturalCount * 10 + adequateCount * 5 - (requiredCount - totalAvailable) * 5;
      positionBreakdown.push(`${position}:✗${totalAvailable}/${requiredCount}`);
    }
  }

  // Bonus for flexibility (players who can cover multiple needed positions)
  let flexibilityBonus = 0;
  playerPositionFits.forEach((fits, playerId) => {
    const usableNatural = fits.natural.filter(p => formation.positions[p] > 0);
    const usableAdequate = fits.adequate.filter(p => formation.positions[p] > 0);
    if (usableNatural.length > 1) {
      flexibilityBonus += (usableNatural.length - 1) * 3;
    } else if (usableNatural.length + usableAdequate.length > 1) {
      flexibilityBonus += (usableNatural.length + usableAdequate.length - 1);
    }
  });
  totalScore += flexibilityBonus;

  const details = `N:${naturalFits} A:${adequateFits} F:${forcedFits} Flex:+${flexibilityBonus} [${positionBreakdown.join(' ')}]`;
  return {
    score: Math.max(0, totalScore),
    naturalFits,
    details
  };
}

/**
 * Select best formation based on player pool
 */
function selectBestFormation(
  team: TeamAssignment[],
  requirements: RelativeRequirements
): FormationTemplate {
  const outfieldCount = team.length - 1; // Account for rotating keeper

  const validFormations = FORMATION_TEMPLATES.filter(
    f => outfieldCount >= f.minPlayers && outfieldCount <= f.maxPlayers
  );

  if (validFormations.length === 0) {
    return {
      name: 'Custom',
      positions: {
        DEF: Math.floor(outfieldCount * 0.35),
        W: 0,
        CDM: 1,
        CM: Math.floor(outfieldCount * 0.35),
        CAM: 0,
        ST: Math.max(1, Math.ceil(outfieldCount * 0.15))
      },
      minPlayers: outfieldCount,
      maxPlayers: outfieldCount
    };
  }

  // Score each formation
  let bestFormation = validFormations[0];
  let bestScore = -1;
  let bestDetails = '';

  for (const formation of validFormations) {
    const { score, naturalFits, details } = scoreFormationFit(team, formation, requirements);

    if (score > bestScore) {
      bestScore = score;
      bestFormation = formation;
      bestDetails = details;
    }
  }

  console.log(`Selected formation ${bestFormation.name}: ${bestDetails}`);
  return bestFormation;
}

/**
 * Formation templates
 */
const FORMATION_TEMPLATES: FormationTemplate[] = [
  // 7 outfield (8 total with keeper)
  {
    name: '3-3-1',
    positions: { DEF: 3, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 1 },
    minPlayers: 7,
    maxPlayers: 7
  },
  {
    name: '2-2W-2-1',
    positions: { DEF: 2, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 1 },
    minPlayers: 7,
    maxPlayers: 7
  },
  {
    name: '3-2-1-1',
    positions: { DEF: 3, W: 0, CDM: 0, CM: 2, CAM: 1, ST: 1 },
    minPlayers: 7,
    maxPlayers: 7
  },

  // 8 outfield (9 total with keeper)
  {
    name: '4-3-1',
    positions: { DEF: 4, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 1 },
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '3-4-1',
    positions: { DEF: 3, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 1 },
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '3-2W-2-1',
    positions: { DEF: 3, W: 2, CDM: 1, CM: 1, CAM: 0, ST: 1 },
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '3-3-2',
    positions: { DEF: 3, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 8,
    maxPlayers: 8
  },
  {
    name: '3-2-1-2',
    positions: { DEF: 3, W: 0, CDM: 0, CM: 2, CAM: 1, ST: 2 },
    minPlayers: 8,
    maxPlayers: 8
  },

  // 9 outfield (10 total with keeper)
  {
    name: '4-4-1',
    positions: { DEF: 4, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 1 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '5-3-1',
    positions: { DEF: 5, W: 0, CDM: 0, CM: 3, CAM: 0, ST: 1 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '3-5-1',
    positions: { DEF: 3, W: 0, CDM: 1, CM: 4, CAM: 0, ST: 1 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '3-2W-3-1',
    positions: { DEF: 3, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 1 },
    minPlayers: 9,
    maxPlayers: 9
  },
  {
    name: '4-3-2',
    positions: { DEF: 4, W: 0, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 9,
    maxPlayers: 9
  },

  // 10 outfield (11 total with keeper)
  {
    name: '4-5-1',
    positions: { DEF: 4, W: 0, CDM: 1, CM: 4, CAM: 0, ST: 1 },
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '4-2W-3-1',
    positions: { DEF: 4, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 1 },
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '4-4-2',
    positions: { DEF: 4, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 2 },
    minPlayers: 10,
    maxPlayers: 10
  },
  {
    name: '3-2W-3-2',
    positions: { DEF: 3, W: 2, CDM: 1, CM: 2, CAM: 0, ST: 2 },
    minPlayers: 10,
    maxPlayers: 10
  },

  // 11 outfield (12 total with keeper)
  {
    name: '4-5-2',
    positions: { DEF: 4, W: 0, CDM: 2, CM: 3, CAM: 0, ST: 2 },
    minPlayers: 11,
    maxPlayers: 11
  },
  {
    name: '4-2W-3-1-1',
    positions: { DEF: 4, W: 2, CDM: 1, CM: 2, CAM: 1, ST: 1 },
    minPlayers: 11,
    maxPlayers: 11
  },
  {
    name: '5-4-2',
    positions: { DEF: 5, W: 0, CDM: 1, CM: 3, CAM: 0, ST: 2 },
    minPlayers: 11,
    maxPlayers: 11
  }
];

/**
 * Calculate position score with penalties
 */
function calculateEnhancedPositionScore(
  player: TeamAssignment,
  position: PositionType,
  requirements: RelativeRequirements
): number {
  const weights = ENHANCED_POSITION_WEIGHTS[position];
  let score = 0;
  let fromAttributes = 0;
  let fromRatings = 0;

  if (player.derived_attributes) {
    const attrs = player.derived_attributes;
    fromAttributes = (
      attrs.pace * weights.pace +
      attrs.shooting * weights.shooting +
      attrs.passing * weights.passing +
      attrs.dribbling * weights.dribbling +
      attrs.defending * weights.defending +
      attrs.physical * weights.physical
    ) * 10;

    // Apply penalty for not meeting requirements
    const reqCheck = meetsRelativeRequirements(player, position, requirements);
    if (!reqCheck.meets) {
      fromAttributes *= Math.max(0.2, 1 - reqCheck.penalty);
    }
  }

  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;

  fromRatings = (
    attack * weights.attack +
    defense * weights.defense +
    gameIq * weights.gameIq
  );

  if (player.derived_attributes) {
    score = fromAttributes * 0.7 + fromRatings * 0.3;
  } else {
    score = fromRatings;
  }

  return score;
}

/**
 * Determine if player is attacking, defensive, or balanced based on attributes
 */
function getPlayerType(
  player: TeamAssignment,
  requirements: RelativeRequirements
): 'attacking' | 'defensive' | 'balanced' {
  const attrs = player.derived_attributes;

  // Without attributes, use traditional ratings
  if (!attrs) {
    const attack = player.attack_rating || 0;
    const defense = player.defense_rating || 0;

    if (attack > defense + 1) return 'attacking';
    if (defense > attack + 1) return 'defensive';
    return 'balanced';
  }

  // Calculate attacking and defensive scores
  const attackingScore = (attrs.shooting || 0) + (attrs.pace || 0) + (attrs.dribbling || 0);
  const defensiveScore = (attrs.defending || 0) + (attrs.physical || 0);

  // Use relative thresholds
  if (attackingScore > defensiveScore * 1.3) return 'attacking';
  if (defensiveScore > attackingScore * 1.3) return 'defensive';
  return 'balanced';
}

/**
 * Try to optimize poor assignments through swapping
 */
function optimizeAssignments(
  positions: FormationSuggestion['positions'],
  team: TeamAssignment[],
  requirements: RelativeRequirements,
  debugLog: ConsolidatedFormationDebugLog,
  teamColor: 'blue' | 'orange'
): boolean {
  let improved = false;
  const swaps: Array<{ from: string; to: string; reason: string; improvement: number }> = [];

  // Find problematic assignments based on relative requirements
  const problems: Array<{
    player: TeamAssignment;
    position: PositionType;
    score: number;
    issues: string[];
    priority: number;
  }> = [];

  // Check all positions for poor assignments
  (Object.keys(positions) as PositionType[]).forEach(position => {
    positions[position].forEach(assignment => {
      const check = meetsRelativeRequirements(assignment.player, position, requirements);
      const weights = ENHANCED_POSITION_WEIGHTS[position];

      // Position priority (higher = more critical)
      const positionPriority: Record<PositionType, number> = {
        ST: 5, CAM: 4, CDM: 3, CM: 2, W: 2, DEF: 1
      };

      // Check for critical attribute mismatches
      const criticalIssues: string[] = [];
      const attrs = assignment.player.derived_attributes;

      if (weights.shooting > 0.3 && (attrs?.shooting || 0) < requirements.shooting.p25) {
        criticalIssues.push(`Low shooting (${(attrs?.shooting || 0).toFixed(2)} < ${requirements.shooting.p25.toFixed(2)})`);
      }
      if (weights.passing > 0.3 && (attrs?.passing || 0) < requirements.passing.p25) {
        criticalIssues.push(`Low passing (${(attrs?.passing || 0).toFixed(2)} < ${requirements.passing.p25.toFixed(2)})`);
      }
      if (weights.defending > 0.3 && (attrs?.defending || 0) < requirements.defending.p25) {
        criticalIssues.push(`Low defending (${(attrs?.defending || 0).toFixed(2)} < ${requirements.defending.p25.toFixed(2)})`);
      }
      if (weights.pace > 0.3 && (attrs?.pace || 0) < requirements.pace.p25) {
        criticalIssues.push(`Low pace (${(attrs?.pace || 0).toFixed(2)} < ${requirements.pace.p25.toFixed(2)})`);
      }

      // Recalculate score to ensure it's accurate
      const actualScore = calculateEnhancedPositionScore(assignment.player, position, requirements);

      // Flag problematic assignments
      if (!check.meets || actualScore < 4.0 || criticalIssues.length > 0) {
        problems.push({
          player: assignment.player,
          position,
          score: actualScore,
          issues: [...check.reasons, ...criticalIssues],
          priority: positionPriority[position] || 0
        });
      }
    });
  });

  // Sort problems by priority and severity
  problems.sort((a, b) => {
    // First by position priority
    if (a.priority !== b.priority) return b.priority - a.priority;
    // Then by score (lower = worse)
    return a.score - b.score;
  });

  // Track swapped players to avoid double swapping
  const swappedPlayers = new Set<string>();

  // Try to swap with better suited players
  for (const problem of problems) {
    if (swappedPlayers.has(problem.player.player_id)) continue;

    let bestSwap: {
      player: TeamAssignment;
      fromPosition: PositionType;
      improvement: number;
      details: string;
    } | null = null;
    let bestImprovement = 0;

    // Check all other positions for better swaps
    (Object.keys(positions) as PositionType[]).forEach(sourcePosition => {
      if (sourcePosition === problem.position) return; // Skip same position

      positions[sourcePosition].forEach(candidate => {
        if (swappedPlayers.has(candidate.player.player_id)) return;

        // Calculate improvement if we swap
        const problemPlayerNewScore = calculateEnhancedPositionScore(problem.player, sourcePosition, requirements);
        const candidateNewScore = calculateEnhancedPositionScore(candidate.player, problem.position, requirements);

        // Calculate current scores accurately
        const problemCurrentScore = problem.score;
        const candidateCurrentScore = calculateEnhancedPositionScore(candidate.player, sourcePosition, requirements);

        const currentTotal = problemCurrentScore + candidateCurrentScore;
        const swappedTotal = problemPlayerNewScore + candidateNewScore;
        const improvement = swappedTotal - currentTotal;

        // Check if candidate actually meets requirements better
        const candidateCheck = meetsRelativeRequirements(candidate.player, problem.position, requirements);
        const problemCheck = meetsRelativeRequirements(problem.player, sourcePosition, requirements);

        // Get player types for hierarchy check
        const problemPlayerType = getPlayerType(problem.player, requirements);
        const candidatePlayerType = getPlayerType(candidate.player, requirements);

        // Position hierarchy (attacking to defensive)
        const positionHierarchy: Record<PositionType, number> = {
          ST: 6, CAM: 5, CM: 4, CDM: 3, W: 2, DEF: 1
        };

        // Don't move attacking players to significantly more defensive positions
        const problemCurrentLevel = positionHierarchy[problem.position];
        const problemNewLevel = positionHierarchy[sourcePosition];
        const candidateCurrentLevel = positionHierarchy[sourcePosition];
        const candidateNewLevel = positionHierarchy[problem.position];

        // Check for critical mismatch BEFORE hierarchy rules
        const isCriticalMismatch = problemCurrentScore < 2.0;

        // Block swaps that move players inappropriately down the hierarchy
        // EXCEPT for critical mismatches
        const maxLevelDrop = problemPlayerType === 'attacking' ? 1 : 2;
        const problemMovingDown = problemNewLevel < problemCurrentLevel - maxLevelDrop;

        const maxCandidateDrop = candidatePlayerType === 'attacking' ? 1 : 2;
        const candidateMovingDown = candidateNewLevel < candidateCurrentLevel - maxCandidateDrop;

        // Skip hierarchy check if fixing critical mismatch
        if (!isCriticalMismatch && (problemMovingDown || candidateMovingDown)) {
          return; // Block this swap UNLESS it's fixing a critical mismatch
        }

        // Additional validation for critical positions
        const candidateAttrs = candidate.player.derived_attributes;
        const problemAttrs = problem.player.derived_attributes;
        const targetWeights = ENHANCED_POSITION_WEIGHTS[problem.position];
        const sourceWeights = ENHANCED_POSITION_WEIGHTS[sourcePosition];

        // Check mutual benefit - both players should be better in their new positions
        if (candidateAttrs && problemAttrs) {
          // Calculate how well each player fits their target position
          const candidateTargetFit =
            (targetWeights.passing > 0.3 ? candidateAttrs.passing : 0) +
            (targetWeights.shooting > 0.3 ? candidateAttrs.shooting : 0) +
            (targetWeights.defending > 0.3 ? candidateAttrs.defending : 0) +
            (targetWeights.pace > 0.3 ? candidateAttrs.pace : 0);

          const problemCurrentFit =
            (targetWeights.passing > 0.3 ? problemAttrs.passing : 0) +
            (targetWeights.shooting > 0.3 ? problemAttrs.shooting : 0) +
            (targetWeights.defending > 0.3 ? problemAttrs.defending : 0) +
            (targetWeights.pace > 0.3 ? problemAttrs.pace : 0);

          // Calculate how well each player fits the source position
          const problemSourceFit =
            (sourceWeights.passing > 0.3 ? problemAttrs.passing : 0) +
            (sourceWeights.shooting > 0.3 ? problemAttrs.shooting : 0) +
            (sourceWeights.defending > 0.3 ? problemAttrs.defending : 0) +
            (sourceWeights.pace > 0.3 ? problemAttrs.pace : 0);

          const candidateCurrentFit =
            (sourceWeights.passing > 0.3 ? candidateAttrs.passing : 0) +
            (sourceWeights.shooting > 0.3 ? candidateAttrs.shooting : 0) +
            (sourceWeights.defending > 0.3 ? candidateAttrs.defending : 0) +
            (sourceWeights.pace > 0.3 ? candidateAttrs.pace : 0);

          // Only proceed if swap improves overall suitability or addresses critical gaps
          const currentTotalFit = problemCurrentFit + candidateCurrentFit;
          const swappedTotalFit = candidateTargetFit + problemSourceFit;

          // Allow swap if either:
          // 1. Overall suitability improves significantly (>10%)
          // 2. It fixes a critical mismatch (problem player has very poor fit)
          if (swappedTotalFit <= currentTotalFit * 1.1 && problemCurrentFit > 0.3) {
            return; // Skip this swap
          }
        }

        // Calculate improvements
        const problemPlayerImprovement = problemPlayerNewScore - problemCurrentScore;
        const candidateImprovement = candidateNewScore - candidateCurrentScore;
        const totalImprovement = problemPlayerImprovement + candidateImprovement;

        // Critical mismatch: Player terribly misplaced (already checked above)
        const isCriticalFix = problemCurrentScore < 2.0 && problemPlayerImprovement > 2.0;

        // Both benefit
        const bothBenefit = problemPlayerImprovement > 0.5 && candidateImprovement > -0.5;

        // Net positive with acceptable trade-off
        const acceptableTradeoff = totalImprovement > 2.0 && candidateNewScore > 3.0;

        const swapAllowed = isCriticalFix || bothBenefit || acceptableTradeoff;

        // For critical mismatches, be very lenient
        if (isCriticalFix && totalImprovement > 0 && candidateNewScore > 3.0) {
          if (totalImprovement > bestImprovement) {
            bestImprovement = totalImprovement;
            bestSwap = {
              player: candidate.player,
              fromPosition: sourcePosition,
              improvement: totalImprovement,
              details: `CRITICAL FIX: ${problem.player.friendly_name} ${problemCurrentScore.toFixed(1)}→${problemPlayerNewScore.toFixed(1)} (+${problemPlayerImprovement.toFixed(1)}), ${candidate.player.friendly_name} ${candidateCurrentScore.toFixed(1)}→${candidateNewScore.toFixed(1)} (${candidateImprovement > 0 ? '+' : ''}${candidateImprovement.toFixed(1)})`
            };
          }
        } else {
          // Standard swap evaluation for non-critical cases
          const candidateBetterFit = candidateNewScore > problemCurrentScore * 1.2;

          if (totalImprovement > bestImprovement &&
              totalImprovement > 1.0 &&
              swapAllowed &&
              candidateBetterFit) {
            bestImprovement = totalImprovement;
            bestSwap = {
              player: candidate.player,
              fromPosition: sourcePosition,
              improvement: totalImprovement,
              details: `Both benefit: ${problem.player.friendly_name} ${problemCurrentScore.toFixed(1)}→${problemPlayerNewScore.toFixed(1)} (+${problemPlayerImprovement.toFixed(1)}), ${candidate.player.friendly_name} ${candidateCurrentScore.toFixed(1)}→${candidateNewScore.toFixed(1)} (+${candidateImprovement.toFixed(1)})`
            };
          }
        }
      });
    });

    // Perform swap if improvement is meaningful (lower threshold for critical fixes)
    const isCriticalFix = bestSwap?.details?.includes('CRITICAL FIX');
    const minThreshold = isCriticalFix ? 0.5 : 1.5;

    if (bestSwap && bestImprovement > minThreshold) {
      // Perform the swap
      const sourceIndex = positions[bestSwap.fromPosition].findIndex(
        a => a.player.player_id === bestSwap.player.player_id
      );
      const targetIndex = positions[problem.position].findIndex(
        a => a.player.player_id === problem.player.player_id
      );

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Swap the players
        const temp = positions[bestSwap.fromPosition][sourceIndex];
        positions[bestSwap.fromPosition][sourceIndex] = {
          player: problem.player,
          position: bestSwap.fromPosition,
          score: calculateEnhancedPositionScore(problem.player, bestSwap.fromPosition, requirements),
          isSpecialist: false,
          alternativePositions: []
        };
        positions[problem.position][targetIndex] = {
          player: bestSwap.player,
          position: problem.position,
          score: calculateEnhancedPositionScore(bestSwap.player, problem.position, requirements),
          isSpecialist: false,
          alternativePositions: []
        };

        swaps.push({
          from: `${problem.player.friendly_name} (${problem.position})`,
          to: `${bestSwap.player.friendly_name} (${bestSwap.fromPosition})`,
          reason: bestSwap.details,
          improvement: bestImprovement
        });

        // Mark both as swapped to avoid further swaps
        swappedPlayers.add(problem.player.player_id);
        swappedPlayers.add(bestSwap.player.player_id);

        improved = true;
      }
    }
  }

  // Log swaps to debug with detailed reasons
  if (swaps.length > 0) {
    const swapDetails = swaps.map(s =>
      `${s.from} ↔ ${s.to} (${s.reason})`
    ).join('; ');

    debugLog.optimizationNotes.push(
      `${teamColor.toUpperCase()} team optimizations (${swaps.length} swaps): ${swapDetails}`
    );

    // Also log total improvement
    const totalImprovement = swaps.reduce((sum, s) => sum + s.improvement, 0);
    debugLog.optimizationNotes.push(
      `Total score improvement: +${totalImprovement.toFixed(1)}`
    );
  } else if (problems.length > 0) {
    debugLog.optimizationNotes.push(
      `${teamColor.toUpperCase()} team: ${problems.length} suboptimal assignments found but no beneficial swaps available`
    );
  }

  return improved;
}

/**
 * Consolidated debug log
 */
export interface ConsolidatedFormationDebugLog {
  timestamp: string;
  totalPlayers: number;
  blueTeamSize: number;
  orangeTeamSize: number;
  leagueStats: {
    attributeAverages: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    };
    ratingAverages: {
      attack: number;
      defense: number;
      gameIq: number;
    };
  };
  playerAnalysis: Array<{
    team: 'blue' | 'orange';
    playerId: string;
    playerName: string;
    ratings: {
      attack: number;
      defense: number;
      gameIq: number;
      overall: number;
    };
    attributes: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    } | null;
    detectedPlaystyle: string | null;
    idealPositions: PositionType[];
    positionScores: Record<PositionType, {
      score: number;
      breakdown: {
        fromAttributes: number;
        fromRatings: number;
        bonus: string | null;
      };
    }>;
    assignedPosition: PositionType;
    assignmentReason: string;
    isNaturalPosition: boolean;
    alternativePositions: PositionType[];
  }>;
  formationSelection: {
    blue: {
      formation: string;
      reasoning: string;
      teamComposition: {
        withPlaystyles: number;
        withoutPlaystyles: number;
        attackingPlayers: number;
        defensivePlayers: number;
        balancedPlayers: number;
      };
    };
    orange: {
      formation: string;
      reasoning: string;
      teamComposition: {
        withPlaystyles: number;
        withoutPlaystyles: number;
        attackingPlayers: number;
        defensivePlayers: number;
        balancedPlayers: number;
      };
    };
  };
  positionAnalysis: {
    blue: Record<PositionType, {
      requiredCount: number;
      assignedCount: number;
      players: string[];
      averageScore: number;
      naturalFits: number;
      compromises: number;
    }>;
    orange: Record<PositionType, {
      requiredCount: number;
      assignedCount: number;
      players: string[];
      averageScore: number;
      naturalFits: number;
      compromises: number;
    }>;
  };
  qualityMetrics: {
    blue: {
      overallScore: number;
      naturalPositionRate: number;
      attributeCoverage: number;
      confidence: 'high' | 'medium' | 'low';
      confidenceReason: string;
    };
    orange: {
      overallScore: number;
      naturalPositionRate: number;
      attributeCoverage: number;
      confidence: 'high' | 'medium' | 'low';
      confidenceReason: string;
    };
  };
  optimizationNotes: string[];
}

/**
 * Assign players to positions with optimization
 */
function assignPlayersToPositions(
  team: TeamAssignment[],
  formation: FormationTemplate,
  requirements: RelativeRequirements,
  debugLog: ConsolidatedFormationDebugLog,
  teamColor: 'blue' | 'orange'
): FormationSuggestion {
  const positions: FormationSuggestion['positions'] = {
    DEF: [], W: [], CDM: [], CM: [], CAM: [], ST: []
  };

  const positionAnalysis = debugLog.positionAnalysis[teamColor];

  // Initialize position requirements
  Object.keys(formation.positions).forEach(pos => {
    const position = pos as PositionType;
    positionAnalysis[position] = {
      requiredCount: formation.positions[position],
      assignedCount: 0,
      players: [],
      averageScore: 0,
      naturalFits: 0,
      compromises: 0
    };
  });

  // Calculate all position scores
  const playerScores: Array<{
    player: TeamAssignment;
    position: PositionType;
    score: number;
    isNatural: boolean;
  }> = [];

  team.forEach(player => {
    const playstyle = player.derived_attributes ?
      detectPlaystyleFromAttributes(player.derived_attributes, requirements) : null;
    const idealPositions = playstyle ? PLAYSTYLE_IDEAL_POSITIONS[playstyle] || [] : [];

    // Update player analysis
    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.detectedPlaystyle = playstyle;
      playerAnalysis.idealPositions = idealPositions;
    }

    // Calculate scores for each position
    const positionScoreMap: Record<PositionType, any> = {} as any;

    (['DEF', 'W', 'CDM', 'CM', 'CAM', 'ST'] as PositionType[]).forEach(position => {
      const score = calculateEnhancedPositionScore(player, position, requirements);
      const isNatural = idealPositions.includes(position);
      const finalScore = isNatural ? score * 1.3 : score;

      playerScores.push({
        player,
        position,
        score: finalScore,
        isNatural
      });

      positionScoreMap[position] = {
        score: finalScore,
        breakdown: {
          fromAttributes: 0,
          fromRatings: 0,
          bonus: isNatural ? 'Natural position (+30%)' : null
        }
      };
    });

    if (playerAnalysis) {
      playerAnalysis.positionScores = positionScoreMap;
    }
  });

  // Sort by score descending
  playerScores.sort((a, b) => b.score - a.score);

  const assignedPlayers = new Set<string>();
  const positionCounts: Record<PositionType, number> = {
    DEF: 0, W: 0, CDM: 0, CM: 0, CAM: 0, ST: 0
  };

  // Phase 1: Assign natural fits first
  playerScores.forEach(({ player, position, score, isNatural }) => {
    if (assignedPlayers.has(player.player_id)) return;
    if (positionCounts[position] >= formation.positions[position]) return;
    if (!isNatural) return;

    positions[position].push({
      player,
      position,
      score,
      isSpecialist: isNatural,
      alternativePositions: []
    });

    assignedPlayers.add(player.player_id);
    positionCounts[position]++;
    positionAnalysis[position].players.push(player.friendly_name);
    positionAnalysis[position].naturalFits++;

    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.assignedPosition = position;
      playerAnalysis.assignmentReason = 'Natural position fit (Phase 1)';
      playerAnalysis.isNaturalPosition = true;
    }
  });

  // Phase 2: Fill remaining by best score
  playerScores.forEach(({ player, position, score, isNatural }) => {
    if (assignedPlayers.has(player.player_id)) return;
    if (positionCounts[position] >= formation.positions[position]) return;

    positions[position].push({
      player,
      position,
      score,
      isSpecialist: false,
      alternativePositions: []
    });

    assignedPlayers.add(player.player_id);
    positionCounts[position]++;
    positionAnalysis[position].players.push(player.friendly_name);

    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.assignedPosition = position;
      playerAnalysis.assignmentReason = `Best available fit (Phase 2, score: ${score.toFixed(2)})`;
      playerAnalysis.isNaturalPosition = false;
    }
  });

  // Phase 3: Force assign remaining players
  team.forEach(player => {
    if (assignedPlayers.has(player.player_id)) return;

    let bestPosition: PositionType = 'CM';
    let bestScore = 0; // Start at 0, not negative

    // First try with constraints
    let foundPosition = false;
    (['CM', 'W', 'DEF', 'CDM', 'CAM', 'ST'] as PositionType[]).forEach(position => {
      if (positionCounts[position] < formation.positions[position]) {
        // Hard constraints: prevent critical mismatches
        const attrs = player.derived_attributes;

        // Skip positions with critical attribute deficiencies (relative to player pool)
        if (attrs && requirements) {
          const weights = ENHANCED_POSITION_WEIGHTS[position];

          // For critical attributes (weight > 0.3), require at least 10th percentile
          if (weights.passing > 0.3 && attrs.passing < requirements.passing.p10) {
            // CM/CAM need decent passing
            if (position === 'CM' || position === 'CAM') return;
          }
          if (weights.defending > 0.3 && attrs.defending < requirements.defending.p10) {
            // CDM needs decent defending
            if (position === 'CDM') return;
          }
          if (weights.shooting > 0.3 && attrs.shooting < requirements.shooting.p10) {
            // ST needs decent shooting
            if (position === 'ST') return;
          }
          if (weights.pace > 0.3 && attrs.pace < requirements.pace.p10) {
            // W needs decent pace
            if (position === 'W') return;
          }
        }

        const score = calculateEnhancedPositionScore(player, position, requirements);
        if (score > bestScore) {
          bestScore = score;
          bestPosition = position;
          foundPosition = true;
        }
      }
    });

    // If no position found with constraints, force assign to least bad position
    if (!foundPosition) {
      (['DEF', 'W', 'CM', 'CDM', 'CAM', 'ST'] as PositionType[]).forEach(position => {
        if (positionCounts[position] < formation.positions[position]) {
          const score = calculateEnhancedPositionScore(player, position, requirements);
          if (score > bestScore || bestScore === 0) {
            bestScore = score;
            bestPosition = position;
          }
        }
      });
    }

    positions[bestPosition].push({
      player,
      position: bestPosition,
      score: bestScore,
      isSpecialist: false,
      alternativePositions: []
    });

    assignedPlayers.add(player.player_id);
    positionCounts[bestPosition]++;
    positionAnalysis[bestPosition].players.push(player.friendly_name);
    positionAnalysis[bestPosition].compromises++;

    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.assignedPosition = bestPosition;
      playerAnalysis.assignmentReason = 'Forced assignment (Phase 3)';
      playerAnalysis.isNaturalPosition = false;
    }
  });

  // Optimize poor assignments
  optimizeAssignments(positions, team, requirements, debugLog, teamColor);

  // Calculate metrics
  Object.keys(positions).forEach(pos => {
    const position = pos as PositionType;
    const players = positions[position];
    if (players.length > 0) {
      const avgScore = players.reduce((sum, p) => sum + p.score, 0) / players.length;
      positionAnalysis[position].averageScore = avgScore;
      positionAnalysis[position].assignedCount = players.length;
    }
  });

  // Calculate balance
  const calculateAreaScore = (players: PlayerPositionAssignment[]) => {
    if (players.length === 0) return 0;
    return players.reduce((sum, p) => sum + p.score, 0) / players.length;
  };

  const defense = calculateAreaScore([...positions.DEF, ...positions.W]);
  const midfield = calculateAreaScore([...positions.CDM, ...positions.CM, ...positions.CAM]);
  const attack = calculateAreaScore(positions.ST);
  const overall = (defense + midfield + attack) / 3;

  // Determine confidence
  const naturalRate = team.filter(p => {
    const analysis = debugLog.playerAnalysis.find(
      a => a.playerId === p.player_id && a.team === teamColor
    );
    return analysis?.isNaturalPosition;
  }).length / team.length;

  let confidence: 'high' | 'medium' | 'low';
  let confidenceReason: string;

  if (naturalRate > 0.7 && overall > 6) {
    confidence = 'high';
    confidenceReason = `${(naturalRate * 100).toFixed(0)}% natural positions, strong overall score`;
  } else if (naturalRate > 0.5 || overall > 5) {
    confidence = 'medium';
    confidenceReason = `${(naturalRate * 100).toFixed(0)}% natural positions, decent overall score`;
  } else {
    confidence = 'low';
    confidenceReason = `Only ${(naturalRate * 100).toFixed(0)}% natural positions, compromises made`;
  }

  debugLog.qualityMetrics[teamColor] = {
    overallScore: overall,
    naturalPositionRate: naturalRate,
    attributeCoverage: team.filter(p => p.derived_attributes).length / team.length,
    confidence,
    confidenceReason
  };

  return {
    formation: formation.name,
    positions,
    confidence,
    rationale: [
      `Formation: ${formation.name}`,
      `Natural fits: ${Math.round(naturalRate * 100)}%`
    ],
    balanceScore: { defense, midfield, attack, overall }
  };
}

/**
 * Analyze team composition
 */
function analyzeTeamComposition(team: TeamAssignment[]): any {
  const composition = {
    withPlaystyles: 0,
    withoutPlaystyles: 0,
    attackingPlayers: 0,
    defensivePlayers: 0,
    balancedPlayers: 0
  };

  team.forEach(player => {
    if (player.derived_attributes) {
      composition.withPlaystyles++;
      const attrs = player.derived_attributes;
      const attackScore = attrs.pace + attrs.shooting + attrs.dribbling;
      const defenseScore = attrs.defending + attrs.physical;

      if (attackScore > defenseScore * 1.5) {
        composition.attackingPlayers++;
      } else if (defenseScore > attackScore * 1.2) {
        composition.defensivePlayers++;
      } else {
        composition.balancedPlayers++;
      }
    } else {
      composition.withoutPlaystyles++;
      const attack = player.attack_rating ?? 5;
      const defense = player.defense_rating ?? 5;

      if (attack > defense + 2) {
        composition.attackingPlayers++;
      } else if (defense > attack + 2) {
        composition.defensivePlayers++;
      } else {
        composition.balancedPlayers++;
      }
    }
  });

  return composition;
}

/**
 * Main function to suggest formations
 */
export function suggestFormations(
  blueTeam: TeamAssignment[],
  orangeTeam: TeamAssignment[]
): FormationResult & { consolidatedDebugLog?: ConsolidatedFormationDebugLog } {
  // Create debug log
  const debugLog: ConsolidatedFormationDebugLog = {
    timestamp: new Date().toISOString(),
    totalPlayers: blueTeam.length + orangeTeam.length,
    blueTeamSize: blueTeam.length,
    orangeTeamSize: orangeTeam.length,
    leagueStats: {
      attributeAverages: {
        pace: 0, shooting: 0, passing: 0,
        dribbling: 0, defending: 0, physical: 0
      },
      ratingAverages: { attack: 0, defense: 0, gameIq: 0 }
    },
    playerAnalysis: [],
    formationSelection: {
      blue: { formation: '', reasoning: '', teamComposition: analyzeTeamComposition(blueTeam) },
      orange: { formation: '', reasoning: '', teamComposition: analyzeTeamComposition(orangeTeam) }
    },
    positionAnalysis: { blue: {} as any, orange: {} as any },
    qualityMetrics: { blue: {} as any, orange: {} as any },
    optimizationNotes: []
  };

  // Calculate league stats and requirements
  const allPlayers = [...blueTeam, ...orangeTeam];
  const requirements = calculateRelativeRequirements(allPlayers);

  // Calculate averages for debug
  let attrCount = 0;
  allPlayers.forEach(player => {
    debugLog.leagueStats.ratingAverages.attack += player.attack_rating ?? 5;
    debugLog.leagueStats.ratingAverages.defense += player.defense_rating ?? 5;
    debugLog.leagueStats.ratingAverages.gameIq += player.game_iq_rating ?? 5;

    if (player.derived_attributes) {
      attrCount++;
      debugLog.leagueStats.attributeAverages.pace += player.derived_attributes.pace;
      debugLog.leagueStats.attributeAverages.shooting += player.derived_attributes.shooting;
      debugLog.leagueStats.attributeAverages.passing += player.derived_attributes.passing;
      debugLog.leagueStats.attributeAverages.dribbling += player.derived_attributes.dribbling;
      debugLog.leagueStats.attributeAverages.defending += player.derived_attributes.defending;
      debugLog.leagueStats.attributeAverages.physical += player.derived_attributes.physical;
    }
  });

  debugLog.leagueStats.ratingAverages.attack /= allPlayers.length;
  debugLog.leagueStats.ratingAverages.defense /= allPlayers.length;
  debugLog.leagueStats.ratingAverages.gameIq /= allPlayers.length;

  if (attrCount > 0) {
    Object.keys(debugLog.leagueStats.attributeAverages).forEach(key => {
      debugLog.leagueStats.attributeAverages[key as keyof typeof debugLog.leagueStats.attributeAverages] /= attrCount;
    });
  }

  // Initialize player analysis
  [...blueTeam.map(p => ({ ...p, teamColor: 'blue' as const })),
   ...orangeTeam.map(p => ({ ...p, teamColor: 'orange' as const }))]
    .forEach(player => {
      debugLog.playerAnalysis.push({
        team: player.teamColor,
        playerId: player.player_id,
        playerName: player.friendly_name,
        ratings: {
          attack: player.attack_rating ?? 5,
          defense: player.defense_rating ?? 5,
          gameIq: player.game_iq_rating ?? 5,
          overall: ((player.attack_rating ?? 5) + (player.defense_rating ?? 5) + (player.game_iq_rating ?? 5)) / 3
        },
        attributes: player.derived_attributes || null,
        detectedPlaystyle: null,
        idealPositions: [],
        positionScores: {} as any,
        assignedPosition: 'CM' as PositionType,
        assignmentReason: '',
        isNaturalPosition: false,
        alternativePositions: []
      });
    });

  // Select best formations
  const blueFormation = selectBestFormation(blueTeam, requirements);
  const orangeFormation = selectBestFormation(orangeTeam, requirements);

  // Update debug log
  const blueComposition = analyzeTeamComposition(blueTeam);
  const orangeComposition = analyzeTeamComposition(orangeTeam);

  debugLog.formationSelection.blue = {
    formation: blueFormation.name,
    reasoning: `${blueComposition.attackingPlayers} attacking, ${blueComposition.defensivePlayers} defensive, ${blueComposition.balancedPlayers} balanced players`,
    teamComposition: blueComposition
  };

  debugLog.formationSelection.orange = {
    formation: orangeFormation.name,
    reasoning: `${orangeComposition.attackingPlayers} attacking, ${orangeComposition.defensivePlayers} defensive, ${orangeComposition.balancedPlayers} balanced players`,
    teamComposition: orangeComposition
  };

  // Initialize position analysis
  (['DEF', 'W', 'CDM', 'CM', 'CAM', 'ST'] as PositionType[]).forEach(pos => {
    debugLog.positionAnalysis.blue[pos] = {
      requiredCount: 0, assignedCount: 0, players: [],
      averageScore: 0, naturalFits: 0, compromises: 0
    };
    debugLog.positionAnalysis.orange[pos] = {
      requiredCount: 0, assignedCount: 0, players: [],
      averageScore: 0, naturalFits: 0, compromises: 0
    };
  });

  // Assign players
  const blueResult = assignPlayersToPositions(blueTeam, blueFormation, requirements, debugLog, 'blue');
  const orangeResult = assignPlayersToPositions(orangeTeam, orangeFormation, requirements, debugLog, 'orange');

  // Add notes
  if (blueComposition.withPlaystyles < blueTeam.length * 0.5) {
    debugLog.optimizationNotes.push(
      `Blue team has limited playstyle data (${blueComposition.withPlaystyles}/${blueTeam.length} players)`
    );
  }

  if (orangeComposition.withPlaystyles < orangeTeam.length * 0.5) {
    debugLog.optimizationNotes.push(
      `Orange team has limited playstyle data (${orangeComposition.withPlaystyles}/${orangeTeam.length} players)`
    );
  }

  const formationNotes: string[] = [];
  formationNotes.push(`Teams: Blue (${blueTeam.length}) vs Orange (${orangeTeam.length})`);
  formationNotes.push(`Formations: Blue ${blueFormation.name} vs Orange ${orangeFormation.name}`);

  return {
    blueFormation: blueResult,
    orangeFormation: orangeResult,
    formationNotes,
    consolidatedDebugLog: debugLog
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
 * Export position colors for UI
 */
export const POSITION_COLORS: Record<PositionType, string> = {
  DEF: 'bg-red-100 text-red-800 border-red-300',
  W: 'bg-purple-100 text-purple-800 border-purple-300',
  CDM: 'bg-orange-100 text-orange-800 border-orange-300',
  CM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CAM: 'bg-green-100 text-green-800 border-green-300',
  ST: 'bg-blue-100 text-blue-800 border-blue-300'
};