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
    attack: 0.10,      // Legacy weight for fallback
    defense: 0.02,     // Legacy weight for fallback
    gameIq: 0.08,      // Decision making in final third
    shooting: 0.35,    // Primary requirement
    pace: 0.25,        // Get in behind defenses
    dribbling: 0.20,   // Beat defenders 1v1
    physical: 0.10,    // Hold up play
    passing: 0.00,     // Least important
    defending: 0.00    // Not needed
  },
  W: {
    attack: 0.08,
    defense: 0.05,
    gameIq: 0.07,
    pace: 0.35,        // Primary requirement for wingers
    dribbling: 0.30,   // Beat fullbacks
    passing: 0.20,     // Cross/cut back
    shooting: 0.15,    // Secondary threat
    defending: 0.00,   // Minimal defensive duty
    physical: 0.00     // Not critical
  },
  CAM: {
    attack: 0.08,
    defense: 0.02,
    gameIq: 0.10,      // Vision and creativity
    passing: 0.35,     // Primary playmaker
    dribbling: 0.25,   // Create space
    shooting: 0.20,    // Goal threat
    pace: 0.10,        // Helpful but not critical
    defending: 0.00,   // Minimal
    physical: 0.00     // Least important
  },
  CM: {
    attack: 0.06,
    defense: 0.06,
    gameIq: 0.08,      // Tactical awareness
    passing: 0.30,     // Ball circulation
    physical: 0.25,    // Box-to-box ability
    defending: 0.25,   // Defensive contribution
    dribbling: 0.10,   // Press resistance
    pace: 0.05,        // Helpful
    shooting: 0.05     // Occasional threat
  },
  CDM: {
    attack: 0.03,
    defense: 0.09,
    gameIq: 0.08,      // Positioning is key
    defending: 0.35,   // Primary requirement
    physical: 0.30,    // Win duels
    passing: 0.20,     // Start attacks
    pace: 0.10,        // Track runners
    dribbling: 0.05,   // Press resistance
    shooting: 0.00     // Not needed
  },
  DEF: {
    attack: 0.02,
    defense: 0.10,
    gameIq: 0.08,      // Positioning and awareness
    defending: 0.40,   // Primary requirement
    physical: 0.30,    // Win headers/duels
    pace: 0.20,        // Recovery speed
    passing: 0.10,     // Build from back
    dribbling: 0.00,   // Not critical
    shooting: 0.00     // Not needed
  }
};

/**
 * Playstyle to ideal positions mapping
 * Based on the playstyle definitions from the database
 */
const PLAYSTYLE_IDEAL_POSITIONS: Record<string, PositionType[]> = {
  // Attacking styles
  'Complete Forward': ['ST'],
  'Hunter': ['ST', 'W'],              // Pace + Shooting
  'Hawk': ['ST'],                      // Pace + Shooting + Physical
  'Marksman': ['ST', 'CAM'],          // Shooting + Dribbling + Physical
  'Finisher': ['ST'],                 // Shooting + Physical
  'Sniper': ['CAM', 'ST'],            // Shooting + Dribbling
  'Deadeye': ['CAM', 'CM'],           // Shooting + Passing
  'Speedster': ['W', 'ST'],           // Pace + Dribbling

  // Midfield styles
  'Box-to-Box': ['CM', 'CDM'],
  'Engine': ['CM', 'W', 'CAM'],       // Pace + Passing + Dribbling
  'Artist': ['CAM', 'CM'],            // Passing + Dribbling
  'Architect': ['CDM', 'CM'],         // Passing + Physical
  'Powerhouse': ['CDM', 'CM'],        // Passing + Defending
  'Maestro': ['CAM'],                 // Shooting + Passing + Dribbling
  'Catalyst': ['CM', 'W'],            // Pace + Passing
  'Locomotive': ['CM', 'CDM'],        // Pace + Physical
  'Enforcer': ['CDM', 'CM'],          // Dribbling + Physical

  // Defensive styles
  'Complete Defender': ['DEF'],
  'Shadow': ['DEF', 'CDM'],           // Pace + Defending
  'Anchor': ['DEF', 'CDM'],           // Pace + Defending + Physical
  'Gladiator': ['DEF', 'W'],          // Shooting + Defending (attacking fullback)
  'Guardian': ['DEF', 'W'],           // Dribbling + Defending (ball-playing defender)
  'Sentinel': ['DEF', 'CDM'],         // Defending + Physical
  'Backbone': ['CDM', 'DEF']          // Passing + Defending + Physical
};

