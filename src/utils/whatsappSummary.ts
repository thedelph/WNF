/**
 * WhatsApp Summary Selection Logic
 *
 * Selects the most interesting insights for WhatsApp sharing.
 * See docs/features/WhatsAppSummaryRules.md for full documentation.
 */

import { PostMatchInsight, ConfidenceThreshold, getInsightEmoji } from '../hooks/usePostMatchAnalysis';

// ============================================
// Types
// ============================================

export interface SelectionConfig {
  maxInsights: number;
  maxPerCategory: number;
  excludedTypes: string[];
  maxPlayersPerInsight: number;
}

export interface GameSummary {
  sequenceNumber: number;
  scoreBlue: number;
  scoreOrange: number;
  outcome: 'blue_win' | 'orange_win' | 'draw';
}

interface ScoredInsight extends PostMatchInsight {
  category: string;
  magnitude: number;
  impressiveness: number;
  newPlayerCount?: number;
}

// ============================================
// Configuration
// ============================================

export const DEFAULT_CONFIG: SelectionConfig = {
  maxInsights: 6,
  maxPerCategory: 1,
  excludedTypes: [
    'chemistry_curse',
    'trio_cursed',
    'losing_streak',
    'winless_streak',
    'rivalry_nemesis',
    'player_color_curse',
    'injury_token_used',
    'never_beaten_rivalry',
    'rivalry_ongoing_drought',
    'trophy_retained',
  ],
  maxPlayersPerInsight: 5,
};

// ============================================
// Category Mapping
// ============================================

/**
 * Maps analysis types to granular categories.
 * This ensures variety in the summary (max 1 per category).
 */
const CATEGORY_MAP: Record<string, string> = {
  // Debut - guaranteed own category
  debut_appearance: 'debut',
  // Return appearances (non-debut)
  return_after_absence: 'return',
  first_game_back_win: 'return',
  // Trophy changes
  trophy_change: 'trophy',
  trophy_new: 'trophy',
  trophy_extended: 'trophy',
  trophy_defended: 'trophy',
  // Rivalry - split into first wins, perfect records, and other
  rivalry_first_win: 'rivalry_first_win',
  first_ever_win_nemesis: 'rivalry_first_win',
  rivalry_perfect: 'rivalry_perfect',  // Own category - undefeated record is distinct achievement
  rivalry_dominant: 'rivalry_other',
  rivalry_close: 'rivalry_other',
  rivalry_revenge: 'rivalry_other',
  // Partnership - split into first vs milestone
  partnership_milestone: 'partnership_milestone',
  partnership_first: 'partnership_first',
  // Chemistry - split into duo vs milestone
  chemistry_kings: 'chemistry_duo',
  chemistry_duo: 'chemistry_duo',
  chemistry_milestone: 'chemistry_milestone',
  // Trio
  trio_dream_team: 'trio',
  chemistry_trio: 'trio',
  // Cap milestones
  cap_milestone: 'cap',
  // Attendance streaks (separate from win/loss)
  attendance_streak: 'attendance',
  // Win/loss streaks
  win_streak: 'streak',
  winning_streak: 'streak',
  unbeaten_streak: 'streak',
  losing_streak_ended: 'streak',
  winless_streak_ended: 'streak',
  // Team color streaks
  team_color_streak_broken: 'team_streak',
  team_streak: 'team_streak',
  // Game records
  game_record: 'record',
  team_best_score: 'record',
  blowout_game: 'record',
  shutout_game: 'record',
  low_scoring_game: 'record',
  // Team color dominance (own category)
  team_color_dominance: 'team_dominance',
  // Awards
  award_defending_champion: 'award',
  // Injury return (positive)
  injury_token_return: 'injury_return',
  // Bench warmer
  bench_warmer_promoted: 'bench_warmer',
};

/**
 * Get the granular category for an insight type.
 */
