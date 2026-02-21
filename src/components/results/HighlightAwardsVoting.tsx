/**
 * HighlightAwardsVoting - Inline voting UI for Best Goal and Play of the Match
 * Placed after the highlights grid inside the collapsible area
 * Mobile-optimised: larger touch targets, better spacing, accessible voting cards
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GameHighlight, HighlightAwardType, HIGHLIGHT_TYPES } from '../../types/highlights';

interface HighlightAwardsVotingProps {
  highlights: GameHighlight[];
  voteCounts: Record<HighlightAwardType, Record<string, number>>;
  userVotes: Record<HighlightAwardType, string | null>;
  isVotingOpen: boolean;
  canVote: boolean;
  onCastVote: (highlightId: string, awardType: HighlightAwardType) => Promise<{ success: boolean; error?: string }>;
}

export const HighlightAwardsVoting: React.FC<HighlightAwardsVotingProps> = ({
  highlights,
  voteCounts,
  userVotes,
  isVotingOpen,
  canVote,
  onCastVote,
}) => {
  const [expandedAward, setExpandedAward] = useState<HighlightAwardType | null>(null);
  const [voting, setVoting] = useState(false);

  const goalHighlights = useMemo(
    () => highlights.filter(h => h.highlight_type === 'goal'),
    [highlights]
  );

  // Don't show if no highlights at all
  if (highlights.length === 0) return null;

  // Don't show if voting is closed and there are no votes at all
  const hasAnyVotes =
    Object.values(voteCounts.best_goal).some(c => c > 0) ||
    Object.values(voteCounts.play_of_the_match).some(c => c > 0);
  if (!isVotingOpen && !hasAnyVotes) return null;

  const handleVote = async (highlightId: string, awardType: HighlightAwardType) => {
    if (voting || !canVote || !isVotingOpen) return;
    setVoting(true);
    const result = await onCastVote(highlightId, awardType);
    if (result.success) {
      const isUnvote = userVotes[awardType] === highlightId;
      toast.success(isUnvote ? 'Vote removed' : 'Vote cast!');
    } else {
      toast.error(result.error || 'Failed to vote');
    }
    setVoting(false);
  };

  const toggleSection = (awardType: HighlightAwardType) => {
    setExpandedAward(prev => prev === awardType ? null : awardType);
  };

  const renderAwardSection = (
    awardType: HighlightAwardType,
    label: string,
    icon: React.ReactNode,
    eligibleHighlights: GameHighlight[]
  ) => {
    if (eligibleHighlights.length === 0) return null;

    const counts = voteCounts[awardType];
    const userVote = userVotes[awardType];
    const isExpanded = expandedAward === awardType;
    const totalVotes = Object.values(counts).reduce((sum, c) => sum + c, 0);

    // Sort by vote count
    const sorted = [...eligibleHighlights].sort((a, b) => {
      return (counts[b.id] || 0) - (counts[a.id] || 0);
    });

    return (
      <div className="border border-base-300 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(awardType)}
          className="w-full flex items-center justify-between p-3.5 hover:bg-base-200 active:bg-base-200 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {icon}
            <span className="text-sm font-semibold">{label}</span>
            {totalVotes > 0 && (
              <span className="text-xs text-base-content/40 font-normal">
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-base-content/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-base-content/40" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 space-y-1">
                {sorted.map(highlight => {
                  const typeInfo = HIGHLIGHT_TYPES.find(t => t.value === highlight.highlight_type);
                  const voteCount = counts[highlight.id] || 0;
                  const isUserVote = userVote === highlight.id;
                  const desc = highlight.description.length > 60
                    ? highlight.description.slice(0, 60) + '...'
                    : highlight.description;

                  return (
                    <button
                      key={highlight.id}
                      onClick={() => handleVote(highlight.id, awardType)}
                      disabled={!canVote || !isVotingOpen || voting}
                      className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                        isUserVote
                          ? 'ring-1 ring-primary bg-primary/10'
                          : canVote && isVotingOpen
                          ? 'hover:bg-base-200 active:bg-base-200 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <span className="flex-shrink-0 text-base">{typeInfo?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug line-clamp-2">{desc}</p>
                        {highlight.scorer?.friendly_name && (
                          <p className="text-xs text-base-content/40 mt-0.5">{highlight.scorer.friendly_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isUserVote && <Check className="w-4 h-4 text-primary" />}
                        {voteCount > 0 && (
                          <span className="text-xs text-base-content/40 tabular-nums min-w-[1.25rem] text-center">
                            {voteCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {!isVotingOpen && (
                  <p className="text-xs text-center text-base-content/40 py-2">Voting closed</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-2.5 pt-3 border-t border-base-300">
      <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
        Highlight Awards
      </p>

      {renderAwardSection(
        'best_goal',
        'Best Goal',
        <Trophy className="w-4 h-4 text-amber-500" />,
        goalHighlights
      )}

      {renderAwardSection(
        'play_of_the_match',
        'Play of the Match',
        <Star className="w-4 h-4 text-amber-500" />,
        highlights
      )}
    </div>
  );
};

export default HighlightAwardsVoting;
