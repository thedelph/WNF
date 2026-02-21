/**
 * HighlightsSection - Filterable timestamped video highlights display
 * Participants can add highlights, clicking timestamps seeks the video
 * Includes goal dispute system: flag, vote, admin override
 * Follows InsightsSection pattern: collapsible section + filter tabs + card grid
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Clock, User,
  Flag, ThumbsUp, ThumbsDown, Check, X, ShieldCheck, Link2, Bookmark, MessageCircle,
  Play, MoreHorizontal,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getHighlightShareUrl, copyToClipboard } from '../../utils/highlights';
import { useGameHighlights } from '../../hooks/useGameHighlights';
import { useGoalDisputes } from '../../hooks/useGoalDisputes';
import { useIsGameParticipant } from '../../hooks/useIsGameParticipant';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../context/AuthContext';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { HIGHLIGHT_TYPES, HighlightType, GameHighlight, UpdateHighlightInput, ReactionType, ReactionSummary, HighlightComment, CreateCommentInput, UpdateCommentInput } from '../../types/highlights';
import { GoalDispute, CreateDisputeInput, VoteTally } from '../../types/disputes';
import { formatTimestamp, parseTimestamp } from '../../utils/youtube';
import { containsBannedWords } from '../../utils/moderation';
import { useHighlightReactions } from '../../hooks/useHighlightReactions';
import { useHighlightBookmarks } from '../../hooks/useHighlightBookmarks';
import { useHighlightComments } from '../../hooks/useHighlightComments';
import { useHighlightAwards } from '../../hooks/useHighlightAwards';
import { AddHighlightForm } from './AddHighlightForm';
import { DisputeForm } from './DisputeForm';
import { ReactionBar } from './ReactionBar';
import { CommentSection } from './CommentSection';
import { HighlightAwardsBanner } from './HighlightAwardsBanner';
import { HighlightAwardsVoting } from './HighlightAwardsVoting';

type HighlightFilter = 'all' | HighlightType;

interface GoalInfo {
  scorerName: string | null;
  scorerTeam: 'blue' | 'orange' | null;
  timestampSeconds: number;
  isOwnGoal: boolean;
}

interface HighlightsSectionProps {
  gameId: string;
  youtubeUrl: string;
  registrations: GameDetailRegistration[];
  scoreBlue: number | null;
  scoreOrange: number | null;
  onSeekTo: (seconds: number) => void;
  /** Returns the current video playback time in seconds, or null if unavailable */
  getVideoCurrentTime?: () => number | null;
  /** Highlight ID from URL query param for deep linking */
  focusHighlightId?: string | null;
  /** Game sequence number for share URLs */
  sequenceNumber?: number;
  /** Game date for 7-day voting window check */
  gameDate?: string;
  /** Callback when goal highlights change, for ScoreHero goalscorer display */
  onGoalsChanged?: (goals: GoalInfo[]) => void;
}

// Filter configuration including "All"
const FILTERS: { id: HighlightFilter; label: string; emoji: string; shortLabel: string }[] = [
  { id: 'all', label: 'All', emoji: '\uD83C\uDFAC', shortLabel: 'All' },
  ...HIGHLIGHT_TYPES.map(t => ({
    id: t.value as HighlightFilter,
    label: t.label,
    emoji: t.emoji,
    shortLabel: t.label.slice(0, 5),
  })),
];

