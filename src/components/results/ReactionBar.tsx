/**
 * ReactionBar - Inline emoji reaction row for highlight cards
 * Shows existing reactions with counts, user's selection highlighted,
 * and a [+ React] button to select from available emojis
 */

import React, { useState, useRef, useEffect } from 'react';
import { REACTION_TYPES, ReactionType, ReactionSummary } from '../../types/highlights';

interface ReactionBarProps {
  summary: ReactionSummary;
  onToggleReaction: (reactionType: ReactionType) => void;
  canReact: boolean;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  summary,
  onToggleReaction,
  canReact,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click/tap
  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showPicker]);

  const activeReactions = REACTION_TYPES.filter(rt => summary.counts[rt.key] > 0);

  const formatTooltip = (names: string[]): string => {
    if (names.length === 0) return '';
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 2).join(', ')}, and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''}`;
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {/* Existing reactions with counts */}
      {activeReactions.map(rt => {
        const isUserReaction = summary.userReaction === rt.key;
        return (
          <button
            key={rt.key}
            onClick={() => canReact && onToggleReaction(rt.key)}
            disabled={!canReact}
            className={`btn btn-sm gap-1 ${
              isUserReaction ? 'btn-primary' : 'btn-ghost'
            }`}
            title={formatTooltip(summary.reactorNames[rt.key])}
          >
            <span>{rt.emoji}</span>
            <span className="text-xs">{summary.counts[rt.key]}</span>
          </button>
        );
      })}

      {/* [+ React] popover */}
      {canReact && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="btn btn-ghost btn-sm gap-1 text-base-content/50"
          >
            + React
          </button>

          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 p-2 bg-base-200 rounded-lg shadow-lg border border-base-300 flex gap-1.5 z-50">
              {REACTION_TYPES.map(rt => {
                const isUserReaction = summary.userReaction === rt.key;
                return (
                  <button
                    key={rt.key}
                    onClick={() => {
                      onToggleReaction(rt.key);
                      setShowPicker(false);
                    }}
                    className={`btn btn-md btn-circle ${
                      isUserReaction ? 'btn-primary' : 'btn-ghost'
                    }`}
                    title={rt.label}
                  >
                    {rt.emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