export function getCategory(analysisType: string): string {
  // Check exact match first
  if (CATEGORY_MAP[analysisType]) {
    return CATEGORY_MAP[analysisType];
  }

  // Check prefixes for catch-all categories
  if (analysisType.startsWith('trophy')) return 'trophy';
  if (analysisType.startsWith('rivalry')) return 'rivalry_other';
  if (analysisType.startsWith('trio_dream')) return 'trio';
  if (analysisType.startsWith('award')) return 'award';
  if (analysisType.startsWith('team_best')) return 'record';
  if (analysisType.startsWith('blowout')) return 'record';
  if (analysisType.startsWith('shutout')) return 'record';
  if (analysisType.startsWith('low_scoring')) return 'record';
  if (analysisType.startsWith('team_color_dominance')) return 'team_dominance';
  if (analysisType.startsWith('team_color_streak')) return 'team_streak';
  if (analysisType.startsWith('team_streak')) return 'team_streak';

  return 'other';
}

// ============================================
// Magnitude Extraction
// ============================================

/**
 * Calculate Bayesian-adjusted score that balances win rate AND sample size.
 * Formula: (wins + k*0.5) / (games + k) where k is smoothing factor
 *
 * This adds k "phantom games" at 50%, which:
 * - Rewards high win rates
 * - Penalizes small samples (low confidence)
 *
 * k is proportional to the typical sample size for each category:
 * - Trios (k ≈ 6): smaller samples, lower k
 * - Chemistry (k ≈ 14): medium samples
 * - Rivalries (k ≈ 17): larger samples, higher k
 *
 * @param wins Number of wins
 * @param games Total games played
 * @param k Smoothing factor (proportional to typical sample size)
 * @returns Bayesian score as percentage (0-100)
 */
function bayesianScore(wins: number, games: number, k: number): number {
  if (games <= 0) return 0;
  const adjustedScore = (wins + k * 0.5) / (games + k);
  return Math.round(adjustedScore * 100);
}

/**
 * Default k values for each category (fallback when thresholds not available)
 * Based on typical sample sizes: k ≈ 33rd percentile of games together
 */
const DEFAULT_K_VALUES: Record<string, number> = {
  trio: 6,
  chemistry: 14,
  rivalry: 17,
  partnership: 15,
};

/**
 * Get the smoothing factor k for a category based on confidence thresholds.
 * Uses the low threshold (33rd percentile) as k - proportional to typical sample size.
 */
function getKForCategory(
  category: string,
  thresholds?: Record<string, ConfidenceThreshold>
): number {
  if (thresholds) {
    const threshold = thresholds[category];
    if (threshold?.lowThreshold) {
      return threshold.lowThreshold;
    }
  }
  return DEFAULT_K_VALUES[category] ?? 5;
}

/**
 * Extract the sample size / magnitude from an insight's details.
 * Higher magnitude = more impressive within the same type.
 *
 * For insights with win/loss records (trios, chemistry, rivalries),
 * uses Bayesian confidence scoring that balances win rate AND sample size.
 * The smoothing factor k is proportional to typical sample size for each category.
 */
