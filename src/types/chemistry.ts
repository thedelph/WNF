/**
 * Player Chemistry Types
 *
 * Types for the chemistry system that tracks win/draw/loss records
 * between player pairs when playing on the same team.
 *
 * Formula:
 *   performance_rate = (wins*3 + draws*1) / (games*3) * 100
 *   confidence_factor = games / (games + K) where K=10
 *   chemistry_score = performance_rate * confidence_factor
 */

/**
 * Chemistry stats between two players
 */
export interface ChemistryStats {
  /** Number of games played together on the same team */
  gamesTogether: number;
  /** Number of wins when on the same team */
  winsTogether: number;
  /** Number of draws when on the same team */
  drawsTogether: number;
  /** Number of losses when on the same team */
  lossesTogether: number;
  /** Performance rate: (W*3 + D*1) / (G*3) * 100 */
  performanceRate: number;
  /** Chemistry score: performance_rate * confidence_factor */
  chemistryScore: number;
  /** Curse score: (100 - performance_rate) * confidence_factor */
  curseScore: number;
}

/**
 * Chemistry pair data for leaderboards
 */
export interface ChemistryPair extends ChemistryStats {
  /** First player's ID */
  player1Id: string;
  /** First player's name */
  player1Name: string;
  /** Second player's ID */
  player2Id: string;
  /** Second player's name */
  player2Name: string;
}

/**
 * Chemistry partner data for a specific player's top partners
 */
export interface ChemistryPartner extends ChemistryStats {
  /** Partner player's ID */
  partnerId: string;
  /** Partner player's name */
  partnerName: string;
}

/**
 * Raw database response from get_player_chemistry RPC
 */
export interface ChemistryPairResponse {
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  games_together: number;
  wins_together: number;
  draws_together: number;
  losses_together: number;
  performance_rate: string | number;
  chemistry_score: string | number;
}

/**
 * Raw database response from get_player_pair_chemistry RPC
 */
export interface PairChemistryResponse {
  games_together: number;
  wins_together: number;
  draws_together: number;
  losses_together: number;
  performance_rate: string | number;
  chemistry_score: string | number;
}

/**
 * Raw database response from get_player_top_chemistry_partners RPC
 */
export interface TopPartnerResponse {
  partner_id: string;
  partner_name: string;
  games_together: number;
  wins_together: number;
  draws_together: number;
  losses_together: number;
  performance_rate: string | number;
  chemistry_score: string | number;
}

/**
 * Minimum games required for chemistry to be calculated
 */
export const CHEMISTRY_MIN_GAMES = 10;

/**
 * K value for confidence factor calculation
 */
export const CHEMISTRY_K_VALUE = 10;

/**
 * Transform raw database response to ChemistryPair
 * Recalculates scores using points system: Win=3, Draw=1, Loss=0
 */
export function transformChemistryPair(raw: ChemistryPairResponse): ChemistryPair {
  const games = Number(raw.games_together);
  const wins = Number(raw.wins_together);
  const draws = Number(raw.draws_together);
  const losses = Number(raw.losses_together);

  // Calculate performance rate using points system
  const pointsEarned = (wins * 3) + (draws * 1);
  const pointsAvailable = games * 3;
  const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

  // Confidence-weighted scores
  const confidenceFactor = games / (games + CHEMISTRY_K_VALUE);
  const chemistryScore = performanceRate * confidenceFactor;
  const curseScore = (100 - performanceRate) * confidenceFactor;

  return {
    player1Id: raw.player1_id,
    player1Name: raw.player1_name,
    player2Id: raw.player2_id,
    player2Name: raw.player2_name,
    gamesTogether: games,
    winsTogether: wins,
    drawsTogether: draws,
    lossesTogether: losses,
    performanceRate,
    chemistryScore,
    curseScore,
  };
}

/**
 * Transform raw database response to ChemistryStats
 * Recalculates scores using points system: Win=3, Draw=1, Loss=0
 */