/**
 * Position criticality - how important it is to have strong players here
 * Currently unused but kept for future reference
 */
// const POSITION_CRITICALITY: Record<PositionType, number> = {
//   ST: 3,   // Most critical - needs to score goals
//   CDM: 3,  // Most critical - defensive anchor
//   CAM: 2,  // Important - creates chances
//   DEF: 2,  // Important but has support from others
//   CM: 1,   // Flexible, can accommodate various skill levels
//   W: 0     // Least critical - good for weaker players
// };

/**
 * Consolidated debug log for both teams
 */
export interface ConsolidatedFormationDebugLog {
  timestamp: string;
  totalPlayers: number;
  blueTeamSize: number;
  orangeTeamSize: number;

  // League-wide stats for context
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

  // Player analysis for both teams
  playerAnalysis: Array<{
    team: 'blue' | 'orange';
    playerId: string;
    playerName: string;

    // Core ratings
    ratings: {
      attack: number;
      defense: number;
      gameIq: number;
      overall: number;
    };

    // Playstyle attributes
    attributes: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    } | null;

    // Detected playstyle
    detectedPlaystyle: string | null;
    idealPositions: PositionType[];

    // Position scores (how well they fit each position)
    positionScores: Record<PositionType, {
      score: number;
      breakdown: {
        fromAttributes: number;
        fromRatings: number;
        bonus: string | null;
      };
    }>;

    // Final assignment
    assignedPosition: PositionType;
    assignmentReason: string;
    isNaturalPosition: boolean;
    alternativePositions: PositionType[];
  }>;

  // Formation selection
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

  // Position fill analysis
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

  // Quality metrics
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

  // Optimization notes
  optimizationNotes: string[];
}

/**
 * Calculate a player's score for a specific position using attributes
 */
function calculateEnhancedPositionScore(
  player: TeamAssignment,
  position: PositionType,
  debugInfo?: { breakdown?: any }
): number {
  const weights = ENHANCED_POSITION_WEIGHTS[position];
  let score = 0;
  let fromAttributes = 0;
  let fromRatings = 0;

  // Use attributes if available (primary scoring method)
  if (player.derived_attributes) {
    const attrs = player.derived_attributes;

    fromAttributes = (
      attrs.pace * weights.pace +
      attrs.shooting * weights.shooting +
      attrs.passing * weights.passing +
      attrs.dribbling * weights.dribbling +
      attrs.defending * weights.defending +
      attrs.physical * weights.physical
    ) * 10; // Scale to 0-10 range

    score = fromAttributes;
  }

  // Fall back to or supplement with traditional ratings
  const attack = player.attack_rating ?? 5;
  const defense = player.defense_rating ?? 5;
  const gameIq = player.game_iq_rating ?? 5;

  fromRatings = (
    attack * weights.attack +
    defense * weights.defense +
    gameIq * weights.gameIq
  );

  // If we have both, weight them appropriately
  if (player.derived_attributes) {
    score = fromAttributes * 0.7 + fromRatings * 0.3; // 70% attributes, 30% ratings
  } else {
    score = fromRatings; // Only ratings available
  }

  if (debugInfo) {
    debugInfo.breakdown = {
      fromAttributes,
      fromRatings,
      final: score
    };
  }

  return score;
}

/**
 * Detect natural position based on playstyle name
 */
