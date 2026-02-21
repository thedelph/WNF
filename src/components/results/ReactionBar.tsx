/**
 * ReactionBar - Inline emoji reaction row for highlight cards
 * Shows existing reactions with counts, user's selection highlighted,
 * and a [+ React] button to select from available emojis
 * Mobile-optimised: pill-shaped reaction chips, bottom-anchored picker
 */

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Existing reactions as pill-shaped chips */}
      {activeReactions.map(rt => {
        const isUserReaction = summary.userReaction === rt.key;
        return (
          <button
            key={rt.key}
            onClick={() => canReact && onToggleReaction(rt.key)}
            disabled={!canReact}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all active:scale-95 ${
              isUserReaction
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30 font-medium'
                : 'bg-base-200 text-base-content/70 hover:bg-base-300'
            }`}
            title={formatTooltip(summary.reactorNames[rt.key])}
          >
            <span className="text-base leading-none">{rt.emoji}</span>
            <span className="text-xs tabular-nums">{summary.counts[rt.key]}</span>
          </button>
        );
      })}

      {/* [+ React] popover */}
      {canReact && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 ${
              showPicker
                ? 'bg-base-300 text-base-content/70'
                : 'bg-base-200 text-base-content/40 hover:text-base-content/60 hover:bg-base-300'
            }`}
          >
            +
          </button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 bg-base-200 rounded-2xl shadow-lg border border-base-300 flex gap-1 z-50"
              >
                {REACTION_TYPES.map(rt => {
                  const isUserReaction = summary.userReaction === rt.key;
                  return (
                    <button
                      key={rt.key}
                      onClick={() => {
                        onToggleReaction(rt.key);
                        setShowPicker(false);
                      }}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all active:scale-90 ${
                        isUserReaction
                          ? 'bg-primary/15 ring-1 ring-primary/30'
                          : 'hover:bg-base-300 active:bg-base-300'
                      }`}
                      title={rt.label}
                    >
                      {rt.emoji}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