export function transformChemistryStats(raw: PairChemistryResponse): ChemistryStats {
  const games = Number(raw.games_together);
  const wins = Number(raw.wins_together);
  const draws = Number(raw.draws_together);
  const losses = Number(raw.losses_together);

  // Calculate performance rate using points system
  const pointsEarned = (wins * 3) + (draws * 1);
  const pointsAvailable = games * 3;
  const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

  // Confidence-weighted scores
  const confidenceFactor = games / (games + CHEMISTRY_K_VALUE);
  const chemistryScore = performanceRate * confidenceFactor;
  const curseScore = (100 - performanceRate) * confidenceFactor;

  return {
    gamesTogether: games,
    winsTogether: wins,
    drawsTogether: draws,
    lossesTogether: losses,
    performanceRate,
    chemistryScore,
    curseScore,
  };
}

/**
 * Transform raw database response to ChemistryPartner
 * Recalculates scores using points system: Win=3, Draw=1, Loss=0
 */
export function transformChemistryPartner(raw: TopPartnerResponse): ChemistryPartner {
  const games = Number(raw.games_together);
  const wins = Number(raw.wins_together);
  const draws = Number(raw.draws_together);
  const losses = Number(raw.losses_together);

  // Calculate performance rate using points system
  const pointsEarned = (wins * 3) + (draws * 1);
  const pointsAvailable = games * 3;
  const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

  // Confidence-weighted scores
  const confidenceFactor = games / (games + CHEMISTRY_K_VALUE);
  const chemistryScore = performanceRate * confidenceFactor;
  const curseScore = (100 - performanceRate) * confidenceFactor;

  return {
    partnerId: raw.partner_id,
    partnerName: raw.partner_name,
    gamesTogether: games,
    winsTogether: wins,
    drawsTogether: draws,
    lossesTogether: losses,
    performanceRate,
    chemistryScore,
    curseScore,
  };
}

// ============================================================================
// Team Balancing Chemistry Types
// ============================================================================

/**
 * Raw database response from get_batch_player_chemistry RPC
 * Used for team balancing algorithm
 */
export interface BatchChemistryResponse {
  player1_id: string;
  player2_id: string;
  games_together: number;
  wins_together: number;
  draws_together: number;
  losses_together: number;
  performance_rate: string | number;
  chemistry_score: string | number;
}

/**
 * Chemistry lookup structure optimized for team balancing
 * Uses Map for O(1) lookups during optimization phase
 */
export interface ChemistryLookup {
  /** Map of pair keys to chemistry scores. Key format: "playerId1-playerId2" (sorted) */
  pairs: Map<string, number>;
  /** Total number of pairs with chemistry data */
  pairCount: number;
  /** Whether data was successfully loaded */
  isLoaded: boolean;
}

/**
 * Generate consistent pair key for chemistry lookup
 * Always puts smaller ID first for consistent keying regardless of order
 *
 * @param playerId1 - First player's ID
 * @param playerId2 - Second player's ID
 * @returns Consistent key in format "smallerId-largerId"
 */
export function getChemistryPairKey(playerId1: string, playerId2: string): string {
  return playerId1 < playerId2
    ? `${playerId1}-${playerId2}`
    : `${playerId2}-${playerId1}`;
}

/**
 * Build a ChemistryLookup from batch response data
 *
 * @param data - Array of batch chemistry responses from RPC
 * @returns ChemistryLookup with Map for O(1) access
 */
export function buildChemistryLookup(data: BatchChemistryResponse[]): ChemistryLookup {
  const pairs = new Map<string, number>();

  for (const row of data) {
    const key = getChemistryPairKey(row.player1_id, row.player2_id);
    pairs.set(key, Number(row.chemistry_score));
  }

  return {
    pairs,
    pairCount: pairs.size,
    isLoaded: true,
  };
}

// ============================================================================
// Rivalry Types (Head-to-Head when on opposite teams)
// ============================================================================

/**
 * Minimum games required for rivalry to be calculated
 */
export const RIVALRY_MIN_GAMES = 5;

/**
 * Base stats for a rivalry between two players
 */