function detectPlaystyleBasedPosition(
  player: TeamAssignment,
  playstyleName: string | null
): PositionType[] {
  if (!playstyleName) return [];

  // Check if this playstyle has ideal positions defined
  if (PLAYSTYLE_IDEAL_POSITIONS[playstyleName]) {
    return PLAYSTYLE_IDEAL_POSITIONS[playstyleName];
  }

  // For dynamic playstyles, analyze the attributes
  if (player.derived_attributes) {
    const attrs = player.derived_attributes;
    const positions: PositionType[] = [];

    // Find positions where player excels based on attribute thresholds
    if (attrs.shooting > 0.6 && attrs.pace > 0.5) positions.push('ST');
    if (attrs.pace > 0.7 && attrs.dribbling > 0.5) positions.push('W');
    if (attrs.passing > 0.6 && attrs.dribbling > 0.5) positions.push('CAM');
    if (attrs.passing > 0.5 && attrs.defending > 0.5) positions.push('CM');
    if (attrs.defending > 0.6 && attrs.physical > 0.5) positions.push('CDM');
    if (attrs.defending > 0.7 && attrs.physical > 0.6) positions.push('DEF');

    return positions;
  }

  return [];
}

/**
 * Get playstyle name from database (would need to be passed in or fetched)
 * For now, we'll detect it from attributes
 */
function detectPlaystyleFromAttributes(attrs: NonNullable<TeamAssignment['derived_attributes']>): string | null {
  // Complete players (all high)
  if (Object.values(attrs).every(v => v > 0.6)) {
    return 'Complete Player';
  }

  // Check for known combinations
  const pace = attrs.pace > 0.5;
  const shooting = attrs.shooting > 0.5;
  const passing = attrs.passing > 0.5;
  const dribbling = attrs.dribbling > 0.5;
  const defending = attrs.defending > 0.5;
  const physical = attrs.physical > 0.5;

  // Attacking playstyles
  if (pace && shooting && !defending) return 'Hunter';
  if (pace && shooting && physical && !defending) return 'Hawk';
  if (shooting && dribbling && physical && !defending) return 'Marksman';
  if (shooting && physical && !pace && !defending) return 'Finisher';
  if (shooting && dribbling && !physical && !defending) return 'Sniper';
  if (shooting && passing && !dribbling && !defending) return 'Deadeye';
  if (pace && dribbling && !shooting && !defending) return 'Speedster';

  // Midfield playstyles
  if (pace && passing && dribbling && !shooting && !defending) return 'Engine';
  if (passing && dribbling && !pace && !shooting) return 'Artist';
  if (passing && physical && !pace && !shooting) return 'Architect';
  if (passing && defending && !shooting) return 'Powerhouse';
  if (shooting && passing && dribbling) return 'Maestro';
  if (pace && passing && !dribbling) return 'Catalyst';
  if (pace && physical && !passing) return 'Locomotive';
  if (dribbling && physical && !pace) return 'Enforcer';

  // Defensive playstyles
  if (pace && defending && !shooting) return 'Shadow';
  if (pace && defending && physical) return 'Anchor';
  if (shooting && defending) return 'Gladiator';
  if (dribbling && defending && !shooting) return 'Guardian';
  if (defending && physical && !pace) return 'Sentinel';
  if (passing && defending && physical) return 'Backbone';

  return null;
}

/**
 * Analyze team composition for formation selection
 */
interface TeamComposition {
  withPlaystyles: number;
  withoutPlaystyles: number;
  attackingPlayers: number;
  defensivePlayers: number;
  balancedPlayers: number;
}