export function getMagnitude(
  insight: PostMatchInsight,
  thresholds?: Record<string, ConfidenceThreshold>
): number {
  const d = insight.details;
  const type = insight.analysisType;

  // Attendance streaks - raw streak count
  if (type === 'attendance_streak') {
    return (d.streak as number) ?? 0;
  }

  // Win/unbeaten streaks - raw streak count
  if (type === 'win_streak' || type === 'winning_streak' || type === 'unbeaten_streak') {
    return (d.streak as number) ?? 0;
  }

  // Ended streaks - the streak that was ended
  if (type === 'losing_streak_ended' || type === 'winless_streak_ended') {
    return (d.ended_streak as number) ?? 0;
  }

  // Cap milestone - raw caps count
  if (type === 'cap_milestone') {
    return (d.caps as number) ?? 0;
  }

  // Return after absence - games missed
  if (type === 'return_after_absence' || type === 'first_game_back_win') {
    return (d.games_missed as number) ?? 0;
  }

  // Injury return - return streak
  if (type === 'injury_token_return') {
    return (d.return_streak as number) ?? 0;
  }

  // Rivalry first win - previous losses (more losses = more impressive first win)
  if (type === 'rivalry_first_win' || type === 'first_ever_win_nemesis') {
    return (d.previous_losses as number) ?? 0;
  }

  // ============================================
  // Bayesian confidence scoring for win/loss stats
  // Balances win rate AND sample size
  // k is proportional to typical sample size for each category
  // ============================================

  // Trio insights: Bayesian score from wins/games
  if (type.includes('trio')) {
    const k = getKForCategory('trio', thresholds);
    const games = (d.total as number) ?? (d.games_together as number) ?? 0;
    const winRate = (d.win_rate as number) ?? 0;
    const wins = (d.wins as number) ?? (games > 0 ? Math.round(games * winRate / 100) : 0);
    return bayesianScore(wins, games, k);
  }

  // Chemistry duos (chemistry_kings): Bayesian score from wins/games
  if (type === 'chemistry_kings' || type === 'chemistry_duo') {
    const k = getKForCategory('chemistry', thresholds);
    const games = (d.games_together as number) ?? (d.total as number) ?? 0;
    const winRate = (d.win_rate as number) ?? 0;
    const wins = (d.wins as number) ?? (games > 0 ? Math.round(games * winRate / 100) : 0);
    return bayesianScore(wins, games, k);
  }

  // Chemistry milestone: Bayesian if we have games, otherwise raw wins
  if (type === 'chemistry_milestone') {
    const k = getKForCategory('chemistry', thresholds);
    const games = (d.games_together as number) ?? (d.total as number) ?? 0;
    const wins = (d.wins as number) ?? 0;
    if (games > 0) {
      return bayesianScore(wins, games, k);
    }
    return wins;
  }

  // Partnership milestone: Bayesian if we have win data, otherwise raw games
  if (type === 'partnership_milestone') {
    const k = getKForCategory('partnership', thresholds);
    const games = (d.games_together as number) ?? 0;
    const winRate = (d.win_rate as number) ?? 0;
    const wins = (d.wins as number) ?? (games > 0 && winRate > 0 ? Math.round(games * winRate / 100) : 0);
    if (wins > 0 && games > 0) {
      return bayesianScore(wins, games, k);
    }
    // Fallback to raw games if no win data
    return games;
  }

  // Rivalry with W-D-L record: Bayesian score treating wins as successes
  // Record format: "W-D-L" e.g., "13-4-14"
  if (type.includes('rivalry') && d.record) {
    const k = getKForCategory('rivalry', thresholds);
    const record = d.record as string;
    const parts = record.split('-').map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      const [wins, draws, losses] = parts;
      const games = wins + draws + losses;
      // For rivalries, count wins + 0.5*draws as "success" (draw is half a win)
      const effectiveWins = wins + draws * 0.5;
      return bayesianScore(effectiveWins, games, k);
    }
  }

  // Rivalry with total_games but no record: fallback to raw count
  if (type.includes('rivalry') && d.total_games) {
    return (d.total_games as number) ?? 0;
  }

  // Other chemistry insights: raw games together
  if (type.includes('chemistry')) {
    return (d.total as number) ?? (d.games_together as number) ?? 0;
  }

  return 0;
}

// ============================================
// Impressiveness Calculation
// ============================================

/**
 * Calculate impressiveness z-score based on sample size relative to population.
 * Higher z-score = more impressive (sample size is above average).
 */
export function calculateImpressiveness(
  insight: PostMatchInsight,
  thresholds: Record<string, ConfidenceThreshold>
): number {
  const category = getCategory(insight.analysisType);
  const magnitude = getMagnitude(insight);

  if (magnitude === 0) {
    return 0;
  }

  // Map granular categories to threshold categories
  const thresholdCategory = mapToThresholdCategory(category);
  const threshold = thresholds[thresholdCategory];

  if (!threshold) {
    // No threshold data, use magnitude directly (normalized to 0-1 range)
    return magnitude / 100;
  }

  // Calculate z-score using low/high thresholds as proxy for mean/stddev
  // low = ~33rd percentile, high = ~67th percentile
  // Approximate mean = (low + high) / 2
  // Approximate stddev = (high - low) / 0.86 (difference between 33rd and 67th percentile in normal dist)
  const mean = (threshold.lowThreshold + threshold.highThreshold) / 2;
  const stddev = (threshold.highThreshold - threshold.lowThreshold) / 0.86;

  if (stddev === 0) {
    return magnitude > mean ? 1 : 0;
  }

  return (magnitude - mean) / stddev;
}