export const HighlightsSection: React.FC<HighlightsSectionProps> = ({
  gameId,
  youtubeUrl,
  registrations,
  scoreBlue,
  scoreOrange,
  onSeekTo,
  getVideoCurrentTime,
  focusHighlightId,
  sequenceNumber,
  gameDate,
  onGoalsChanged,
}) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { isParticipant, playerId } = useIsGameParticipant(registrations);
  const {
    highlights, loading, addHighlight, editHighlight, deleteHighlight, goalCounts, refetch: refetchHighlights,
  } = useGameHighlights(gameId, scoreBlue, scoreOrange);

  const {
    disputesByHighlight, allDisputes, createDispute, castVote, adminResolve,
    getVoteTally, getUserVote,
  } = useGoalDisputes(gameId, playerId, refetchHighlights);

  // Reactions hook - batch fetch for all highlights
  const highlightIds = useMemo(() => highlights.map(h => h.id), [highlights]);
  const {
    reactionsByHighlight,
    toggleReaction,
  } = useHighlightReactions(highlightIds, playerId);

  // Bookmarks hook
  const {
    bookmarkedIds,
    toggleBookmark,
  } = useHighlightBookmarks(highlightIds, playerId);

  // Comments hook
  const {
    commentsByHighlight,
    commentCounts,
    addComment,
    editComment,
    deleteComment,
    adminDeleteComment,
  } = useHighlightComments(highlightIds, playerId);

  // Highlight awards hook
  const {
    bestGoalWinner,
    playOfMatchWinner,
    voteCounts: awardVoteCounts,
    userVotes: awardUserVotes,
    isVotingOpen: awardVotingOpen,
    castVote: castAwardVote,
  } = useHighlightAwards(gameId, gameDate, highlightIds, playerId);

  // Notify parent of goal changes for ScoreHero goalscorer display
  useEffect(() => {
    if (onGoalsChanged) {
      const goals = highlights
        .filter(h => h.highlight_type === 'goal')
        .map(h => ({
          scorerName: h.scorer?.friendly_name ?? null,
          scorerTeam: h.scorer_team,
          timestampSeconds: h.timestamp_seconds,
          isOwnGoal: h.is_own_goal,
        }));
      onGoalsChanged(goals);
    }
  }, [highlights, onGoalsChanged]);

  // Compute award badges per highlight
  const awardBadges = useMemo(() => {
    const badges: Record<string, string[]> = {};
    if (bestGoalWinner) {
      badges[bestGoalWinner.highlightId] = [...(badges[bestGoalWinner.highlightId] || []), 'best_goal'];
    }
    if (playOfMatchWinner) {
      badges[playOfMatchWinner.highlightId] = [...(badges[playOfMatchWinner.highlightId] || []), 'play_of_the_match'];
    }
    return badges;
  }, [bestGoalWinner, playOfMatchWinner]);

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<HighlightFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(focusHighlightId ?? null);
  const highlightRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasScrolledToFocus = useRef(false);

  // Force expand + reset filter when a deep-link focus is provided
  useEffect(() => {
    if (focusHighlightId) {
      setIsExpanded(true);
      setActiveFilter('all');
      setFocusedId(focusHighlightId);
      hasScrolledToFocus.current = false;
    }
  }, [focusHighlightId]);

  // Scroll to focused highlight after render
  useEffect(() => {
    if (focusedId && !loading && highlights.length > 0 && !hasScrolledToFocus.current) {
      const el = highlightRefs.current[focusedId];
      if (el) {
        hasScrolledToFocus.current = true;
        // Small delay to ensure layout is complete
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Clear focus animation after it plays
          setTimeout(() => setFocusedId(null), 3000);
        }, 300);
      }
    }
  }, [focusedId, loading, highlights]);

  const handleShareHighlight = useCallback(async (highlightId: string) => {
    if (!sequenceNumber) return;
    const url = getHighlightShareUrl(sequenceNumber, highlightId);
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Link copied!');
    } else {
      toast.error('Failed to copy link');
    }
  }, [sequenceNumber]);

  // Filter highlights
  const filteredHighlights = useMemo(() => {
    if (activeFilter === 'all') return highlights;
    return highlights.filter(h => h.highlight_type === activeFilter);
  }, [highlights, activeFilter]);

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: highlights.length };
    HIGHLIGHT_TYPES.forEach(t => {
      counts[t.value] = highlights.filter(h => h.highlight_type === t.value).length;
    });
    return counts;
  }, [highlights]);

  // Build map of resolved disputes for display (keyed by highlight_id)
  const resolvedDisputesByHighlight = useMemo(() => {
    const map: Record<string, GoalDispute> = {};
    for (const d of allDisputes) {
      if (d.status !== 'open') {
        // Keep the most recent resolved dispute per highlight
        if (!map[d.highlight_id] || d.resolved_at! > map[d.highlight_id].resolved_at!) {
          map[d.highlight_id] = d;
        }
      }
    }
    return map;
  }, [allDisputes]);

  const handleDelete = async (id: string) => {
    const result = await deleteHighlight(id);
    if (result.success) {
      toast.success('Highlight removed');
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  };

  const handleEditSave = async (id: string, updates: UpdateHighlightInput) => {
    const result = await editHighlight(id, updates);
    if (result.success) {
      toast.success('Highlight updated');
      setEditingId(null);
    } else {
      toast.error(result.error || 'Failed to update');
    }
  };

  const handleCreateDispute = async (input: CreateDisputeInput) => {
    const result = await createDispute(input);
    if (result.success) {
      toast.success('Dispute submitted');
    } else {
      toast.error(result.error || 'Failed to create dispute');
    }
    return result;
  };

  const handleVote = async (disputeId: string, vote: 'agree' | 'disagree') => {
    const result = await castVote(disputeId, vote);
    if (!result.success) {
      toast.error(result.error || 'Failed to cast vote');
    }
  };

  const handleAdminResolve = async (disputeId: string, resolution: 'upheld' | 'rejected') => {
    if (!playerId) return;
    const result = await adminResolve(disputeId, resolution, playerId);
    if (result.success) {
      toast.success(`Dispute ${resolution}`);
    } else {
      toast.error(result.error || 'Failed to resolve dispute');
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 active:bg-base-300 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          Match Highlights
          {highlights.length > 0 && (
            <span className="badge badge-sm badge-primary">{highlights.length}</span>
          )}
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
              {/* Filter Tabs + Add Button Row */}
              <div className="flex items-center gap-2">
                {/* Horizontally scrollable filter chips */}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none -mx-1 px-1">
                  <div className="flex gap-1.5 py-0.5 w-max">
                    {FILTERS.map((filter) => {
                      const count = categoryCounts[filter.id] ?? 0;
                      if (filter.id !== 'all' && count === 0) return null;
                      const isActive = activeFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => setActiveFilter(filter.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                            isActive
                              ? 'bg-primary text-primary-content shadow-sm'
                              : 'bg-base-200 text-base-content/70 hover:bg-base-300 active:bg-base-300'
                          }`}
                        >
                          <span>{filter.emoji}</span>
                          <span className="hidden sm:inline">{filter.label}</span>
                          <span className="sm:hidden">{filter.shortLabel}</span>
                          {filter.id !== 'all' && count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                              isActive ? 'bg-primary-content/20' : 'bg-base-300'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add Highlight Button - only for logged-in participants */}
                {user && isParticipant && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary btn-sm gap-1.5 whitespace-nowrap flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Highlight</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                )}
              </div>

              {/* Award Winners Banner */}
              {(bestGoalWinner || playOfMatchWinner) && (
                <HighlightAwardsBanner
                  bestGoalWinner={bestGoalWinner}
                  playOfMatchWinner={playOfMatchWinner}
                  highlights={highlights}
                />
              )}

              {/* Highlights Grid */}
              <AnimatePresence mode="popLayout">
                {filteredHighlights.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {filteredHighlights.map((highlight, index) => (
                      <HighlightCard
                        key={highlight.id}
                        highlight={highlight}
                        index={index}
                        isOwn={playerId === highlight.player_id}
                        isAdmin={isAdmin}
                        isParticipant={isParticipant}
                        playerId={playerId}
                        isEditing={editingId === highlight.id}
                        onSeekTo={onSeekTo}
                        onEdit={() => setEditingId(highlight.id)}
                        onEditCancel={() => setEditingId(null)}
                        onEditSave={(updates) => handleEditSave(highlight.id, updates)}
                        onDelete={() => handleDelete(highlight.id)}
                        // Dispute props
                        activeDispute={disputesByHighlight[highlight.id] ?? null}
                        resolvedDispute={resolvedDisputesByHighlight[highlight.id] ?? null}
                        registrations={registrations}
                        gameId={gameId}
                        onCreateDispute={handleCreateDispute}
                        onVote={handleVote}
                        onAdminResolve={handleAdminResolve}
                        getVoteTally={getVoteTally}
                        getUserVote={getUserVote}
                        // Reaction props
                        reactionSummary={reactionsByHighlight[highlight.id] ?? { counts: { fire: 0, laugh: 0, clap: 0, mindblown: 0, skull: 0 }, reactorNames: { fire: [], laugh: [], clap: [], mindblown: [], skull: [] }, userReaction: null }}
                        onToggleReaction={(rt) => toggleReaction(highlight.id, rt)}
                        // Bookmark props
                        isBookmarked={bookmarkedIds.has(highlight.id)}
                        onToggleBookmark={() => toggleBookmark(highlight.id)}
                        // Comment props
                        comments={commentsByHighlight[highlight.id] ?? []}
                        commentCount={commentCounts[highlight.id] ?? 0}
                        onAddComment={addComment}
                        onEditComment={editComment}
                        onDeleteComment={deleteComment}
                        onAdminDeleteComment={adminDeleteComment}
                        // Award badges
                        awardBadges={awardBadges[highlight.id]}
                        // Share + focus props
                        isFocused={focusedId === highlight.id}
                        onShareLink={() => handleShareHighlight(highlight.id)}
                        cardRef={(el) => { highlightRefs.current[highlight.id] = el; }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>
                      {highlights.length === 0
                        ? 'No highlights yet — be the first to add one!'
                        : `No ${activeFilter} highlights for this game`}
                    </p>
                  </div>
                )}
              </AnimatePresence>

              {/* Highlight Awards Voting */}
              {highlights.length > 0 && (awardVotingOpen || Object.values(awardVoteCounts.best_goal).some(c => c > 0) || Object.values(awardVoteCounts.play_of_the_match).some(c => c > 0)) && (
                <HighlightAwardsVoting
                  highlights={highlights}
                  voteCounts={awardVoteCounts}
                  userVotes={awardUserVotes}
                  isVotingOpen={awardVotingOpen}
                  canVote={!!user && isParticipant}
                  onCastVote={castAwardVote}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Highlight Modal */}
      {showAddForm && (
        <AddHighlightForm
          gameId={gameId}
          registrations={registrations}
          scoreBlue={scoreBlue}
          scoreOrange={scoreOrange}
          existingGoals={goalCounts}
          initialTimestamp={getVideoCurrentTime?.() ?? null}
          onSubmit={async (input) => {
            const result = await addHighlight(input);
            if (result.success) {
              toast.success('Highlight added!');
            }
            return result;
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

// ─── Highlight Card ──────────────────────────────────────────────────────────

interface HighlightCardProps {
  highlight: GameHighlight;
  index: number;
  isOwn: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
  playerId: string | null;
  isEditing: boolean;
  onSeekTo: (seconds: number) => void;
  onEdit: () => void;
  onEditCancel: () => void;
  onEditSave: (updates: UpdateHighlightInput) => void;
  onDelete: () => void;
  // Dispute props
  activeDispute: GoalDispute | null;
  resolvedDispute: GoalDispute | null;
  registrations: GameDetailRegistration[];
  gameId: string;
  onCreateDispute: (input: CreateDisputeInput) => Promise<{ success: boolean; error?: string }>;
  onVote: (disputeId: string, vote: 'agree' | 'disagree') => void;
  onAdminResolve: (disputeId: string, resolution: 'upheld' | 'rejected') => void;
  getVoteTally: (disputeId: string) => VoteTally;
  getUserVote: (disputeId: string) => 'agree' | 'disagree' | null;
  // Reaction props
  reactionSummary?: ReactionSummary;
  onToggleReaction?: (reactionType: ReactionType) => void;
  // Bookmark props
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  // Comment props
  comments?: HighlightComment[];
  commentCount?: number;
  onAddComment?: (input: CreateCommentInput) => Promise<{ success: boolean; error?: string }>;
  onEditComment?: (commentId: string, input: UpdateCommentInput) => Promise<{ success: boolean; error?: string }>;
  onDeleteComment?: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  onAdminDeleteComment?: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  // Award badges
  awardBadges?: string[];
  // Share + focus props
  isFocused?: boolean;
  onShareLink?: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  index,
  isOwn,
  isAdmin,
  isParticipant,
  playerId,
  isEditing,
  onSeekTo,
  onEdit,
  onEditCancel,
  onEditSave,
  onDelete,
  activeDispute,
  resolvedDispute,
  registrations,
  gameId,
  onCreateDispute,
  onVote,
  onAdminResolve,
  getVoteTally,
  getUserVote,
  reactionSummary,
  onToggleReaction,
  isBookmarked,
  onToggleBookmark,
  comments: cardComments,
  commentCount,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAdminDeleteComment,
  awardBadges,
  isFocused,
  onShareLink,
  cardRef,
}) => {
  const { user: currentUser } = useAuth();
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const typeInfo = HIGHLIGHT_TYPES.find(t => t.value === highlight.highlight_type);
  const isGoal = highlight.highlight_type === 'goal';

  // Can dispute if: participant, not own highlight, is a goal, no open dispute
  const canDispute = isGoal && isParticipant && !isOwn && !activeDispute;

  // Can vote if: participant, not the disputer, not the highlight submitter
  const canVote = activeDispute
    && isParticipant
    && playerId !== activeDispute.disputer_player_id
    && playerId !== highlight.player_id;

  // Team-colored top accent for goals
  const accentClass = isGoal
    ? highlight.is_own_goal
      ? 'border-t-2 border-t-red-500'
      : highlight.scorer_team === 'blue'
        ? 'border-t-2 border-t-blue-500'
        : 'border-t-2 border-t-orange-500'
    : '';

  // Highlight own cards
  const ownClass = isOwn ? 'ring-1 ring-primary/20' : '';
  const focusClass = isFocused ? 'ring-2 ring-primary animate-pulse' : '';

  // Whether to show the overflow menu (edit/delete/dispute)
  const hasOverflowActions = (isOwn || isAdmin || canDispute);

  // Close overflow menu on outside click/tap
  useEffect(() => {
    if (!showMoreActions) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showMoreActions]);

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={isFocused
        ? { opacity: 1, y: 0, boxShadow: ['0 0 0 0 rgba(var(--p), 0)', '0 0 0 8px rgba(var(--p), 0.2)', '0 0 0 0 rgba(var(--p), 0)'] }
        : { opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={isFocused
        ? { duration: 0.6, repeat: 2, repeatType: 'loop' as const }
        : { duration: 0.2, delay: index * 0.03 }}
      className={`card bg-base-100 shadow-sm overflow-hidden ${accentClass} ${ownClass} ${focusClass}`}
    >
      {isEditing ? (
        <div className="card-body p-3 sm:p-4">
          <EditHighlightInline
            highlight={highlight}
            registrations={registrations}
            onSave={onEditSave}
            onCancel={onEditCancel}
          />
        </div>
      ) : (
        <>
          {/* ── Tappable Card Body ── */}
          <button
            onClick={() => onSeekTo(highlight.timestamp_seconds)}
            className="w-full text-left p-3 sm:p-4 pb-2 sm:pb-2.5 active:bg-base-200/60 transition-colors cursor-pointer group"
            title="Tap to jump to this moment"
          >
            {/* Header: Type + Timestamp + Submitter */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{typeInfo?.emoji}</span>
                <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(highlight.timestamp_seconds)}
                </span>
                {isOwn && <span className="badge badge-xs badge-primary flex-shrink-0">You</span>}
              </div>
              <div className="flex items-center gap-1 text-primary/60 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex-shrink-0">
                <Play className="w-3 h-3 fill-current" />
                <span className="text-xs font-medium hidden sm:inline">Play</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base leading-relaxed text-base-content/90">
              {highlight.description}
            </p>

            {/* Goal scorer + assister badges */}
            {isGoal && highlight.scorer?.friendly_name && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`badge badge-sm gap-1 ${
                  highlight.is_own_goal
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : highlight.scorer_team === 'blue'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                }`}>
                  {'\u26BD'} {highlight.scorer.friendly_name}{highlight.is_own_goal ? ' (OG)' : ''}
                </span>
                {highlight.assister?.friendly_name && (
                  <span className="badge badge-sm badge-ghost gap-1">
                    🅰️ {highlight.assister.friendly_name}
                  </span>
                )}
              </div>
            )}

            {/* Award badges */}
            {awardBadges && awardBadges.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {awardBadges.includes('best_goal') && (
                  <span className="badge badge-sm gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30">
                    🏆 Best Goal
                  </span>
                )}
                {awardBadges.includes('play_of_the_match') && (
                  <span className="badge badge-sm gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30">
                    ⭐ Play of the Match
                  </span>
                )}
              </div>
            )}

            {/* Submitted by */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-base-content/40">
              <User className="w-3 h-3" />
              <span>{highlight.player?.friendly_name || 'Unknown'}</span>
            </div>
          </button>

          {/* ── Bottom Action Toolbar ── */}
          <div className="px-3 sm:px-4 pb-2.5 sm:pb-3">
            {/* Reactions row */}
            {reactionSummary && onToggleReaction && (
              <div className="mb-2">
                <ReactionBar
                  summary={reactionSummary}
                  onToggleReaction={onToggleReaction}
                  canReact={!!currentUser && !!playerId}
                />
              </div>
            )}

            {/* Action buttons bar */}
            <div className="flex items-center border-t border-base-200 pt-2 -mx-1">
              {/* Comment */}
              {onAddComment && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-sm transition-colors active:bg-base-200 ${
                    showComments ? 'text-primary font-medium' : 'text-base-content/50 hover:text-base-content/70'
                  }`}
                >
                  <MessageCircle className={`w-[18px] h-[18px] ${showComments ? 'fill-primary/20' : ''}`} />
                  {(commentCount ?? 0) > 0 && (
                    <span className="text-xs">{commentCount}</span>
                  )}
                </button>
              )}

              {/* Share */}
              {onShareLink && (
                <button
                  onClick={onShareLink}
                  className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-sm text-base-content/50 hover:text-base-content/70 transition-colors active:bg-base-200"
                >
                  <Link2 className="w-[18px] h-[18px]" />
                </button>
              )}

              {/* Bookmark */}
              {currentUser && onToggleBookmark && (
                <button
                  onClick={onToggleBookmark}
                  className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-sm transition-colors active:bg-base-200 ${
                    isBookmarked ? 'text-primary' : 'text-base-content/50 hover:text-base-content/70'
                  }`}
                >
                  <Bookmark className={`w-[18px] h-[18px] ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              )}

              {/* Overflow menu for edit/delete/dispute */}
              {hasOverflowActions && (
                <div className="relative flex-1 flex justify-center" ref={moreActionsRef}>
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm text-base-content/50 hover:text-base-content/70 transition-colors active:bg-base-200"
                  >
                    <MoreHorizontal className="w-[18px] h-[18px]" />
                  </button>

                  {/* Overflow dropdown */}
                  <AnimatePresence>
                    {showMoreActions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full right-0 mb-1 py-1 bg-base-200 rounded-lg shadow-lg border border-base-300 z-50 min-w-[10rem]"
                      >
                        {canDispute && (
                          <button
                            onClick={() => { setShowDisputeForm(true); setShowMoreActions(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-warning hover:bg-base-300 active:bg-base-300 transition-colors"
                          >
                            <Flag className="w-4 h-4" />
                            Dispute Goal
                          </button>
                        )}
                        {isOwn && (
                          <button
                            onClick={() => { onEdit(); setShowMoreActions(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-base-content/70 hover:bg-base-300 active:bg-base-300 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                        {(isOwn || isAdmin) && (
                          <button
                            onClick={() => { onDelete(); setShowMoreActions(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-error hover:bg-base-300 active:bg-base-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* ── Expandable Sections ── */}
          <div className="px-3 sm:px-4">
            {/* Active Dispute Banner */}
            {activeDispute && (
              <div className="pb-3">
                <DisputeBanner
                  dispute={activeDispute}
                  canVote={!!canVote}
                  isAdmin={isAdmin}
                  voteTally={getVoteTally(activeDispute.id)}
                  userVote={getUserVote(activeDispute.id)}
                  onVote={(vote) => onVote(activeDispute.id, vote)}
                  onAdminResolve={(resolution) => onAdminResolve(activeDispute.id, resolution)}
                />
              </div>
            )}

            {/* Resolved Dispute Badge */}
            {!activeDispute && resolvedDispute && (
              <div className="pb-3">
                <ResolvedDisputeBadge dispute={resolvedDispute} />
              </div>
            )}

            {/* Dispute Form (inline) */}
            <AnimatePresence>
              {showDisputeForm && (
                <div className="pb-3">
                  <DisputeForm
                    highlightId={highlight.id}
                    gameId={gameId}
                    currentScorerId={highlight.scorer_player_id}
                    registrations={registrations}
                    onSubmit={onCreateDispute}
                    onClose={() => setShowDisputeForm(false)}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Comment Section */}
            {showComments && onAddComment && onEditComment && onDeleteComment && onAdminDeleteComment && (
              <div className="pb-3">
                <CommentSection
                  highlightId={highlight.id}
                  comments={cardComments ?? []}
                  isLoggedIn={!!currentUser}
                  isAdmin={isAdmin}
                  playerId={playerId}
                  registrations={registrations}
                  onAddComment={onAddComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onAdminDeleteComment={onAdminDeleteComment}
                />
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

// ─── Dispute Banner (open dispute) ───────────────────────────────────────────

interface DisputeBannerProps {
  dispute: GoalDispute;
  canVote: boolean;
  isAdmin: boolean;
  voteTally: VoteTally;
  userVote: 'agree' | 'disagree' | null;
  onVote: (vote: 'agree' | 'disagree') => void;
  onAdminResolve: (resolution: 'upheld' | 'rejected') => void;
}

const DisputeBanner: React.FC<DisputeBannerProps> = ({
  dispute,
  canVote,
  isAdmin,
  voteTally,
  userVote,
  onVote,
  onAdminResolve,
}) => {
  const disputeLabel = dispute.dispute_type === 'wrong_scorer'
    ? `Wrong scorer — should be ${dispute.proposed_scorer?.friendly_name ?? 'unknown'}`
    : 'Not a goal';

  return (
    <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 space-y-2.5">
      {/* Dispute info */}
      <div className="text-xs leading-relaxed">
        <span className="font-semibold text-warning">
          Disputed by {dispute.disputer?.friendly_name ?? 'Unknown'}
        </span>
        <span className="text-base-content/60 block sm:inline sm:ml-1">— {disputeLabel}</span>
      </div>

      {dispute.reason && (
        <p className="text-xs text-base-content/50 italic leading-relaxed">"{dispute.reason}"</p>
      )}

      {/* Voting row - larger touch targets */}
      {canVote && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVote('agree')}
            className={`btn btn-sm gap-1.5 flex-1 ${
              userVote === 'agree' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            Agree ({voteTally.agree})
          </button>
          <button
            onClick={() => onVote('disagree')}
            className={`btn btn-sm gap-1.5 flex-1 ${
              userVote === 'disagree' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            Disagree ({voteTally.disagree})
          </button>
        </div>
      )}

      {/* Vote progress text */}
      <p className="text-xs text-base-content/40">
        {voteTally.total === 0
          ? 'No votes yet — needs 3 votes to auto-resolve'
          : voteTally.hasQuorum
            ? `${voteTally.total} vote${voteTally.total !== 1 ? 's' : ''} cast · needs >66% majority`
            : `${voteTally.total} vote${voteTally.total !== 1 ? 's' : ''} cast · waiting for ${3 - voteTally.total} more`}
      </p>

      {/* Admin override */}
      {isAdmin && (
        <div className="flex items-center gap-2 pt-2 border-t border-warning/20">
          <span className="text-xs text-base-content/40 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin:
          </span>
          <button
            onClick={() => onAdminResolve('upheld')}
            className="btn btn-sm btn-success gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Uphold
          </button>
          <button
            onClick={() => onAdminResolve('rejected')}
            className="btn btn-sm btn-error gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Resolved Dispute Badge ──────────────────────────────────────────────────

const ResolvedDisputeBadge: React.FC<{ dispute: GoalDispute }> = ({ dispute }) => {
  const isUpheld = dispute.status === 'upheld';
  const resolvedByAdmin = !!dispute.resolved_by;
  const resolverName = dispute.resolved_by_player?.friendly_name;

  const label = isUpheld
    ? dispute.dispute_type === 'wrong_scorer'
      ? 'Dispute upheld · scorer corrected'
      : 'Dispute upheld · goal removed'
    : 'Dispute rejected';

  const suffix = resolvedByAdmin ? `(by ${resolverName})` : '(auto-resolved)';

  return (
    <div className="opacity-60">
      <span className={`badge badge-sm gap-1 ${isUpheld ? 'badge-success' : 'badge-error'}`}>
        {label}
      </span>
      <span className="text-xs text-base-content/40 ml-1.5">{suffix}</span>
    </div>
  );
};

// ─── Inline Edit Form ────────────────────────────────────────────────────────

interface EditHighlightInlineProps {
  highlight: GameHighlight;
  registrations: GameDetailRegistration[];
  onSave: (updates: UpdateHighlightInput) => void;
  onCancel: () => void;
}

const EditHighlightInline: React.FC<EditHighlightInlineProps> = ({
  highlight,
  registrations,
  onSave,
  onCancel,
}) => {
  const [description, setDescription] = useState(highlight.description);
  const [timestampInput, setTimestampInput] = useState(formatTimestamp(highlight.timestamp_seconds));
  const [scorerPlayerId, setScorerPlayerId] = useState(highlight.scorer_player_id ?? '');
  const [isOwnGoal, setIsOwnGoal] = useState(highlight.is_own_goal);
  const [assisterPlayerId, setAssisterPlayerId] = useState(highlight.assister_player_id ?? '');

  const isGoal = highlight.highlight_type === 'goal';

  // Group players by team for the scorer dropdown (same pattern as AddHighlightForm)
  const teamPlayers = useMemo(() => {
    const blue = registrations
      .filter(r => r.team === 'blue' && r.status === 'selected')
      .map(r => r.player)
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
    const orange = registrations
      .filter(r => r.team === 'orange' && r.status === 'selected')
      .map(r => r.player)
      .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
    return { blue, orange };
  }, [registrations]);

  // Determine scorer's actual team from selection
  const scorerActualTeam = useMemo((): 'blue' | 'orange' | null => {
    if (!scorerPlayerId) return null;
    if (teamPlayers.blue.some(p => p.id === scorerPlayerId)) return 'blue';
    if (teamPlayers.orange.some(p => p.id === scorerPlayerId)) return 'orange';
    return null;
  }, [scorerPlayerId, teamPlayers]);

  // For own goals, credit goes to the OTHER team
  const scorerTeam = scorerActualTeam
    ? (isOwnGoal ? (scorerActualTeam === 'blue' ? 'orange' : 'blue') : scorerActualTeam)
    : null;

  // Players eligible to assist: teammates from the credited team, excluding the scorer
  const assistEligiblePlayers = useMemo(() => {
    if (!scorerTeam || isOwnGoal) return [];
    const teamList = scorerTeam === 'blue' ? teamPlayers.blue : teamPlayers.orange;
    return teamList.filter(p => p.id !== scorerPlayerId);
  }, [scorerTeam, isOwnGoal, teamPlayers, scorerPlayerId]);

  const parsedTimestamp = parseTimestamp(timestampInput);
  const descriptionTrimmed = description.trim();
  const moderationResult = descriptionTrimmed.length > 0 ? containsBannedWords(descriptionTrimmed) : { hasBanned: false };
  const canSave = parsedTimestamp !== null
    && descriptionTrimmed.length <= 200
    && (isGoal || descriptionTrimmed.length >= 3)
    && (!isGoal || !!scorerPlayerId)
    && !moderationResult.hasBanned;

  const handleSave = () => {
    if (!canSave || parsedTimestamp === null) return;
    const updates: UpdateHighlightInput = {};
    if (descriptionTrimmed !== highlight.description) updates.description = descriptionTrimmed;
    if (parsedTimestamp !== highlight.timestamp_seconds) updates.timestamp_seconds = parsedTimestamp;
    if (isGoal) {
      if (scorerPlayerId !== (highlight.scorer_player_id ?? '')) {
        updates.scorer_player_id = scorerPlayerId || null;
      }
      if (scorerTeam !== highlight.scorer_team) {
        updates.scorer_team = scorerTeam;
      }
      if (isOwnGoal !== highlight.is_own_goal) {
        updates.is_own_goal = isOwnGoal;
      }
      const newAssister = (assisterPlayerId && !isOwnGoal) ? assisterPlayerId : null;
      if (newAssister !== (highlight.assister_player_id ?? null)) {
        updates.assister_player_id = newAssister;
      }
    }
    onSave(updates);
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={timestampInput}
        onChange={(e) => setTimestampInput(e.target.value)}
        className="input input-bordered input-sm w-24 font-mono"
        placeholder="MM:SS"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={200}
        rows={2}
        className={`textarea textarea-bordered textarea-sm w-full resize-none ${
          moderationResult.hasBanned ? 'textarea-error' : ''
        }`}
      />
      {moderationResult.hasBanned && (
        <p className="text-xs text-error">Please keep it clean!</p>
      )}

      {/* Goal-specific fields */}
      {isGoal && (
        <div className="space-y-2 pt-1">
          <label className="text-xs font-medium text-base-content/60 block">Goal Scorer</label>
          <select
            value={scorerPlayerId}
            onChange={(e) => {
              setScorerPlayerId(e.target.value);
              setAssisterPlayerId('');
            }}
            className="select select-bordered select-sm w-full"
          >
            <option value="">Select scorer...</option>
            {teamPlayers.blue.length > 0 && (
              <optgroup label="Blue Team">
                {teamPlayers.blue.map((p) => (
                  <option key={p.id} value={p.id}>{p.friendly_name}</option>
                ))}
              </optgroup>
            )}
            {teamPlayers.orange.length > 0 && (
              <optgroup label="Orange Team">
                {teamPlayers.orange.map((p) => (
                  <option key={p.id} value={p.id}>{p.friendly_name}</option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Own Goal toggle */}
          {scorerPlayerId && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOwnGoal}
                onChange={(e) => {
                  setIsOwnGoal(e.target.checked);
                  if (e.target.checked) {
                    setAssisterPlayerId('');
                  }
                }}
                className="checkbox checkbox-sm checkbox-error"
              />
              <span className="text-sm">Own Goal</span>
              {isOwnGoal && scorerActualTeam && (
                <span className="text-xs text-base-content/50">
                  (credits {scorerActualTeam === 'blue' ? 'Orange' : 'Blue'} team)
                </span>
              )}
            </label>
          )}

          {/* Assist dropdown */}
          {scorerPlayerId && !isOwnGoal && assistEligiblePlayers.length > 0 && (
            <div>
              <label className="text-xs font-medium text-base-content/60 mb-1 block">
                Assisted by <span className="text-base-content/40 font-normal">(optional)</span>
              </label>
              <select
                value={assisterPlayerId}
                onChange={(e) => setAssisterPlayerId(e.target.value)}
                className="select select-bordered select-sm w-full"
              >
                <option value="">No assist</option>
                {assistEligiblePlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.friendly_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn btn-ghost btn-xs">Cancel</button>
        <button onClick={handleSave} disabled={!canSave} className="btn btn-primary btn-xs">Save</button>
      </div>
    </div>
  );
};

export default HighlightsSection;
