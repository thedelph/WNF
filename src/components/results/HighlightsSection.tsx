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
        className="w-full flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="tabs tabs-boxed bg-base-200 p-1 flex-wrap flex-1">
                  {FILTERS.map((filter) => {
                    const count = categoryCounts[filter.id] ?? 0;
                    if (filter.id !== 'all' && count === 0) return null;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`tab gap-1 flex-1 min-w-fit ${
                          activeFilter === filter.id ? 'tab-active' : ''
                        }`}
                      >
                        <span>{filter.emoji}</span>
                        <span className="hidden sm:inline">{filter.label}</span>
                        <span className="sm:hidden">{filter.shortLabel}</span>
                        {filter.id !== 'all' && count > 0 && (
                          <span className="badge badge-xs">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Add Highlight Button - only for logged-in participants */}
                {user && isParticipant && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary btn-sm gap-1.5 whitespace-nowrap"
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
                  <div className="grid gap-3 md:grid-cols-2">
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
  const typeInfo = HIGHLIGHT_TYPES.find(t => t.value === highlight.highlight_type);
  const isGoal = highlight.highlight_type === 'goal';

  // Can dispute if: participant, not own highlight, is a goal, no open dispute
  const canDispute = isGoal && isParticipant && !isOwn && !activeDispute;

  // Can vote if: participant, not the disputer, not the highlight submitter
  const canVote = activeDispute
    && isParticipant
    && playerId !== activeDispute.disputer_player_id
    && playerId !== highlight.player_id;

  // Team-colored left border for goals
  const borderClass = isGoal
    ? highlight.scorer_team === 'blue'
      ? 'border-l-4 border-l-blue-500'
      : 'border-l-4 border-l-orange-500'
    : '';

  // Highlight own cards
  const ownClass = isOwn ? 'ring-1 ring-primary/30' : '';
  const focusClass = isFocused ? 'ring-2 ring-primary animate-pulse' : '';

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isFocused
        ? { opacity: 1, scale: 1, boxShadow: ['0 0 0 0 rgba(var(--p), 0)', '0 0 0 8px rgba(var(--p), 0.2)', '0 0 0 0 rgba(var(--p), 0)'] }
        : { opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={isFocused
        ? { duration: 0.6, repeat: 2, repeatType: 'loop' as const }
        : { duration: 0.2, delay: index * 0.03 }}
      className={`card bg-base-100 shadow-sm ${borderClass} ${ownClass} ${focusClass}`}
    >
      <div className="card-body p-4">
        {isEditing ? (
          <EditHighlightInline
            highlight={highlight}
            onSave={onEditSave}
            onCancel={onEditCancel}
          />
        ) : (
          <>
            <div className="flex items-start gap-3">
              {/* Clickable timestamp badge */}
              <button
                onClick={() => onSeekTo(highlight.timestamp_seconds)}
                className="btn btn-ghost btn-xs font-mono gap-1 hover:btn-primary transition-colors flex-shrink-0"
                title="Jump to this moment"
              >
                <Clock className="w-3 h-3" />
                {formatTimestamp(highlight.timestamp_seconds)}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">
                  <span className="mr-1.5">{typeInfo?.emoji}</span>
                  {highlight.description}
                </p>

                {/* Goal scorer badge */}
                {isGoal && highlight.scorer?.friendly_name && (
                  <div className="mt-1.5">
                    <span className={`badge badge-sm gap-1 ${
                      highlight.scorer_team === 'blue'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                    }`}>
                      {'\u26BD'} {highlight.scorer.friendly_name}
                    </span>
                  </div>
                )}

                {/* Award badges */}
                {awardBadges && awardBadges.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5">
                    {awardBadges.includes('best_goal') && (
                      <span className="badge badge-xs gap-0.5 bg-amber-500/15 text-amber-600 border-amber-500/30">
                        🏆 Best Goal
                      </span>
                    )}
                    {awardBadges.includes('play_of_the_match') && (
                      <span className="badge badge-xs gap-0.5 bg-amber-500/15 text-amber-600 border-amber-500/30">
                        ⭐ Play of the Match
                      </span>
                    )}
                  </div>
                )}

                {/* Submitted by */}
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-base-content/40">
                  <User className="w-3 h-3" />
                  {highlight.player?.friendly_name || 'Unknown'}
                  {isOwn && <span className="badge badge-xs badge-primary">You</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                {/* Comment toggle button */}
                {onAddComment && (
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={`btn btn-ghost btn-xs gap-1 ${showComments ? 'btn-active' : ''}`}
                    title="Comments"
                  >
                    <MessageCircle className="w-3 h-3" />
                    {(commentCount ?? 0) > 0 && (
                      <span className="text-xs">{commentCount}</span>
                    )}
                  </button>
                )}
                {/* Share link button */}
                {onShareLink && (
                  <button
                    onClick={onShareLink}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="Copy link to highlight"
                  >
                    <Link2 className="w-3 h-3" />
                  </button>
                )}
                {/* Bookmark button - logged-in users only */}
                {currentUser && onToggleBookmark && (
                  <button
                    onClick={onToggleBookmark}
                    className={`btn btn-ghost btn-xs btn-circle ${isBookmarked ? 'text-primary' : ''}`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                )}
                {/* Dispute flag button */}
                {canDispute && (
                  <button
                    onClick={() => setShowDisputeForm(true)}
                    className="btn btn-ghost btn-xs btn-circle text-warning hover:bg-warning/10"
                    title="Dispute this goal"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                )}
                {(isOwn || isAdmin) && (
                  <>
                    {isOwn && (
                      <button
                        onClick={onEdit}
                        className="btn btn-ghost btn-xs btn-circle"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={onDelete}
                      className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Reactions */}
            {reactionSummary && onToggleReaction && (
              <ReactionBar
                summary={reactionSummary}
                onToggleReaction={onToggleReaction}
                canReact={!!currentUser && !!playerId}
              />
            )}

            {/* Active Dispute Banner */}
            {activeDispute && (
              <DisputeBanner
                dispute={activeDispute}
                canVote={!!canVote}
                isAdmin={isAdmin}
                voteTally={getVoteTally(activeDispute.id)}
                userVote={getUserVote(activeDispute.id)}
                onVote={(vote) => onVote(activeDispute.id, vote)}
                onAdminResolve={(resolution) => onAdminResolve(activeDispute.id, resolution)}
              />
            )}

            {/* Resolved Dispute Badge */}
            {!activeDispute && resolvedDispute && (
              <ResolvedDisputeBadge dispute={resolvedDispute} />
            )}

            {/* Dispute Form (inline) */}
            <AnimatePresence>
              {showDisputeForm && (
                <DisputeForm
                  highlightId={highlight.id}
                  gameId={gameId}
                  currentScorerId={highlight.scorer_player_id}
                  registrations={registrations}
                  onSubmit={onCreateDispute}
                  onClose={() => setShowDisputeForm(false)}
                />
              )}
            </AnimatePresence>

            {/* Comment Section */}
            {showComments && onAddComment && onEditComment && onDeleteComment && onAdminDeleteComment && (
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
            )}
          </>
        )}
      </div>
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
    <div className="mt-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
      {/* Dispute info */}
      <div className="text-xs">
        <span className="font-medium text-warning">
          Disputed by {dispute.disputer?.friendly_name ?? 'Unknown'}
        </span>
        <span className="text-base-content/60 ml-1">— {disputeLabel}</span>
      </div>

      {dispute.reason && (
        <p className="text-xs text-base-content/50 italic">"{dispute.reason}"</p>
      )}

      {/* Voting row */}
      {canVote && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVote('agree')}
            className={`btn btn-xs gap-1 ${
              userVote === 'agree' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            Agree ({voteTally.agree})
          </button>
          <button
            onClick={() => onVote('disagree')}
            className={`btn btn-xs gap-1 ${
              userVote === 'disagree' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <ThumbsDown className="w-3 h-3" />
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
        <div className="flex items-center gap-2 pt-1 border-t border-warning/20">
          <span className="text-xs text-base-content/40 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin:
          </span>
          <button
            onClick={() => onAdminResolve('upheld')}
            className="btn btn-xs btn-success gap-1"
          >
            <Check className="w-3 h-3" /> Uphold
          </button>
          <button
            onClick={() => onAdminResolve('rejected')}
            className="btn btn-xs btn-error gap-1"
          >
            <X className="w-3 h-3" /> Reject
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
    <div className="mt-2 opacity-60">
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
  onSave: (updates: UpdateHighlightInput) => void;
  onCancel: () => void;
}

const EditHighlightInline: React.FC<EditHighlightInlineProps> = ({
  highlight,
  onSave,
  onCancel,
}) => {
  const [description, setDescription] = useState(highlight.description);
  const [timestampInput, setTimestampInput] = useState(formatTimestamp(highlight.timestamp_seconds));

  const isGoal = highlight.highlight_type === 'goal';
  const parsedTimestamp = parseTimestamp(timestampInput);
  const descriptionTrimmed = description.trim();
  const moderationResult = descriptionTrimmed.length > 0 ? containsBannedWords(descriptionTrimmed) : { hasBanned: false };
  const canSave = parsedTimestamp !== null
    && descriptionTrimmed.length <= 200
    && (isGoal || descriptionTrimmed.length >= 3)
    && !moderationResult.hasBanned;

  const handleSave = () => {
    if (!canSave || parsedTimestamp === null) return;
    const updates: UpdateHighlightInput = {};
    if (descriptionTrimmed !== highlight.description) updates.description = descriptionTrimmed;
    if (parsedTimestamp !== highlight.timestamp_seconds) updates.timestamp_seconds = parsedTimestamp;
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
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn btn-ghost btn-xs">Cancel</button>
        <button onClick={handleSave} disabled={!canSave} className="btn btn-primary btn-xs">Save</button>
      </div>
    </div>
  );
};

export default HighlightsSection;