export interface RivalryStats {
  /** Number of games played against each other */
  gamesAgainst: number;
  /** Number of wins for the first player */
  playerWins: number;
  /** Number of wins for the opponent */
  opponentWins: number;
  /** Number of draws */
  draws: number;
  /** Win percentage for the first player (0-100) */
  winPercentage: number;
  /** Dominance score: how far from 50% (0-50 scale, higher = more lopsided) */
  dominanceScore: number;
}

/**
 * Rivalry pair data for leaderboards (most lopsided rivalries)
 */
export interface RivalryPairLeaderboard extends RivalryStats {
  /** First player's ID (the dominant one) */
  player1Id: string;
  /** First player's name */
  player1Name: string;
  /** Second player's ID */
  player2Id: string;
  /** Second player's name */
  player2Name: string;
  /** Performance rate using points system: (W*3 + D*1) / (G*3) * 100 */
  performanceRate: number;
  /** Confidence-weighted rivalry score: dominance × (games / (games + K)) */
  rivalryScore: number;
}

/**
 * Rivalry data for a specific player's rivals list
 */
export interface PlayerRival {
  /** Opponent's ID */
  opponentId: string;
  /** Opponent's name */
  opponentName: string;
  /** Number of games played against each other */
  gamesAgainst: number;
  /** Number of wins for the player */
  playerWins: number;
  /** Number of wins for the opponent */
  opponentWins: number;
  /** Number of draws */
  draws: number;
  /** Win percentage for the player (0-100) */
  winPercentage: number;
  /** 'dominates' = player wins more, 'dominated' = opponent wins more */
  dominanceType: 'dominates' | 'dominated';
}

/**
 * Raw database response from get_rivalry_leaderboard RPC
 */
export interface RivalryLeaderboardResponse {
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  games_against: number;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  win_percentage: string | number;
  dominance_score: string | number;
}

/**
 * Raw database response from get_player_rivals RPC
 */
export interface PlayerRivalsResponse {
  opponent_id: string;
  opponent_name: string;
  games_against: number;
  player_wins: number;
  opponent_wins: number;
  draws: number;
  win_percentage: string | number;
  dominance_type: string;
}

/**
 * Raw database response from get_player_pair_rivalry RPC
 */
export interface PairRivalryResponse {
  games_against: number;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  player1_win_percentage: string | number;
}

/**
 * K value for rivalry confidence factor calculation
 */
export const RIVALRY_K_VALUE = 5;

/**
 * Transform raw database response to RivalryPairLeaderboard
 * Recalculates scores using points system: Win=3, Draw=1, Loss=0
 */
export function transformRivalryLeaderboard(raw: RivalryLeaderboardResponse): RivalryPairLeaderboard {
  const games = Number(raw.games_against);
  const wins = Number(raw.player1_wins);
  const draws = Number(raw.draws);

  // Calculate performance rate using points system
  // Points earned: wins×3 + draws×1
  // Points available: games×3
  const pointsEarned = (wins * 3) + (draws * 1);
  const pointsAvailable = games * 3;
  const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 50;

  // Dominance is how far from 50% (even matchup)
  const dominanceScore = Math.abs(performanceRate - 50);

  // Confidence-weighted rivalry score
  const confidenceFactor = games / (games + RIVALRY_K_VALUE);
  const rivalryScore = dominanceScore * confidenceFactor;

  return {
    player1Id: raw.player1_id,
    player1Name: raw.player1_name,
    player2Id: raw.player2_id,
    player2Name: raw.player2_name,
    gamesAgainst: games,
    playerWins: wins,
    opponentWins: Number(raw.player2_wins),
    draws: draws,
    winPercentage: Number(raw.win_percentage), // Keep original for backwards compatibility
    dominanceScore,
    performanceRate,
    rivalryScore,
  };
}

/**
 * Transform raw database response to PlayerRival
 */
export function transformPlayerRival(raw: PlayerRivalsResponse): PlayerRival {
  return {
    opponentId: raw.opponent_id,
    opponentName: raw.opponent_name,
    gamesAgainst: Number(raw.games_against),
    playerWins: Number(raw.player_wins),
    opponentWins: Number(raw.opponent_wins),
    draws: Number(raw.draws),
    winPercentage: Number(raw.win_percentage),
    dominanceType: raw.dominance_type as 'dominates' | 'dominated',
  };
}

