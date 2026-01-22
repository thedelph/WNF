/**
 * InsightsSection - Filterable post-match insights display
 * Shows trophy changes, streaks, chemistry, rivalries with tab filtering
 * Supports player filtering and highlights logged-in user's insights
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Flame, Users, Swords, Medal, User, Filter, ChevronDown, ChevronUp, UserPlus, Gamepad2, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PostMatchInsight, getInsightEmoji, useConfidenceThresholds, ConfidenceThreshold } from '../../hooks/usePostMatchAnalysis';
import { useUser } from '../../hooks/useUser';
import { useAuth } from '../../context/AuthContext';

type InsightFilter = 'all' | 'trophies' | 'streaks' | 'chemistry' | 'rivalries' | 'appearances' | 'game' | 'milestones';

// Player info for the filter dropdown
export interface GamePlayer {
  id: string;
  friendly_name: string;
}

interface InsightsSectionProps {
  insights: PostMatchInsight[];
  loading?: boolean;
  gamePlayers?: GamePlayer[];
  defaultExpanded?: boolean;
}

// Map analysis types to filter categories
const getFilterCategory = (analysisType: string): InsightFilter => {
  // Trophy insights (Hall of Fame changes + year-over-year awards)
  if (analysisType.startsWith('trophy_') || analysisType.startsWith('award_')) return 'trophies';

  // Streak insights (win/loss/unbeaten/attendance streaks + injury token stats)
  if (
    analysisType.includes('streak') ||
    analysisType.includes('team_streak') ||
    analysisType === 'injury_token_used' ||
    analysisType === 'injury_token_return'
  ) return 'streaks';

  // Chemistry insights (partnerships, duos, trios)
  if (analysisType.includes('chemistry') || analysisType.includes('trio') || analysisType.includes('partnership')) return 'chemistry';

  // Rivalry insights (head-to-head matchups)
  if (analysisType.includes('rivalry') || analysisType === 'never_beaten_rivalry' || analysisType === 'first_ever_win_nemesis') return 'rivalries';

  // Appearance insights (debuts, returns, bench promotions)
  if (
    analysisType === 'debut_appearance' ||
    analysisType === 'return_after_absence' ||
    analysisType === 'first_game_back_win' ||
    analysisType === 'bench_warmer_promoted'
  ) return 'appearances';

  // Game insights (game-level events: scores, team colors, dominance)
  if (
    analysisType === 'game_record' ||
    analysisType === 'blowout_game' ||
    analysisType === 'shutout_game' ||
    analysisType === 'team_color_loyalty' ||
    analysisType === 'team_color_switch' ||
    analysisType === 'low_scoring_game' ||
    analysisType === 'team_best_score' ||
    analysisType === 'team_color_dominance' ||
    analysisType === 'team_color_streak_broken' ||
    analysisType === 'player_color_curse'
  ) return 'game';

  // Milestone insights (personal achievements)
  if (
    analysisType.includes('milestone') ||
    analysisType.includes('personal_best')
  ) return 'milestones';

  return 'all';
};

// Filter configuration
const FILTERS: { id: InsightFilter; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { id: 'all', label: 'All', shortLabel: 'All', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'trophies', label: 'Trophies', shortLabel: 'Trophy', icon: <Trophy className="w-4 h-4" /> },
  { id: 'streaks', label: 'Streaks', shortLabel: 'Streak', icon: <Flame className="w-4 h-4" /> },
  { id: 'chemistry', label: 'Chemistry', shortLabel: 'Chem', icon: <Users className="w-4 h-4" /> },
  { id: 'rivalries', label: 'Rivalries', shortLabel: 'Rival', icon: <Swords className="w-4 h-4" /> },
  { id: 'appearances', label: 'Appearances', shortLabel: 'Appear', icon: <UserPlus className="w-4 h-4" /> },
  { id: 'game', label: 'Game', shortLabel: 'Game', icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'milestones', label: 'Milestones', shortLabel: 'Miles', icon: <Target className="w-4 h-4" /> },
];

export const InsightsSection: React.FC<InsightsSectionProps> = ({
  insights,
  loading = false,
  gamePlayers = [],
  defaultExpanded = true,
}) => {
  const { user } = useAuth();
  const { player: currentPlayer } = useUser();
  const { thresholds: confidenceThresholds } = useConfidenceThresholds();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeFilter, setActiveFilter] = useState<InsightFilter>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');
  const [showAllInsights, setShowAllInsights] = useState(false);

  // How many insights to show initially (user insights + top priority)
  const INITIAL_DISPLAY_LIMIT = 12;

  // Get unique players mentioned in insights for the filter dropdown
  const playersInInsights = useMemo(() => {
    const playerMap = new Map<string, string>();

    insights.forEach(insight => {
      const details = insight.details as Record<string, unknown>;

      // Extract player IDs and names from details
      const mappings = [
        ['player_id', 'player_name'],
        ['winner_id', 'winner_name'],
        ['loser_id', 'loser_name'],
        ['holder_id', 'holder_name'],
        ['player1_id', 'player1_name'],
        ['player2_id', 'player2_name'],
        ['player3_id', 'player3_name'],
      ];

      mappings.forEach(([idKey, nameKey]) => {
        const id = details[idKey] as string | undefined;
        const name = details[nameKey] as string | undefined;
        if (id && name && !playerMap.has(id)) {
          playerMap.set(id, name);
        }
      });
    });

    // Convert to array and sort by name
    return Array.from(playerMap.entries())
      .map(([id, name]) => ({ id, friendly_name: name }))
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
  }, [insights]);

  // Check if an insight involves a specific player
  const insightInvolvesPlayer = (insight: PostMatchInsight, playerId: string): boolean => {
    // Check playerIds array first
    if (insight.playerIds?.includes(playerId)) return true;

    // Also check details for player IDs
    const details = insight.details as Record<string, unknown>;
    const idKeys = ['player_id', 'winner_id', 'loser_id', 'holder_id', 'player1_id', 'player2_id', 'player3_id'];

    return idKeys.some(key => details[key] === playerId);
  };

  // Filter insights based on active filter and selected player
  const filteredInsights = useMemo(() => {
    let result = insights;

    // Apply category filter
    if (activeFilter !== 'all') {
      result = result.filter(insight => getFilterCategory(insight.analysisType) === activeFilter);
    }

    // Apply player filter
    if (selectedPlayerId !== 'all') {
      result = result.filter(insight => insightInvolvesPlayer(insight, selectedPlayerId));
    }

    return result;
  }, [insights, activeFilter, selectedPlayerId]);

  // Limit initial display to top priority insights
  const displayedInsights = useMemo(() => {
    // If showing all or applying filters, return all filtered
    if (showAllInsights || activeFilter !== 'all' || selectedPlayerId !== 'all') {
      return filteredInsights;
    }

    // Otherwise, just show top priority insights (already sorted by priority from DB)
    return filteredInsights.slice(0, INITIAL_DISPLAY_LIMIT);
  }, [filteredInsights, showAllInsights, activeFilter, selectedPlayerId]);

  // How many are hidden
  const hiddenCount = filteredInsights.length - displayedInsights.length;

  // Count insights per category for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<InsightFilter, number> = {
      all: insights.length,
      trophies: 0,
      streaks: 0,
      chemistry: 0,
      rivalries: 0,
      appearances: 0,
      game: 0,
      milestones: 0,
    };

    insights.forEach(insight => {
      const category = getFilterCategory(insight.analysisType);
      if (category !== 'all') {
        counts[category]++;
      }
    });

    return counts;
  }, [insights]);

  // Count insights for current user (for "My Insights" quick filter)
  const currentUserInsightCount = useMemo(() => {
    if (!currentPlayer?.id) return 0;
    return insights.filter(insight => insightInvolvesPlayer(insight, currentPlayer.id)).length;
  }, [insights, currentPlayer?.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/50">
        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No post-match insights available for this game</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Post-Match Report
          <span className="badge badge-sm badge-primary">{insights.length}</span>
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-base-content/50" />
        ) : (
          <ChevronDown className="w-5 h-5 text-base-content/50" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              {/* Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Player Filter Controls */}
                <div className="flex items-center gap-2 ml-auto">
                  {/* Quick "My Insights" button - for logged-in users */}
                  {user && currentPlayer && (
                    <button
                      onClick={() => currentUserInsightCount > 0 && setSelectedPlayerId(
                        selectedPlayerId === currentPlayer.id ? 'all' : currentPlayer.id
                      )}
                      disabled={currentUserInsightCount === 0}
                      className={`btn btn-sm gap-1 ${
                        currentUserInsightCount === 0
                          ? 'btn-ghost opacity-50 cursor-not-allowed'
                          : selectedPlayerId === currentPlayer.id
                            ? 'btn-primary'
                            : 'btn-ghost'
                      }`}
                      title={currentUserInsightCount === 0 ? "You didn't play in this game" : undefined}
                    >
                      <User className="w-4 h-4" />
                      <span className="sm:hidden">Mine</span>
                      <span className="hidden sm:inline">My Insights</span>
                      <span className="badge badge-xs">{currentUserInsightCount}</span>
                    </button>
                  )}

                  {/* Full player dropdown - always available */}
                  {playersInInsights.length > 1 && (
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-sm btn-ghost gap-1">
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {selectedPlayerId === 'all'
                            ? 'All Players'
                            : playersInInsights.find(p => p.id === selectedPlayerId)?.friendly_name || 'Player'
                          }
                        </span>
                      </label>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-64 overflow-y-auto">
                        <li>
                          <a
                            onClick={() => setSelectedPlayerId('all')}
                            className={selectedPlayerId === 'all' ? 'active' : ''}
                          >
                            All Players
                          </a>
                        </li>
                        <li className="menu-title">
                          <span>Filter by Player</span>
                        </li>
                        {playersInInsights.map((player) => (
                          <li key={player.id}>
                            <a
                              onClick={() => setSelectedPlayerId(player.id)}
                              className={selectedPlayerId === player.id ? 'active' : ''}
                            >
                              {player.friendly_name}
                              {player.id === currentPlayer?.id && (
                                <span className="badge badge-xs badge-primary text-primary-content">You</span>
                              )}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="tabs tabs-boxed bg-base-200 p-1 flex-wrap">
                {FILTERS.map((filter) => {
                  const count = categoryCounts[filter.id];
                  // Hide filters with 0 items (except 'all')
                  if (filter.id !== 'all' && count === 0) return null;

                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`tab gap-1 flex-1 min-w-fit ${
                        activeFilter === filter.id ? 'tab-active' : ''
                      }`}
                    >
                      {filter.icon}
                      <span className="hidden sm:inline">{filter.label}</span>
                      <span className="sm:hidden">{filter.shortLabel}</span>
                      {filter.id !== 'all' && count > 0 && (
                        <span className="badge badge-xs">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active filters indicator */}
              {selectedPlayerId !== 'all' && (
                <div className="flex items-center gap-2 text-sm text-base-content/70">
                  <span>Showing insights for:</span>
                  <span className="badge badge-sm badge-primary text-primary-content">
                    {playersInInsights.find(p => p.id === selectedPlayerId)?.friendly_name}
                    {selectedPlayerId === currentPlayer?.id && ' (You)'}
                  </span>
                  <button
                    onClick={() => setSelectedPlayerId('all')}
                    className="btn btn-xs btn-ghost"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Insights Grid */}
              <AnimatePresence mode="popLayout">
                <div className="grid gap-3 md:grid-cols-2">
                  {displayedInsights.map((insight, index) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      index={index}
                      currentPlayerId={currentPlayer?.id}
                      confidenceThresholds={confidenceThresholds}
                    />
                  ))}
                </div>
              </AnimatePresence>

              {/* Show More Button */}
              {hiddenCount > 0 && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setShowAllInsights(true)}
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Show {hiddenCount} more insight{hiddenCount !== 1 ? 's' : ''}
                  </button>
                  <p className="text-xs text-base-content/50 mt-2">
                    Showing top highlights by priority
                  </p>
                </div>
              )}

              {/* Show Less Button */}
              {showAllInsights && filteredInsights.length > INITIAL_DISPLAY_LIMIT && activeFilter === 'all' && selectedPlayerId === 'all' && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setShowAllInsights(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Show less
                  </button>
                </div>
              )}

              {displayedInsights.length === 0 && (
                <div className="text-center py-6 text-base-content/50">
                  {selectedPlayerId !== 'all'
                    ? `No ${activeFilter === 'all' ? '' : activeFilter + ' '}insights for this player`
                    : `No ${activeFilter} insights for this game`
                  }
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Get medal icon for trophy insights
const getMedalIcon = (medalPosition: number | undefined): string => {
  switch (medalPosition) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '';
  }
};

// Format WDL stats for display
const formatWDL = (wins?: number, draws?: number, losses?: number): string | null => {
  if (wins === undefined || draws === undefined || losses === undefined) return null;
  return `${wins}W-${draws}D-${losses}L`;
};

// Individual Insight Card
interface InsightCardProps {
  insight: PostMatchInsight;
  index: number;
  currentPlayerId?: string;
  confidenceThresholds: Record<string, ConfidenceThreshold>;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, index, currentPlayerId, confidenceThresholds }) => {
  const emoji = getInsightEmoji(insight.analysisType);
  const category = getFilterCategory(insight.analysisType);
  const details = insight.details as Record<string, unknown>;

  // Check if current user is involved in this insight
  const isCurrentUserInvolved = useMemo(() => {
    if (!currentPlayerId) return false;

    // Check playerIds array
    if (insight.playerIds?.includes(currentPlayerId)) return true;

    // Check details for player IDs
    const idKeys = ['player_id', 'winner_id', 'loser_id', 'holder_id', 'player1_id', 'player2_id', 'player3_id'];

    return idKeys.some(key => details[key] === currentPlayerId);
  }, [insight, currentPlayerId, details]);

  // Get medal position for trophy insights
  const medalPosition = details.medal_position as number | undefined;
  const isTrophyInsight = insight.analysisType === 'trophy_change' || insight.analysisType.startsWith('award_');

  // Get WDL stats if available in details
  const wdlStats = useMemo(() => {
    const wins = details.wins as number | undefined;
    const draws = details.draws as number | undefined;
    const losses = details.losses as number | undefined;
    return formatWDL(wins, draws, losses);
  }, [details]);

  // Get win rate if available
  const winRate = details.win_rate as number | undefined;
  const pointsPct = details.points_pct as number | undefined;

  // Get sample size for insights with sample data
  const sampleSize = useMemo(() => {
    // Try various fields that contain sample sizes
    const games = details.games as number | undefined;
    const gamesTogether = details.games_together as number | undefined;
    const totalGames = details.total_games as number | undefined;
    const matchups = details.matchups as number | undefined;
    const encounters = details.encounters as number | undefined;
    const gamesOnColor = details.games_on_color as number | undefined;

    // Calculate from WDL if available (for rivalry insights)
    const wins = details.wins as number | undefined;
    const draws = details.draws as number | undefined;
    const losses = details.losses as number | undefined;
    const calculatedFromWDL = (wins !== undefined && draws !== undefined && losses !== undefined)
      ? wins + draws + losses
      : undefined;

    return games || gamesTogether || totalGames || matchups || encounters || gamesOnColor || calculatedFromWDL;
  }, [details]);

  // Determine confidence level using dynamic thresholds from database
  // Thresholds are calculated from actual data distribution (33rd/67th percentiles)
  const getConfidenceInfo = (size: number | undefined, analysisType: string): { label: string; color: string; tooltip: string } | null => {
    if (!size) return null;

    // Get the appropriate thresholds based on insight type
    let thresholds: ConfidenceThreshold | undefined;
    let categoryName = '';

    if (analysisType.includes('trio')) {
      thresholds = confidenceThresholds.trio;
      categoryName = 'trios';
    } else if (analysisType.includes('partnership')) {
      thresholds = confidenceThresholds.partnership;
      categoryName = 'partnerships';
    } else if (analysisType.includes('chemistry') || analysisType.includes('dynamic_duo')) {
      thresholds = confidenceThresholds.chemistry;
      categoryName = 'duos';
    } else if (analysisType.includes('rivalry') || analysisType.includes('nemesis') || analysisType.includes('never_beaten')) {
      thresholds = confidenceThresholds.rivalry;
      categoryName = 'rivalries';
    } else {
      thresholds = confidenceThresholds.other;
      categoryName = 'this type';
    }

    // Use defaults if thresholds not loaded
    const lowThreshold = thresholds?.lowThreshold ?? 10;
    const highThreshold = thresholds?.highThreshold ?? 20;

    if (size >= highThreshold) {
      return { label: 'High', color: 'badge-success', tooltip: `High confidence (${size} games, top third for ${categoryName})` };
    }
    if (size >= lowThreshold) {
      return { label: 'Med', color: 'badge-warning', tooltip: `Medium confidence (${size} games, typical for ${categoryName})` };
    }
    return { label: 'Low', color: 'badge-error', tooltip: `Low confidence (${size} games, bottom third for ${categoryName})` };
  };

  // Show confidence for percentage-based insights (chemistry, rivalries, partnerships, team color stats)
  const isPercentageInsight = insight.analysisType.includes('chemistry') ||
                              insight.analysisType.includes('trio') ||
                              insight.analysisType.includes('partnership') ||
                              insight.analysisType.includes('dynamic_duo') ||
                              insight.analysisType.includes('dream_team') ||
                              insight.analysisType.includes('rivalry') ||
                              insight.analysisType.includes('nemesis') ||
                              insight.analysisType.includes('fiercest') ||
                              insight.analysisType.includes('never_beaten') ||
                              insight.analysisType.includes('color_curse') ||
                              insight.analysisType.includes('color_dominance');
  const confidenceInfo = isPercentageInsight ? getConfidenceInfo(sampleSize, insight.analysisType) : null;

  // Priority-based styling - enhanced visual hierarchy
  const getPriorityStyles = () => {
    // If current user is involved, use special highlight (highest precedence)
    if (isCurrentUserInvolved) {
      return 'border-l-4 border-l-primary bg-primary/10 ring-1 ring-primary/30 shadow-md';
    }
    // Trophy insights get special gold/silver/bronze styling
    if (isTrophyInsight && medalPosition) {
      switch (medalPosition) {
        case 1: return 'border-l-4 border-l-yellow-500 bg-yellow-500/10 shadow-md';
        case 2: return 'border-l-4 border-l-gray-400 bg-gray-400/10 shadow-sm';
        case 3: return 'border-l-4 border-l-amber-600 bg-amber-600/10 shadow-sm';
      }
    }
    // Priority 1: Highest importance - red/error with glow effect
    if (insight.priority === 1) {
      return 'border-l-4 border-l-error bg-error/10 shadow-lg ring-2 ring-error/30';
    }
    // Priority 2: High importance - amber/warning with shadow
    if (insight.priority === 2) {
      return 'border-l-4 border-l-warning bg-warning/10 shadow-md';
    }
    // Priority 3: Medium importance - primary with subtle shadow
    if (insight.priority <= 3) {
      return 'border-l-4 border-l-primary bg-primary/5 shadow-sm';
    }
    // Priority 4-5: Low importance - neutral
    return 'border-l-4 border-l-base-300';
  };

  // Extract player names from details if available
  const getPlayerLinks = () => {
    // Try to find player names in details
    const playerNames: { id: string; name: string; isCurrentUser: boolean }[] = [];

    // Common patterns for player names in details (including partner for duo awards)
    const nameKeys = ['player_name', 'winner_name', 'loser_name', 'holder_name', 'player1_name', 'player2_name', 'player3_name', 'partner_name'];
    const idKeys = ['player_id', 'winner_id', 'loser_id', 'holder_id', 'player1_id', 'player2_id', 'player3_id', 'partner_id'];

    nameKeys.forEach((nameKey, i) => {
      const name = details[nameKey] as string | undefined;
      const id = details[idKeys[i]] as string | undefined;
      if (name && id) {
        playerNames.push({
          id,
          name,
          isCurrentUser: id === currentPlayerId
        });
      }
    });

    return playerNames;
  };

  const playerLinks = getPlayerLinks();

  // Get the icon to display (medal for trophies, emoji otherwise)
  const displayIcon = isTrophyInsight && medalPosition ? getMedalIcon(medalPosition) : emoji;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`card bg-base-100 shadow-sm ${getPriorityStyles()}`}
    >
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          {/* Icon/Emoji with background */}
          <div className={`text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${
            isTrophyInsight && medalPosition === 1 ? 'bg-yellow-500/20' :
            isTrophyInsight && medalPosition === 2 ? 'bg-gray-400/20' :
            isTrophyInsight && medalPosition === 3 ? 'bg-amber-600/20' :
            'bg-base-200'
          }`}>
            {displayIcon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {insight.headline}
            </p>

            {/* Stats row - show WDL and sample size when available */}
            {(wdlStats || confidenceInfo) && (
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-base-content/60">
                {/* WDL stats */}
                {wdlStats && !insight.headline.includes('W-') && !insight.headline.includes('D-') && (
                  <span className="font-mono bg-base-200 px-1.5 py-0.5 rounded">
                    {wdlStats}
                  </span>
                )}
                {/* Sample size and confidence */}
                {confidenceInfo && sampleSize && (
                  <span
                    className={`badge badge-xs ${confidenceInfo.color}`}
                    title={confidenceInfo.tooltip}
                  >
                    {sampleSize} games • {confidenceInfo.label}
                  </span>
                )}
              </div>
            )}

            {/* Player links */}
            {playerLinks.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {playerLinks.map((player) => (
                  <Link
                    key={player.id}
                    to={`/player/${player.id}`}
                    className={`badge badge-sm transition-colors ${
                      player.isCurrentUser
                        ? 'badge-primary text-primary-content'
                        : 'badge-outline hover:badge-primary hover:text-primary-content'
                    }`}
                  >
                    {player.name}
                    {player.isCurrentUser && (
                      <span className="ml-1 text-xs opacity-80">You</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* "You" indicator for highlighted cards */}
          {isCurrentUserInvolved && playerLinks.length === 0 && (
            <span className="badge badge-sm badge-primary text-primary-content">You</span>
          )}
        </div>

        {/* Category badge */}
        <div className="mt-2 flex justify-end">
          <span className="badge badge-xs badge-ghost capitalize">
            {category}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default InsightsSection;
