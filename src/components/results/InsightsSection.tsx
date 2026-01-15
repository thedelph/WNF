/**
 * InsightsSection - Filterable post-match insights display
 * Shows trophy changes, streaks, chemistry, rivalries with tab filtering
 * Supports player filtering and highlights logged-in user's insights
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Flame, Users, Swords, Medal, User, Filter, ChevronDown, ChevronUp, LogIn } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PostMatchInsight, getInsightEmoji } from '../../hooks/usePostMatchAnalysis';
import { useUser } from '../../hooks/useUser';
import { useAuth } from '../../context/AuthContext';

type InsightFilter = 'all' | 'trophies' | 'streaks' | 'chemistry' | 'rivalries' | 'records';

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
  if (analysisType.startsWith('trophy_')) return 'trophies';
  if (analysisType.includes('streak') || analysisType.includes('team_streak')) return 'streaks';
  if (analysisType.includes('chemistry') || analysisType.includes('trio') || analysisType.includes('partnership')) return 'chemistry';
  if (analysisType.includes('rivalry')) return 'rivalries';
  if (analysisType.includes('record') || analysisType.includes('milestone') || analysisType.includes('personal_best')) return 'records';
  return 'all';
};

// Filter configuration
const FILTERS: { id: InsightFilter; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { id: 'all', label: 'All', shortLabel: 'All', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'trophies', label: 'Trophies', shortLabel: 'Trophy', icon: <Trophy className="w-4 h-4" /> },
  { id: 'streaks', label: 'Streaks', shortLabel: 'Streak', icon: <Flame className="w-4 h-4" /> },
  { id: 'chemistry', label: 'Chemistry', shortLabel: 'Chem', icon: <Users className="w-4 h-4" /> },
  { id: 'rivalries', label: 'Rivalries', shortLabel: 'Rival', icon: <Swords className="w-4 h-4" /> },
  { id: 'records', label: 'Records', shortLabel: 'Record', icon: <Medal className="w-4 h-4" /> },
];

export const InsightsSection: React.FC<InsightsSectionProps> = ({
  insights,
  loading = false,
  gamePlayers = [],
  defaultExpanded = true,
}) => {
  const { user } = useAuth();
  const { player: currentPlayer } = useUser();
  const location = useLocation();
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
      records: 0,
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
                {/* Login prompt for non-logged-in users */}
                {!user && (
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <LogIn className="w-4 h-4" />
                    <span>
                      <Link
                        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                        className="link link-primary"
                      >
                        Log in
                      </Link>{' '}
                      to filter insights about you
                    </span>
                  </div>
                )}

                {/* Player Filter Controls */}
                <div className="flex items-center gap-2 ml-auto">
                  {/* Message when logged in but no insights (didn't play) */}
                  {user && currentPlayer && currentUserInsightCount === 0 && (
                    <span className="text-xs text-base-content/50 hidden sm:inline">
                      No personal insights (you didn't play)
                    </span>
                  )}

                  {/* Quick "My Insights" button - only for logged-in users with insights */}
                  {user && currentPlayer && currentUserInsightCount > 0 && (
                    <button
                      onClick={() => setSelectedPlayerId(
                        selectedPlayerId === currentPlayer.id ? 'all' : currentPlayer.id
                      )}
                      className={`btn btn-sm gap-1 ${
                        selectedPlayerId === currentPlayer.id ? 'btn-primary' : 'btn-ghost'
                      }`}
                    >
                      <User className="w-4 h-4" />
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
                                <span className="badge badge-xs badge-primary">You</span>
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
                  <span className="badge badge-sm badge-primary">
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

// Individual Insight Card
interface InsightCardProps {
  insight: PostMatchInsight;
  index: number;
  currentPlayerId?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, index, currentPlayerId }) => {
  const emoji = getInsightEmoji(insight.analysisType);
  const category = getFilterCategory(insight.analysisType);

  // Check if current user is involved in this insight
  const isCurrentUserInvolved = useMemo(() => {
    if (!currentPlayerId) return false;

    // Check playerIds array
    if (insight.playerIds?.includes(currentPlayerId)) return true;

    // Check details for player IDs
    const details = insight.details as Record<string, unknown>;
    const idKeys = ['player_id', 'winner_id', 'loser_id', 'holder_id', 'player1_id', 'player2_id', 'player3_id'];

    return idKeys.some(key => details[key] === currentPlayerId);
  }, [insight, currentPlayerId]);

  // Priority-based styling
  const getPriorityStyles = () => {
    // If current user is involved, use special highlight
    if (isCurrentUserInvolved) {
      return 'border-l-4 border-l-primary bg-primary/10 ring-1 ring-primary/30';
    }
    if (insight.priority >= 8) {
      return 'border-l-4 border-l-warning bg-warning/5';
    }
    if (insight.priority >= 6) {
      return 'border-l-4 border-l-primary bg-primary/5';
    }
    return 'border-l-4 border-l-base-300';
  };

  // Extract player names from details if available
  const getPlayerLinks = () => {
    const details = insight.details as Record<string, unknown>;

    // Try to find player names in details
    const playerNames: { id: string; name: string; isCurrentUser: boolean }[] = [];

    // Common patterns for player names in details
    const nameKeys = ['player_name', 'winner_name', 'loser_name', 'holder_name', 'player1_name', 'player2_name', 'player3_name'];
    const idKeys = ['player_id', 'winner_id', 'loser_id', 'holder_id', 'player1_id', 'player2_id', 'player3_id'];

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
          {/* Emoji */}
          <div className="text-2xl flex-shrink-0">{emoji}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {insight.headline}
            </p>

            {/* Player links */}
            {playerLinks.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {playerLinks.map((player) => (
                  <Link
                    key={player.id}
                    to={`/player/${player.id}`}
                    className={`badge badge-sm transition-colors ${
                      player.isCurrentUser
                        ? 'badge-primary'
                        : 'badge-outline hover:badge-primary'
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
            <span className="badge badge-sm badge-primary">You</span>
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
