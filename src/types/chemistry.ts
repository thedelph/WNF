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
 * Transform raw database response to ChemistryPair
 */
export function transformChemistryPair(raw: ChemistryPairResponse): ChemistryPair {
  return {
    player1Id: raw.player1_id,
    player1Name: raw.player1_name,
    player2Id: raw.player2_id,
    player2Name: raw.player2_name,
    gamesTogether: Number(raw.games_together),
    winsTogether: Number(raw.wins_together),
    drawsTogether: Number(raw.draws_together),
    lossesTogether: Number(raw.losses_together),
    performanceRate: Number(raw.performance_rate),
    chemistryScore: Number(raw.chemistry_score),
  };
}

/**
 * Transform raw database response to ChemistryStats
 */
export function transformChemistryStats(raw: PairChemistryResponse): ChemistryStats {
  return {
    gamesTogether: Number(raw.games_together),
    winsTogether: Number(raw.wins_together),
    drawsTogether: Number(raw.draws_together),
    lossesTogether: Number(raw.losses_together),
    performanceRate: Number(raw.performance_rate),
    chemistryScore: Number(raw.chemistry_score),
  };
}

/**
 * Transform raw database response to ChemistryPartner
 */
export function transformChemistryPartner(raw: TopPartnerResponse): ChemistryPartner {
  return {
    partnerId: raw.partner_id,
    partnerName: raw.partner_name,
    gamesTogether: Number(raw.games_together),
    winsTogether: Number(raw.wins_together),
    drawsTogether: Number(raw.draws_together),
    lossesTogether: Number(raw.losses_together),
    performanceRate: Number(raw.performance_rate),
    chemistryScore: Number(raw.chemistry_score),
  };
}

/**
 * Minimum games required for chemistry to be calculated
 */
export const CHEMISTRY_MIN_GAMES = 10;

/**
 * K value for confidence factor calculation
 */
export const CHEMISTRY_K_VALUE = 10;