/**
 * Transform raw database response to RivalryStats (for pair rivalry)
 */
export function transformPairRivalry(raw: PairRivalryResponse): RivalryStats {
  const winPct = Number(raw.player1_win_percentage);
  return {
    gamesAgainst: Number(raw.games_against),
    playerWins: Number(raw.player1_wins),
    opponentWins: Number(raw.player2_wins),
    draws: Number(raw.draws),
    winPercentage: winPct,
    dominanceScore: Math.abs(winPct - 50),
  };
}

// ============================================================================
// Trio Chemistry Types (3-player synergies)
// ============================================================================

/**
 * Minimum games required for trio chemistry to be calculated
 */
export const TRIO_MIN_GAMES = 3;

/**
 * K value for trio confidence factor calculation
 */
export const TRIO_K_VALUE = 3;

/**
 * Base stats for a trio of players
 */
export interface TrioStats {
  /** Number of games played together as a trio */
  gamesTogether: number;
  /** Number of wins */
  wins: number;
  /** Number of draws */
  draws: number;
  /** Number of losses */
  losses: number;
  /** Win rate (0-100) - simple wins/games */
  winRate: number;
  /** Performance rate using points: (W*3 + D*1) / (G*3) * 100 */
  performanceRate: number;
  /** Confidence-weighted trio score: performanceRate × (games / (games + K)) */
  trioScore: number;
  /** Confidence-weighted curse score: (100 - performanceRate) × (games / (games + K)) */
  curseScore: number;
}

/**
 * Trio data for leaderboards (dream teams / cursed trios)
 */
export interface TrioLeaderboard extends TrioStats {
  /** First player's ID */
  player1Id: string;
  /** First player's name */
  player1Name: string;
  /** Second player's ID */
  player2Id: string;
  /** Second player's name */
  player2Name: string;
  /** Third player's ID */
  player3Id: string;
  /** Third player's name */
  player3Name: string;
}

/**
 * Trio data for a specific player's best trios
 */
export interface PlayerTrio extends TrioStats {
  /** First partner's ID */
  partner1Id: string;
  /** First partner's name */
  partner1Name: string;
  /** Second partner's ID */
  partner2Id: string;
  /** Second partner's name */
  partner2Name: string;
}

/**
 * Raw database response from get_trio_leaderboard RPC
 */
export interface TrioLeaderboardResponse {
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  player3_id: string;
  player3_name: string;
  games_together: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: string | number;
  trio_score: string | number;
}

/**
 * Raw database response from get_player_best_trios RPC
 */
export interface PlayerBestTriosResponse {
  partner1_id: string;
  partner1_name: string;
  partner2_id: string;
  partner2_name: string;
  games_together: number;
  wins: number;
  draws: number;
  losses: number;
  win_rate: string | number;
  trio_score: string | number;
}

/**
 * Transform raw database response to TrioLeaderboard
 * Recalculates scores using points system: Win=3, Draw=1, Loss=0
 */
export function transformTrioLeaderboard(raw: TrioLeaderboardResponse): TrioLeaderboard {
  const games = Number(raw.games_together);
  const wins = Number(raw.wins);
  const draws = Number(raw.draws);
  const losses = Number(raw.losses);

  // Calculate performance rate using points system
  const pointsEarned = (wins * 3) + (draws * 1);
  const pointsAvailable = games * 3;
  const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

  // Confidence-weighted trio score (for dream teams)
  const confidenceFactor = games / (games + TRIO_K_VALUE);
  const trioScore = performanceRate * confidenceFactor;

  // Confidence-weighted curse score (for cursed trios)
  // Higher score = more definitively cursed (more games at low performance)
  const curseScore = (100 - performanceRate) * confidenceFactor;

  return {
    player1Id: raw.player1_id,
    player1Name: raw.player1_name,
    player2Id: raw.player2_id,
    player2Name: raw.player2_name,
    player3Id: raw.player3_id,
    player3Name: raw.player3_name,
    gamesTogether: games,
    wins,
    draws,
    losses,
    winRate: Number(raw.win_rate), // Keep original for backwards compatibility
    performanceRate,
    trioScore,
    curseScore,
  };
}

