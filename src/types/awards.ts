/**
 * Types for the WNF Awards/Trophy system
 */

export type MedalType = 'gold' | 'silver' | 'bronze';

export type AwardCategory =
  | 'xp_champion'
  | 'win_rate_leader'
  | 'net_positive'
  | 'iron_man'
  | 'hot_streak'
  | 'the_wall'
  | 'appearance_king'
  | 'dynamic_duo'        // Best chemistry pair
  | 'cursed_duos'        // Worst chemistry pair
  | 'best_buddies'
  | 'fiercest_rivalry'   // Most lopsided head-to-head
  | 'dream_team_trio'    // Best trio chemistry
  | 'cursed_trio'        // Worst trio chemistry
  | 'blue_blood'
  | 'dutch_master'
  | 'super_sub';

/**
 * Award data from the database
 */
export interface Award {
  id: string;
  playerId: string;
  playerName: string;
  category: AwardCategory;
  medalType: MedalType;
  year: number | null; // null for all-time awards
  value: number;
  partnerId?: string;
  partnerName?: string;
  partner2Id?: string;    // For trio awards (dream_team_trio)
  partner2Name?: string;  // For trio awards (dream_team_trio)
  awardedAt: string;
}

/**
 * Raw award data from Supabase RPC
 */
export interface AwardFromDB {
  id: string;
  player_id: string;
  player_name: string;
  award_category: string;
  medal_type: string;
  award_year: number | null;
  value: number;
  partner_id: string | null;
  partner_name: string | null;
  partner2_id: string | null;    // For trio awards
  partner2_name: string | null;  // For trio awards
  awarded_at: string;
}

/**
 * Player trophy from the database (for Trophy Cabinet)
 */
export interface PlayerTrophy {
  id: string;
  category: AwardCategory;
  medalType: MedalType;
  year: number | null;
  value: number;
  partnerId?: string;
  partnerName?: string;
  partner2Id?: string;    // For trio awards
  partner2Name?: string;  // For trio awards
  awardedAt: string;
}

/**
 * Raw trophy data from Supabase RPC
 */
export interface PlayerTrophyFromDB {
  id: string;
  award_category: string;
  medal_type: string;
  award_year: number | null;
  value: number;
  partner_id: string | null;
  partner_name: string | null;
  partner2_id: string | null;    // For trio awards
  partner2_name: string | null;  // For trio awards
  awarded_at: string;
}

/**
 * Trophy counts for a player
 */
export interface TrophyCounts {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
}

/**
 * Configuration for an award category (display info)
 */
export interface AwardCategoryConfig {
  id: AwardCategory;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  valueFormatter: (value: number) => string;
  isPairAward: boolean;
  isTrioAward?: boolean; // For 3-player awards (dream_team_trio)
}

/**
 * Grouped awards by category for display
 */
export interface AwardsByCategory {
  category: AwardCategory;
  config: AwardCategoryConfig;
  awards: Award[];
}

/**
 * Awards page data structure
 */
export interface AwardsPageData {
  awards: Award[];
  awardsByCategory: AwardsByCategory[];
  loading: boolean;
  error: string | null;
}

/**
 * Trophy cabinet data for a player
 */
export interface TrophyCabinetData {
  trophies: PlayerTrophy[];
  counts: TrophyCounts;
  loading: boolean;
  error: string | null;
}

/**
 * Year filter type for awards
 */
export type AwardYearFilter = number | 'all';

/**
 * Extended award data for live "All Time" display
 * Includes W/D/L breakdown for chemistry-related awards
 */
export interface LiveAward extends Award {
  /** Number of wins (chemistry/trio awards) */
  wins?: number;
  /** Number of draws (chemistry/trio awards) */
  draws?: number;
  /** Number of losses (chemistry/trio awards) */
  losses?: number;
  /** Number of games together (chemistry/buddies/trio awards) */
  gamesTogether?: number;
  /** Win percentage (rivalry awards) */
  winPercentage?: number;
  /** Number of games against opponent (rivalry awards) */
  gamesAgainst?: number;
  /** Date when the achievement was recorded (XP Champion, streaks) */
  achievedDate?: string;
}