/**
 * Map granular categories to threshold categories.
 */
function mapToThresholdCategory(category: string): string {
  if (category.startsWith('rivalry')) return 'rivalry';
  if (category.startsWith('partnership')) return 'partnership';
  if (category.startsWith('chemistry')) return 'chemistry';
  if (category === 'trio') return 'trio';
  return category;
}

// ============================================
// Selection Algorithm
// ============================================

/**
 * Select the most interesting insights for WhatsApp summary.
 *
 * Algorithm:
 * 1. Filter excluded types
 * 2. Score each insight (category, magnitude, impressiveness)
 * 3. Phase 1: Pick best from each category
 * 4. Phase 2: Fill remaining with new categories + new players
 * 5. Phase 3: Fill remaining allowing category repeats
 */
export function selectWhatsAppInsights(
  insights: PostMatchInsight[],
  thresholds: Record<string, ConfidenceThreshold>,
  config: Partial<SelectionConfig> = {}
): PostMatchInsight[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Step 1: Filter and score insights
  // Pass thresholds to getMagnitude for dynamic Bayesian k values
  const scoredInsights: ScoredInsight[] = insights
    .filter((insight) => !cfg.excludedTypes.includes(insight.analysisType))
    .map((insight) => ({
      ...insight,
      category: getCategory(insight.analysisType),
      magnitude: getMagnitude(insight, thresholds),
      impressiveness: calculateImpressiveness(insight, thresholds),
    }));

  if (scoredInsights.length === 0) {
    return [];
  }

  const selected: ScoredInsight[] = [];
  const selectedIds = new Set<string>();
  const selectedCategories = new Set<string>();
  const mentionedPlayers = new Set<string>();

  // Step 2: Phase 1 - Best insight from each category with player deduplication
  // Get all candidates per category, then select while avoiding player overlap
  const candidatesPerCategory = getCandidatesPerCategory(scoredInsights);

  // Get categories sorted by their best candidate's priority
  const sortedCategories = [...candidatesPerCategory.entries()]
    .map(([category, candidates]) => ({
      category,
      candidates,
      bestPriority: candidates[0]?.priority ?? 999,
      bestImpressiveness: candidates[0]?.impressiveness ?? 0,
    }))
    .sort((a, b) => {
      if (a.bestPriority !== b.bestPriority) return a.bestPriority - b.bestPriority;
      return b.bestImpressiveness - a.bestImpressiveness;
    });

  // Select one from each category, preferring insights without player overlap
  for (const { category, candidates } of sortedCategories) {
    if (selected.length >= cfg.maxInsights) break;

    const insight = selectBestWithoutOverlap(candidates, mentionedPlayers, cfg.maxPlayersPerInsight);
    if (!insight) continue;

    selected.push(insight);
    selectedIds.add(insight.id);
    selectedCategories.add(category);

    // Track mentioned players (only for small player lists)
    if (insight.playerIds.length <= cfg.maxPlayersPerInsight) {
      insight.playerIds.forEach((pid) => mentionedPlayers.add(pid));
    }
  }

  // Step 3: Phase 2 - Fill remaining with new categories + new players
  // Strictly enforces max 1 per category - we'd rather show fewer insights
  // than repeat categories (e.g., showing 3 rivalry insights)
  if (selected.length < cfg.maxInsights) {
    const remaining = scoredInsights
      .filter(
        (insight) =>
          !selectedIds.has(insight.id) &&
          !selectedCategories.has(insight.category) &&
          (insight.playerIds.length === 0 || insight.playerIds.length <= cfg.maxPlayersPerInsight)
      )
      .map((insight) => ({
        ...insight,
        newPlayerCount: insight.playerIds.filter((pid) => !mentionedPlayers.has(pid)).length,
      }))
      .sort((a, b) => {
        // Prefer insights with NEW players first
        if ((a.newPlayerCount ?? 0) !== (b.newPlayerCount ?? 0))
          return (b.newPlayerCount ?? 0) - (a.newPlayerCount ?? 0);
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.impressiveness !== b.impressiveness) return b.impressiveness - a.impressiveness;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    for (const insight of remaining) {
      if (selected.length >= cfg.maxInsights) break;

      // Strict deduplication: skip insights with ANY player overlap
      const hasOverlap = insight.playerIds.some((pid) => mentionedPlayers.has(pid));
      if (hasOverlap) continue;

      selected.push(insight);
      selectedIds.add(insight.id);
      selectedCategories.add(insight.category);

      if (insight.playerIds.length <= cfg.maxPlayersPerInsight) {
        insight.playerIds.forEach((pid) => mentionedPlayers.add(pid));
      }
    }
  }

  // Note: We intentionally do NOT have a Phase 3 that allows category repeats.
  // Max 1 per category is strictly enforced - better to show 4-5 diverse insights
  // than 6 insights with 3 of the same type (e.g., rivalry_close).

  // Return as PostMatchInsight[] (strip scoring fields)
  return selected.map(({ category, magnitude, impressiveness, newPlayerCount, ...insight }) => insight);
}

/**
 * Get ALL candidates per category, sorted by quality.
 * This allows us to try alternatives when the best candidate has player overlap.
 */
function getCandidatesPerCategory(insights: ScoredInsight[]): Map<string, ScoredInsight[]> {
  const candidates = new Map<string, ScoredInsight[]>();

  for (const insight of insights) {
    const existing = candidates.get(insight.category) || [];
    existing.push(insight);
    candidates.set(insight.category, existing);
  }

  // Sort each category's candidates by quality
  for (const [category, categoryInsights] of candidates) {
    categoryInsights.sort((a, b) => {
      // Priority (lower = better)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Impressiveness (higher = better)
      if (a.impressiveness !== b.impressiveness) return b.impressiveness - a.impressiveness;
      // Created at (earlier = better)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    candidates.set(category, categoryInsights);
  }

  return candidates;
}

/**
 * Select best insight from category with NO player overlap.
 * Returns null if all candidates have overlap - caller should try other categories.
 */
function selectBestWithoutOverlap(
  candidates: ScoredInsight[],
  mentionedPlayers: Set<string>,
  maxPlayersPerInsight: number
): ScoredInsight | null {
  if (candidates.length === 0) return null;

  // Find candidate with NO overlapping players
  for (const candidate of candidates) {
    if (candidate.playerIds.length > maxPlayersPerInsight) continue;
    const hasOverlap = candidate.playerIds.some((pid) => mentionedPlayers.has(pid));
    if (!hasOverlap) {
      return candidate;
    }
  }

  // No candidates without overlap - return null to try other categories
  // This ensures maximum player variety in the WhatsApp summary
  return null;
}

// ============================================
// WhatsApp Message Formatting
// ============================================

/**
 * Format the selected insights into a WhatsApp message.
 */
export function formatWhatsAppSummary(
  game: GameSummary,
  selectedInsights: PostMatchInsight[]
): string {
  let summary = `🏟️ *WNF #${game.sequenceNumber}*: `;

  // Score line
  if (game.outcome === 'draw') {
    summary += `🔵 Blue ${game.scoreBlue}-${game.scoreOrange} Orange 🟠 (Draw)`;
  } else {
    summary += `🔵 Blue ${game.scoreBlue}-${game.scoreOrange} Orange 🟠`;
  }

  summary += '\n\n📊 *Post-Match Analysis*\n';

  // Add insights with emojis
  if (selectedInsights.length === 0) {
    summary += '\nNo notable changes this week.';
  } else {
    selectedInsights.forEach((insight, index) => {
      const emoji = getInsightEmoji(insight.analysisType);
      // Strip any leading emoji from headline to avoid duplicates
      // Emoji pattern matches common emoji ranges including variation selectors
      const headlineWithoutLeadingEmoji = insight.headline.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}-\u{2B55}]\uFE0F?\s*/u, '');
      summary += `\n${index + 1}. ${emoji} ${headlineWithoutLeadingEmoji}`;
    });
  }

  return summary;
}