/**
 * Transform raw database response to PlayerTrio
 * Recalculates scores using points system: Win=3, Draw=1, Loss=0
 */
export function transformPlayerTrio(raw: PlayerBestTriosResponse): PlayerTrio {
  const games = Number(raw.games_together);
  const wins = Number(raw.wins);
  const draws = Number(raw.draws);
  const losses = Number(raw.losses);

  // Calculate performance rate using points system
  const pointsEarned = (wins * 3) + (draws * 1);
  const pointsAvailable = games * 3;
  const performanceRate = pointsAvailable > 0 ? (pointsEarned / pointsAvailable) * 100 : 0;

  // Confidence-weighted scores
  const confidenceFactor = games / (games + TRIO_K_VALUE);
  const trioScore = performanceRate * confidenceFactor;
  const curseScore = (100 - performanceRate) * confidenceFactor;

  return {
    partner1Id: raw.partner1_id,
    partner1Name: raw.partner1_name,
    partner2Id: raw.partner2_id,
    partner2Name: raw.partner2_name,
    gamesTogether: games,
    wins,
    draws,
    losses,
    winRate: Number(raw.win_rate), // Keep original for backwards compatibility
    performanceRate,
    trioScore,
    curseScore,
  };
}

// ============================================================================
// Team Placement Types (Same team vs Opposite team frequency)
// ============================================================================

/**
 * Minimum games required for team placement stats to be calculated
 */
export const TEAM_PLACEMENT_MIN_GAMES = 5;

/**
 * Pair-specific team placement stats (for viewing your relationship with another player)
 */
export interface PairTeamPlacement {
  /** Total games where both players participated */
  totalGames: number;
  /** Games where both were on the same team */
  gamesTogether: number;
  /** Games where they were on opposite teams */
  gamesAgainst: number;
  /** Percentage of games on the same team (0-100) */
  togetherRate: number;
}

/**
 * Raw database response from get_player_pair_team_placement RPC
 */
export interface PairTeamPlacementResponse {
  total_games: number;
  games_together: number;
  games_against: number;
  together_rate: string | number;
}

/**
 * Team placement partner for global view (frequent teammates/opponents)
 */
export interface TeamPlacementPartner {
  /** Partner player's ID */
  partnerId: string;
  /** Partner player's name */
  partnerName: string;
  /** Total games where both played */
  totalGames: number;
  /** Games on same team */
  gamesTogether: number;
  /** Games on opposite teams */
  gamesAgainst: number;
  /** Percentage on same team (0-100) */
  togetherRate: number;
  /** Percentage on opposite teams (0-100) */
  againstRate: number;
}

/**
 * Raw database response from get_player_team_placements RPC
 */
export interface TeamPlacementResponse {
  partner_id: string;
  partner_name: string;
  total_games: number;
  games_together: number;
  games_against: number;
  together_rate: string | number;
  against_rate: string | number;
}

/**
 * Transform raw database response to PairTeamPlacement
 */
export function transformPairTeamPlacement(raw: PairTeamPlacementResponse): PairTeamPlacement {
  return {
    totalGames: Number(raw.total_games),
    gamesTogether: Number(raw.games_together),
    gamesAgainst: Number(raw.games_against),
    togetherRate: Number(raw.together_rate),
  };
}

/**
 * Transform raw database response to TeamPlacementPartner
 */
export function transformTeamPlacementPartner(raw: TeamPlacementResponse): TeamPlacementPartner {
  return {
    partnerId: raw.partner_id,
    partnerName: raw.partner_name,
    totalGames: Number(raw.total_games),
    gamesTogether: Number(raw.games_together),
    gamesAgainst: Number(raw.games_against),
    togetherRate: Number(raw.together_rate),
    againstRate: Number(raw.against_rate),
  };
}