function analyzeTeamComposition(team: TeamAssignment[]): TeamComposition {
  const composition: TeamComposition = {
    withPlaystyles: 0,
    withoutPlaystyles: 0,
    attackingPlayers: 0,
    defensivePlayers: 0,
    balancedPlayers: 0
  };

  team.forEach(player => {
    // Check if player has playstyle attributes
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

      // Use traditional ratings
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
 * Formation templates based on team size
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
 * Select formation based on team composition
 */
function selectFormation(team: TeamAssignment[], composition: TeamComposition): FormationTemplate {
  const outfieldCount = team.length - 1; // Account for rotating keeper

  // Get valid formations for team size
  const validFormations = FORMATION_TEMPLATES.filter(
    f => outfieldCount >= f.minPlayers && outfieldCount <= f.maxPlayers
  );

  if (validFormations.length === 0) {
    // Create default formation
    return {
      name: `${Math.floor(outfieldCount * 0.4)}-${Math.floor(outfieldCount * 0.4)}-${Math.ceil(outfieldCount * 0.2)}`,
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

  // Select based on team composition
  let selectedFormation = validFormations[0];

  // Prefer attacking formations if many attacking players
  if (composition.attackingPlayers > composition.defensivePlayers * 1.5) {
    const attackingFormation = validFormations.find(f =>
      f.positions.ST >= 2 || f.positions.CAM >= 1
    );
    if (attackingFormation) selectedFormation = attackingFormation;
  }
  // Prefer defensive formations if many defensive players
  else if (composition.defensivePlayers > composition.attackingPlayers * 1.5) {
    const defensiveFormation = validFormations.find(f =>
      f.positions.DEF >= 4 || (f.positions.DEF >= 3 && f.positions.CDM >= 1)
    );
    if (defensiveFormation) selectedFormation = defensiveFormation;
  }
  // Prefer formations with wingers if we have pacy dribblers
  else if (composition.withPlaystyles > team.length * 0.5) {
    const wingFormation = validFormations.find(f => f.positions.W >= 2);
    if (wingFormation) selectedFormation = wingFormation;
  }

  return selectedFormation;
}

/**
 * Assign players to positions with detailed tracking
 */
function assignPlayersToPositions(
  team: TeamAssignment[],
  formation: FormationTemplate,
  debugLog: ConsolidatedFormationDebugLog,
  teamColor: 'blue' | 'orange'
): FormationSuggestion {
  const positions: FormationSuggestion['positions'] = {
    DEF: [],
    W: [],
    CDM: [],
    CM: [],
    CAM: [],
    ST: []
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

  // Calculate position scores for all players
  const playerScores: Array<{
    player: TeamAssignment;
    position: PositionType;
    score: number;
    isNatural: boolean;
    breakdown: any;
  }> = [];

  team.forEach(player => {
    const playstyle = player.derived_attributes ?
      detectPlaystyleFromAttributes(player.derived_attributes) : null;
    const idealPositions = detectPlaystyleBasedPosition(player, playstyle);

    // Find player in debug log and update their info
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
      const breakdown: any = {};
      const score = calculateEnhancedPositionScore(player, position, { breakdown });
      const isNatural = idealPositions.includes(position);

      // Add natural position bonus
      const finalScore = isNatural ? score * 1.3 : score;
      breakdown.bonus = isNatural ? 'Natural position (+30%)' : null;

      playerScores.push({
        player,
        position,
        score: finalScore,
        isNatural,
        breakdown
      });

      positionScoreMap[position] = {
        score: finalScore,
        breakdown
      };
    });

    if (playerAnalysis) {
      playerAnalysis.positionScores = positionScoreMap;
    }
  });

  // Sort by score descending
  playerScores.sort((a, b) => b.score - a.score);

  // Track assigned players
  const assignedPlayers = new Set<string>();
  const positionCounts: Record<PositionType, number> = {
    DEF: 0, W: 0, CDM: 0, CM: 0, CAM: 0, ST: 0
  };

  // Phase 1: Assign natural fits first
  playerScores.forEach(({ player, position, score, isNatural }) => {
    if (assignedPlayers.has(player.player_id)) return;
    if (positionCounts[position] >= formation.positions[position]) return;
    if (!isNatural) return; // Only natural fits in phase 1

    positions[position].push({
      player,
      position,
      score,
      isSpecialist: isNatural,
      alternativePositions: playerScores
        .filter(ps => ps.player.player_id === player.player_id && ps.position !== position)
        .slice(0, 2)
        .map(ps => ({ position: ps.position, score: ps.score }))
    });

    assignedPlayers.add(player.player_id);
    positionCounts[position]++;

    // Update debug log
    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.assignedPosition = position;
      playerAnalysis.assignmentReason = 'Natural position fit (Phase 1)';
      playerAnalysis.isNaturalPosition = true;
    }

    positionAnalysis[position].players.push(player.friendly_name);
    positionAnalysis[position].naturalFits++;
  });

  // Phase 2: Fill remaining positions by best score
  playerScores.forEach(({ player, position, score, isNatural }) => {
    if (assignedPlayers.has(player.player_id)) return;
    if (positionCounts[position] >= formation.positions[position]) return;

    positions[position].push({
      player,
      position,
      score,
      isSpecialist: false,
      alternativePositions: playerScores
        .filter(ps => ps.player.player_id === player.player_id && ps.position !== position)
        .slice(0, 2)
        .map(ps => ({ position: ps.position, score: ps.score }))
    });

    assignedPlayers.add(player.player_id);
    positionCounts[position]++;

    // Update debug log
    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.assignedPosition = position;
      playerAnalysis.assignmentReason = `Best available fit (Phase 2, score: ${score.toFixed(2)})`;
      playerAnalysis.isNaturalPosition = false;
      playerAnalysis.alternativePositions = playerScores
        .filter(ps => ps.player.player_id === player.player_id && ps.position !== position)
        .slice(0, 3)
        .map(ps => ps.position);
    }

    positionAnalysis[position].players.push(player.friendly_name);
    if (!isNatural) {
      positionAnalysis[position].compromises++;
    }
  });

  // Phase 3: Force assign any remaining players
  team.forEach(player => {
    if (assignedPlayers.has(player.player_id)) return;

    // Find position with most space
    let bestPosition: PositionType = 'CM';
    let minFillRate = 999;

    (['CM', 'W', 'DEF', 'CDM', 'CAM', 'ST'] as PositionType[]).forEach(position => {
      const fillRate = positionCounts[position] / Math.max(1, formation.positions[position]);
      if (fillRate < minFillRate) {
        minFillRate = fillRate;
        bestPosition = position;
      }
    });

    const score = calculateEnhancedPositionScore(player, bestPosition);

    positions[bestPosition].push({
      player,
      position: bestPosition,
      score,
      isSpecialist: false,
      alternativePositions: []
    });

    assignedPlayers.add(player.player_id);
    positionCounts[bestPosition]++;

    // Update debug log
    const playerAnalysis = debugLog.playerAnalysis.find(
      p => p.playerId === player.player_id && p.team === teamColor
    );
    if (playerAnalysis) {
      playerAnalysis.assignedPosition = bestPosition;
      playerAnalysis.assignmentReason = 'Forced assignment (Phase 3 - no ideal fit)';
      playerAnalysis.isNaturalPosition = false;
    }

    positionAnalysis[bestPosition].players.push(player.friendly_name);
    positionAnalysis[bestPosition].compromises++;
  });

  // Calculate average scores per position
  Object.keys(positions).forEach(pos => {
    const position = pos as PositionType;
    const players = positions[position];
    if (players.length > 0) {
      const avgScore = players.reduce((sum, p) => sum + p.score, 0) / players.length;
      positionAnalysis[position].averageScore = avgScore;
      positionAnalysis[position].assignedCount = players.length;
    }
  });

  // Calculate balance score
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

  // Update quality metrics
  const playstyleCoverage = team.filter(p => p.derived_attributes).length / team.length;
  debugLog.qualityMetrics[teamColor] = {
    overallScore: overall,
    naturalPositionRate: naturalRate,
    attributeCoverage: playstyleCoverage,
    confidence,
    confidenceReason
  };

  return {
    formation: formation.name,
    positions,
    confidence,
    rationale: [
      `Formation: ${formation.name}`,
      `Natural fits: ${Math.round(naturalRate * 100)}%`,
      `Playstyle coverage: ${Math.round(playstyleCoverage * 100)}%`
    ],
    balanceScore: { defense, midfield, attack, overall }
  };
}

/**
 * Main function to suggest formations for both teams
 */
export function suggestFormations(
  blueTeam: TeamAssignment[],
  orangeTeam: TeamAssignment[]
): FormationResult & { consolidatedDebugLog?: ConsolidatedFormationDebugLog } {
  // Create consolidated debug log
  const debugLog: ConsolidatedFormationDebugLog = {
    timestamp: new Date().toISOString(),
    totalPlayers: blueTeam.length + orangeTeam.length,
    blueTeamSize: blueTeam.length,
    orangeTeamSize: orangeTeam.length,

    leagueStats: {
      attributeAverages: {
        pace: 0,
        shooting: 0,
        passing: 0,
        dribbling: 0,
        defending: 0,
        physical: 0
      },
      ratingAverages: {
        attack: 0,
        defense: 0,
        gameIq: 0
      }
    },

    playerAnalysis: [],
    formationSelection: {
      blue: { formation: '', reasoning: '', teamComposition: analyzeTeamComposition(blueTeam) },
      orange: { formation: '', reasoning: '', teamComposition: analyzeTeamComposition(orangeTeam) }
    },
    positionAnalysis: {
      blue: {} as any,
      orange: {} as any
    },
    qualityMetrics: {
      blue: {} as any,
      orange: {} as any
    },
    optimizationNotes: []
  };

  // Calculate league averages
  const allPlayers = [...blueTeam, ...orangeTeam];
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
    debugLog.leagueStats.attributeAverages.pace /= attrCount;
    debugLog.leagueStats.attributeAverages.shooting /= attrCount;
    debugLog.leagueStats.attributeAverages.passing /= attrCount;
    debugLog.leagueStats.attributeAverages.dribbling /= attrCount;
    debugLog.leagueStats.attributeAverages.defending /= attrCount;
    debugLog.leagueStats.attributeAverages.physical /= attrCount;
  }

  // Analyze all players
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
        detectedPlaystyle: null, // Will be filled during assignment
        idealPositions: [],
        positionScores: {} as any,
        assignedPosition: 'CM' as PositionType, // Will be updated
        assignmentReason: '',
        isNaturalPosition: false,
        alternativePositions: []
      });
    });

  // Analyze team compositions
  const blueComposition = analyzeTeamComposition(blueTeam);
  const orangeComposition = analyzeTeamComposition(orangeTeam);

  // Select formations
  const blueFormation = selectFormation(blueTeam, blueComposition);
  const orangeFormation = selectFormation(orangeTeam, orangeComposition);

  // Update debug log with formation selection
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
      requiredCount: 0,
      assignedCount: 0,
      players: [],
      averageScore: 0,
      naturalFits: 0,
      compromises: 0
    };
    debugLog.positionAnalysis.orange[pos] = {
      requiredCount: 0,
      assignedCount: 0,
      players: [],
      averageScore: 0,
      naturalFits: 0,
      compromises: 0
    };
  });

  // Assign players to positions
  const blueResult = assignPlayersToPositions(blueTeam, blueFormation, debugLog, 'blue');
  const orangeResult = assignPlayersToPositions(orangeTeam, orangeFormation, debugLog, 'orange');

  // Add optimization notes
  if (blueComposition.withPlaystyles < blueTeam.length * 0.5) {
    debugLog.optimizationNotes.push(
      `Blue team has limited playstyle data (${blueComposition.withPlaystyles}/${blueTeam.length} players). Formation based mainly on traditional ratings.`
    );
  }

  if (orangeComposition.withPlaystyles < orangeTeam.length * 0.5) {
    debugLog.optimizationNotes.push(
      `Orange team has limited playstyle data (${orangeComposition.withPlaystyles}/${orangeTeam.length} players). Formation based mainly on traditional ratings.`
    );
  }

  if (Math.abs(blueComposition.attackingPlayers - orangeComposition.attackingPlayers) > 3) {
    debugLog.optimizationNotes.push(
      'Teams have significantly different attacking/defensive balance. Consider manual adjustments.'
    );
  }

  // Build formation notes
  const formationNotes: string[] = [];
  formationNotes.push(`Teams: Blue (${blueTeam.length}) vs Orange (${orangeTeam.length})`);
  formationNotes.push(`Formations: Blue ${blueFormation.name} vs Orange ${orangeFormation.name}`);
  formationNotes.push(
    `Playstyle coverage: Blue ${Math.round(blueComposition.withPlaystyles / blueTeam.length * 100)}%, Orange ${Math.round(orangeComposition.withPlaystyles / orangeTeam.length * 100)}%`
  );

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